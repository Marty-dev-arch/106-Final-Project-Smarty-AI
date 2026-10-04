import { GEMINI_CONFIG } from '../config/gemini';
import { Quiz, Question, Difficulty, QuestionType } from '../types/quiz';
import { storageService } from './storageService';
import { SlideBlock } from '../utils/documentExtractor';

interface GenerateQuizParams {
  topicOrDocumentText: string;
  slides?: SlideBlock[];
  count: number;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  title?: string;
  timeLimitMinutes?: number;
  sourceDocName?: string;  // original filename
  sourceDocUrl?: string;   // Cloudinary URL
}

const isRealApiKey = (key?: string): boolean => {
  if (!key) return false;
  const trimmed = key.trim();
  return (
    trimmed.length >= 15 &&
    !trimmed.includes('your_gemini_api_key')
  );
};

/** Real Gemini API model names — ordered by speed & availability */
const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
];

function deriveQuizTitle(text: string, slides?: SlideBlock[]): string {
  if (slides && slides.length > 0) {
    const firstTitle = slides[0].title?.trim();
    if (firstTitle && firstTitle.length > 3 && firstTitle.length < 80) {
      return firstTitle.replace(/^#+\s*/, '');
    }
  }
  const firstLine = text.trim().split('\n')[0]?.trim();
  if (firstLine && firstLine.length > 3 && firstLine.length < 70) {
    return firstLine.replace(/^#+\s*/, '');
  }
  return 'Study Quiz';
}

// Category is determined by Gemini AI based on actual document content.

function validateQuestions(rawQuestions: any[], fallbackCategory: string): Question[] {
  const cleanQuestions: Question[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const q = rawQuestions[i];
    if (!q || typeof q.prompt !== 'string' || q.prompt.trim().length < 5) continue;

    const type: QuestionType = q.type === 'true_false' ? 'true_false' : q.type === 'enumeration' ? 'enumeration' : 'multiple_choice';

    let options: string[] = [];
    if (Array.isArray(q.options) && q.options.length > 0) {
      options = q.options.map((o: any) => String(o || '').trim()).filter((o: string) => o.length > 0);
    }

    if (type === 'true_false') {
      options = ['True', 'False'];
    }

    if (type !== 'enumeration' && options.length < 2) continue;

    let correctIndexOrString: string | number = 0;
    if (type === 'enumeration') {
      correctIndexOrString = String(q.correctAnswer || '').trim();
      if (!correctIndexOrString) continue;
    } else {
      let correctIndex = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
      if (correctIndex < 0 || correctIndex >= options.length) {
        correctIndex = 0;
      }
      correctIndexOrString = correctIndex;
    }

    cleanQuestions.push({
      id: `q_gemini_${Date.now()}_${i + 1}`,
      type: type,
      prompt: q.prompt.trim(),
      options,
      correctAnswer: correctIndexOrString,
      explanation: typeof q.explanation === 'string' ? q.explanation.trim() : undefined,
      category: typeof q.category === 'string' && q.category.trim() ? q.category.trim() : fallbackCategory,
    });
  }

  return cleanQuestions;
}

/** Build the prompt for Gemini AI */
function buildQuizPrompt(
  content: string,
  count: number,
  difficulty: Difficulty,
  questionTypes: QuestionType[],
  quizTitle: string
): string {
  const contentExcerpt = content.slice(0, 6000);

  const difficultyInstructions = {
    easy: 'EASY MODE: Focus on direct facts, key terms, definitions, and basic recall from the text. Distractors (wrong choices) should be simple and easy to eliminate.',
    medium: 'MEDIUM MODE: Focus on conceptual understanding, cause-and-effect, and standard application of rules/formulas. Distractors should represent plausible common missteps.',
    hard: 'HARD MODE: Focus on multi-step problem solving, critical analysis, edge cases, and synthesis of multiple concepts. Distractors must be subtle, highly plausible, and test deep mastery.',
  }[difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'] || 'Focus on balanced conceptual understanding.';

  return `You are a high-level academic professor and quiz creator. Generate EXACTLY ${count} comprehensive, accurate, and engaging quiz questions based strictly on the provided material.

MATERIAL / TOPIC:
"""
${contentExcerpt}
"""

QUIZ CONFIGURATION:
- Title: ${quizTitle}
- Number of Questions: ${count}
- Target Difficulty: ${difficulty.toUpperCase()}
- Difficulty Baseline: ${difficultyInstructions}
- Allowed Question Types: ${questionTypes.join(', ')}

REQUIREMENTS:
1. Every question prompt must be a complete, well-formed question matching the requested Target Difficulty.
2. For multiple_choice questions: provide exactly 4 distinct options.
3. For true_false questions: options MUST be ["True", "False"].
4. For enumeration questions (fill-in-the-blanks): leave options as an empty array [] and set correctAnswer to the exact string answer.
5. correctAnswer must be the 0-based index of the correct option (0, 1, 2, or 3) for multiple_choice/true_false, OR the exact string answer for enumeration.
6. Provide a clear 1-2 sentence explanation explaining why the correct answer is right.
7. Return ONLY a valid JSON object matching this schema (no markdown fences, no extra text):

{
  "title": "${quizTitle}",
  "category": "string",
  "description": "string",
  "questions": [
    {
      "type": "multiple_choice",
      "prompt": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation here.",
      "category": "string"
    }
  ]
}`;
}

/** Try models in order; return the first successful Response */
async function fetchGemini(
  apiKey: string,
  body: object,
  totalTimeoutMs = 45000
): Promise<Response | null> {
  const overallController = new AbortController();
  const overallTimer = setTimeout(() => overallController.abort(), totalTimeoutMs);

  for (const model of GEMINI_MODELS) {
    if (overallController.signal.aborted) break;

    const modelController = new AbortController();
    const modelTimer = setTimeout(() => modelController.abort(), 25000);

    const url = `${GEMINI_CONFIG.endpoint}/${model}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: modelController.signal,
      });
      clearTimeout(modelTimer);
      console.log(`[fetchGemini] ${model} → ${res.status}`);
      if (res.ok) {
        clearTimeout(overallTimer);
        return res;
      }
    } catch {
      clearTimeout(modelTimer);
      // Try next model
    }
  }

  clearTimeout(overallTimer);
  return null;
}


export const geminiService = {
  async generateQuiz(params: GenerateQuizParams): Promise<Quiz> {
    const { topicOrDocumentText, slides, count, difficulty, questionTypes, title, sourceDocName, sourceDocUrl } = params;
    const quizTitle = title || deriveQuizTitle(topicOrDocumentText, slides);

    // ── Build content from slides (actual per-slide text) or raw text ─────────
    let content = topicOrDocumentText.trim();
    if (slides && slides.length > 0) {
      const slideText = slides
        .map((s) => `[Slide ${s.slideIndex}${s.title ? `: ${s.title}` : ''}]\n${s.lines.join('\n')}`)
        .join('\n\n');
      if (slideText.trim().length > 0) {
        content = slideText;
      }
    }

    // ── Call Gemini AI with the real document content ─────────────────────────
    const apiKey = await storageService.getGeminiApiKey();
    console.log(`[geminiService] Sending ${content.length} chars to Gemini | title: "${quizTitle}" | preview: "${content.slice(0, 200)}"`);
    if (isRealApiKey(apiKey) && content.length > 5) {
      try {
        const prompt = buildQuizPrompt(content, count, difficulty, questionTypes, quizTitle);
        const body = {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        };

        const response = await fetchGemini(apiKey!, body, 45000);

        if (response && response.ok) {
          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (rawText) {
            let parsed: any = null;
            try {
              const clean = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
              parsed = JSON.parse(clean);
            } catch {
              // JSON parse failed — fall through to fallback
            }

            if (parsed?.questions && Array.isArray(parsed.questions)) {
              const validated = validateQuestions(parsed.questions, parsed.category || 'General Knowledge');
              if (validated.length > 0) {
                return {
                  id: 'quiz_' + Date.now(),
                  title: parsed.title || quizTitle,
                  description: parsed.description || `AI-generated quiz on ${quizTitle} (${difficulty})`,
                  category: parsed.category || 'General Knowledge',
                  difficulty,
                  questionTypes,
                  questionsCount: validated.length,
                  questions: validated,
                  createdAt: new Date().toISOString(),
                  timesTaken: 0,
                  timeLimitMinutes: params.timeLimitMinutes || 5,
                  sourceDocName: sourceDocName,
                  sourceDocUrl: sourceDocUrl,
                };
              }
            }
          }
        }
        const hasDocumentContent = (slides && slides.length > 0) || topicOrDocumentText.trim().length > 100;

        // If we got back null (all models returned non-OK), that's still a failure
        if (!response && hasDocumentContent) {
          throw new Error('Gemini AI is currently unavailable (503). Please try again in a moment.');
        }

      } catch (err) {
        console.warn('[geminiService] Gemini call failed:', err);
        const hasDocumentContent = (slides && slides.length > 0) || topicOrDocumentText.trim().length > 100;
        if (hasDocumentContent) {
          throw err; // surface the real error to the UI
        }
      }
    }

    // Fallback only for bare topic-only quizzes (no file content)
    return geminiService.generateSmartFallback(params);
  },

  generateSmartFallback(params: GenerateQuizParams): Quiz {
    const { topicOrDocumentText, count, difficulty, questionTypes, title } = params;
    const safeTitle = title || (topicOrDocumentText ? topicOrDocumentText.slice(0, 32) : 'General Knowledge Quiz');
    // ⚠️ Only match on the title — NOT the full document text — to prevent
    // Calculus/Physics slides from matching Biology keywords inside the content.
    const lowerTopic = safeTitle.toLowerCase();

    let samplePool: Question[] = [];
    let categoryName = 'General Knowledge';

    if (/fiber|optic|telecom|light|laser|wavelength|attenuation|single-mode|multi-mode|refraction/i.test(lowerTopic)) {
      categoryName = 'Fiber Optic Communication';
      samplePool = [
        {
          id: 'q_fiber_1',
          type: 'multiple_choice',
          prompt: `What optical physics phenomenon keeps light signals confined inside the core of a fiber optic cable?`,
          options: ['Total Internal Reflection', 'Specular Refraction', 'Rayleigh Scattering', 'Chromatic Dispersion'],
          correctAnswer: 0,
          explanation: 'Total Internal Reflection occurs when light strikes the core-cladding boundary at an angle greater than the critical angle, trapping light inside the core.',
          category: categoryName,
        },
        {
          id: 'q_fiber_2',
          type: 'multiple_choice',
          prompt: `Which type of optical fiber has a smaller core diameter (~8.3 to 9 µm) designed for long-distance, high-bandwidth transmission?`,
          options: ['Single-Mode Fiber (SMF)', 'Multi-Mode Step-Index Fiber (MMF)', 'Plastic Optical Fiber (POF)', 'Graded-Index Multi-Mode Fiber'],
          correctAnswer: 0,
          explanation: 'Single-Mode Fiber (SMF) has a narrow core (~9µm) allowing only one ray mode to propagate, eliminating modal dispersion over vast distances.',
          category: categoryName,
        },
        {
          id: 'q_fiber_3',
          type: 'multiple_choice',
          prompt: `In optical fiber communication, what is the metric evaluating signal power loss over distance expressed in decibels per kilometer (dB/km)?`,
          options: ['Attenuation', 'Modal Dispersion', 'Splice insertion loss', 'Refractive Index Delta'],
          correctAnswer: 0,
          explanation: 'Attenuation quantifies light energy power loss per kilometer of fiber cable due to absorption and scattering.',
          category: categoryName,
        },
        {
          id: 'q_fiber_4',
          type: 'multiple_choice',
          prompt: `Which standard infrared wavelengths in nanometers (nm) are primarily used for long-haul optical communication due to minimal attenuation windows?`,
          options: ['1310 nm and 1550 nm', '400 nm and 700 nm', '850 nm and 900 nm', '2100 nm and 2500 nm'],
          correctAnswer: 0,
          explanation: '1310 nm features near-zero chromatic dispersion, while 1550 nm achieves the absolute lowest optical loss (~0.2 dB/km) in silica glass fibers.',
          category: categoryName,
        },
        {
          id: 'q_fiber_5',
          type: 'true_false',
          prompt: `For light guiding to occur in fiber optics, the refractive index of the core (n1) must be strictly greater than the refractive index of the cladding (n2).`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'The core must have a higher refractive index (n1 > n2) than the surrounding cladding to enable Total Internal Reflection.',
          category: categoryName,
        },
        {
          id: 'q_fiber_6',
          type: 'multiple_choice',
          prompt: `Which semiconductor component is used at the transmitter end of high-speed long-distance fiber optic links?`,
          options: ['Laser Diode (LD)', 'Standard Incandescent Bulb', 'Photodiode Receiver', 'Schottky Diode'],
          correctAnswer: 0,
          explanation: 'Laser Diodes emit coherent, monochromatic light with high power efficiency and ultra-fast modulation capabilities suitable for gigabit networks.',
          category: categoryName,
        },
        {
          id: 'q_fiber_7',
          type: 'true_false',
          prompt: `Wavelength Division Multiplexing (WDM) allows multiple optical signals at distinct wavelengths to travel simultaneously over a single optical fiber strand.`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'WDM multiplexes several light carrier signals onto a single optical fiber using different laser wavelengths, multiplying network capacity.',
          category: categoryName,
        },
        {
          id: 'q_fiber_8',
          type: 'multiple_choice',
          prompt: `What component at the receiving terminal converts incoming optical light photons into an electrical current?`,
          options: ['Photodetector (PIN / APD)', 'Optical Isolator', 'Erbium-Doped Fiber Amplifier (EDFA)', 'Laser Transceiver'],
          correctAnswer: 0,
          explanation: 'Photodetectors (such as PIN or Avalanche Photodiodes) absorb optical photons and generate corresponding electrical output pulses.',
          category: categoryName,
        },
      ];
    } else if (/cisco|network|ccna|ip|router|tcp|udp|packet|vlan|subnet|switch|ethernet/i.test(lowerTopic)) {
      categoryName = 'Cisco & Networking';
      samplePool = [
        {
          id: 'q_cisco_1',
          type: 'multiple_choice',
          prompt: `Which layer of the OSI reference model is responsible for logical IP addressing and packet routing across subnets?`,
          options: ['Network Layer (Layer 3)', 'Data Link Layer (Layer 2)', 'Transport Layer (Layer 4)', 'Session Layer (Layer 5)'],
          correctAnswer: 0,
          explanation: 'The Network Layer (Layer 3) handles IP addressing, packet encapsulation, and path selection routing between distinct subnets.',
          category: categoryName,
        },
        {
          id: 'q_cisco_2',
          type: 'multiple_choice',
          prompt: `What is the primary operational difference between TCP (Transmission Control Protocol) and UDP (User Datagram Protocol)?`,
          options: [
            'TCP is connection-oriented with error checking; UDP is connectionless and low-overhead',
            'UDP guarantees packet delivery sequencing, whereas TCP drops unacknowledged frames',
            'TCP operates at Layer 2, while UDP operates at Layer 7',
            'UDP requires a 3-way handshake prior to data transmission',
          ],
          correctAnswer: 0,
          explanation: 'TCP establishes reliable, ordered, and error-checked streams via a 3-way handshake. UDP transmits connectionless datagrams with minimal latency.',
          category: categoryName,
        },
        {
          id: 'q_cisco_3',
          type: 'multiple_choice',
          prompt: `In IPv4 networking, how many usable host IP addresses are available in a standard /24 CIDR subnet mask (255.255.255.0)?`,
          options: ['254 usable host addresses', '256 usable host addresses', '128 usable host addresses', '512 usable host addresses'],
          correctAnswer: 0,
          explanation: 'A /24 subnet has 256 total IP addresses. Subtracting 1 for Network ID and 1 for Broadcast address yields 254 usable host IPs.',
          category: categoryName,
        },
        {
          id: 'q_cisco_4',
          type: 'true_false',
          prompt: `Layer 2 Ethernet switches forward frames based on destination MAC address tables built dynamically via source MAC learning.`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'Switches examine incoming frame source MAC addresses to populate CAM tables, and forward outgoing frames directly to destination ports.',
          category: categoryName,
        },
        {
          id: 'q_cisco_5',
          type: 'multiple_choice',
          prompt: `Which network protocol automatically assigns IP addresses, subnet masks, and default gateways to client host endpoints?`,
          options: ['DHCP', 'DNS', 'ICMP', 'SNMP'],
          correctAnswer: 0,
          explanation: 'Dynamic Host Configuration Protocol (DHCP) automates IP assignment and client network stack provisioning.',
          category: categoryName,
        },
        {
          id: 'q_cisco_6',
          type: 'true_false',
          prompt: `A VLAN (Virtual Local Area Network) splits a physical switch into distinct broadcast domains without requiring Layer 3 inter-VLAN routing for same-VLAN hosts.`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'VLANs segment broadcast domains at Layer 2; devices in the same VLAN communicate directly without routing.',
          category: categoryName,
        },
        {
          id: 'q_cisco_7',
          type: 'multiple_choice',
          prompt: `Which Cisco IOS privilege command displays the running configuration stored in volatile RAM?`,
          options: ['show running-config', 'show startup-config', 'show ip interface brief', 'show mac address-table'],
          correctAnswer: 0,
          explanation: '`show running-config` inspects active RAM parameters, whereas `show startup-config` reads non-volatile NVRAM configurations.',
          category: categoryName,
        },
        {
          id: 'q_cisco_8',
          type: 'multiple_choice',
          prompt: `What protocol uses broadcast requests to resolve a known target IP address into its physical hardware MAC address?`,
          options: ['ARP (Address Resolution Protocol)', 'RARP', 'DNS', 'NAT'],
          correctAnswer: 0,
          explanation: 'ARP broadcasts queries across the Layer 2 domain to map target IPv4 addresses to physical network interface MAC addresses.',
          category: categoryName,
        },
        {
          id: 'q_cisco_9',
          type: 'true_false',
          prompt: `OSPF (Open Shortest Path First) is a link-state routing protocol that uses bandwidth cost as its metric.`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'OSPF calculates link cost derived from interface reference bandwidth, building a complete topological map of the area.',
          category: categoryName,
        },
        {
          id: 'q_cisco_10',
          type: 'multiple_choice',
          prompt: `Which port is used by default for secure SSH management connections to routers and switches?`,
          options: ['Port 22', 'Port 23', 'Port 80', 'Port 443'],
          correctAnswer: 0,
          explanation: 'TCP Port 22 is assigned for encrypted Secure Shell (SSH) sessions, replacing unencrypted Telnet on Port 23.',
          category: categoryName,
        },
      ];
    } else if (/code|program|javascript|react|python|html|css|sql|git|developer|software/i.test(lowerTopic)) {
      categoryName = 'Software Engineering';
      samplePool = [
        {
          id: 'q_dev_1',
          type: 'multiple_choice',
          prompt: `In JavaScript asynchronous runtime execution, which component handles promises and microtask callbacks?`,
          options: ['Microtask Queue', 'Task (Macrotask) Queue', 'Call Stack directly', 'Web Worker Thread Pool'],
          correctAnswer: 0,
          explanation: 'Promises and `queueMicrotask` callbacks are pushed to the Microtask Queue, which executes completely before the next macrotask event loop cycle.',
          category: categoryName,
        },
        {
          id: 'q_dev_2',
          type: 'multiple_choice',
          prompt: `What is the worst-case time complexity of searching an item in a balanced Binary Search Tree (BST)?`,
          options: ['O(log n)', 'O(n)', 'O(1)', 'O(n log n)'],
          correctAnswer: 0,
          explanation: 'In a balanced BST, each comparison reduces the search space by half, resulting in logarithmic time complexity O(log n).',
          category: categoryName,
        },
        {
          id: 'q_dev_3',
          type: 'true_false',
          prompt: `In React component development, props are immutable read-only values passed down from parent components.`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'Props are strictly read-only within the child component. Any state mutation must occur within the defining parent state owner.',
          category: categoryName,
        },
        {
          id: 'q_dev_4',
          type: 'multiple_choice',
          prompt: `Which HTTP request method is designated as idempotent for updating existing resources or creating them if non-existent?`,
          options: ['PUT', 'POST', 'PATCH', 'DELETE'],
          correctAnswer: 0,
          explanation: 'HTTP PUT is idempotent; sending identical requests multiple times yields the exact same server state as a single invocation.',
          category: categoryName,
        },
        {
          id: 'q_dev_5',
          type: 'multiple_choice',
          prompt: `In SQL relational databases, which keyword constraint ensures each row in a table is uniquely identified?`,
          options: ['PRIMARY KEY', 'FOREIGN KEY', 'CHECK', 'UNIQUE INDEX'],
          correctAnswer: 0,
          explanation: 'PRIMARY KEY enforces both uniqueness and non-null constraints, uniquely indexing every row in a database table.',
          category: categoryName,
        },
      ];
    } else if (/bio|cell|organ|gene|dna|med|health|body|plant/i.test(lowerTopic)) {
      categoryName = 'Biology & Life Sciences';
      samplePool = [
        {
          id: 'q_bio_1',
          type: 'multiple_choice',
          prompt: `In eukaryotic cellular respiration, where does the Krebs (Citric Acid) Cycle take place?`,
          options: ['Mitochondrial Matrix', 'Cytoplasm', 'Inner Membrane Space', 'Stroma'],
          correctAnswer: 0,
          explanation: 'The Krebs Cycle occurs in the fluid mitochondrial matrix, producing NADH, FADH2, and ATP.',
          category: categoryName,
        },
        {
          id: 'q_bio_2',
          type: 'true_false',
          prompt: `Active transport across biological cell membranes requires ATP metabolic energy to move solutes against concentration gradients.`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'Active transport moves molecules against their electrochemical gradient, requiring direct ATP hydrolysis or ion coupling.',
          category: categoryName,
        },
        {
          id: 'q_bio_3',
          type: 'multiple_choice',
          prompt: `Which macromolecule is primarily responsible for catalyzing metabolic biochemical reactions in living organisms?`,
          options: ['Enzymatic Proteins', 'Phospholipids', 'Nucleic Acids', 'Polysaccharides'],
          correctAnswer: 0,
          explanation: 'Enzymes are specialized protein catalysts that decrease activation energy for biological reactions.',
          category: categoryName,
        },
        {
          id: 'q_bio_4',
          type: 'multiple_choice',
          prompt: `What cellular organelle is responsible for translating mRNA transcripts into functional polypeptide chains?`,
          options: ['Ribosome', 'Golgi Apparatus', 'Lysosome', 'Peroxisome'],
          correctAnswer: 0,
          explanation: 'Ribosomes decode genetic instructions carried by mRNA to synthesize amino acid chains during translation.',
          category: categoryName,
        },
        {
          id: 'q_bio_5',
          type: 'true_false',
          prompt: `In eukaryotic cells, transcription occurs inside the nucleus before mature mRNA is exported to the cytoplasm.`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'RNA Polymerase transcribes DNA into pre-mRNA in the nucleus, where it undergoes splicing and capping prior to cytoplasmic export.',
          category: categoryName,
        },
      ];
    } else {
      categoryName = 'General Knowledge';
      samplePool = [
        {
          id: 'q_gen_1',
          type: 'multiple_choice',
          prompt: `In the study of ${safeTitle}, what fundamental principle governs core analytical reasoning?`,
          options: ['Systematic empirical evaluation', 'Arbitrary assumption', 'Static structural inertia', 'Random sample variance'],
          correctAnswer: 0,
          explanation: `Effective mastery of ${safeTitle} relies on systematic analysis, pattern recognition, and empirical evaluation.`,
          category: safeTitle,
        },
        {
          id: 'q_gen_2',
          type: 'true_false',
          prompt: `Consistent active recall and spaced repetition significantly increase long-term memory retention for ${safeTitle}.`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'Cognitive science demonstrates that active retrieval practice combined with spaced intervals maximizes knowledge retention.',
          category: safeTitle,
        },
        {
          id: 'q_gen_3',
          type: 'multiple_choice',
          prompt: `Which study strategy best strengthens conceptual synthesis when mastering ${safeTitle}?`,
          options: [
            'Breaking concepts into interactive quiz questions and flashcards',
            'Passive re-reading of text without testing',
            'Cramming right before assessment without breaks',
            'Memorizing terminology without underlying context',
          ],
          correctAnswer: 0,
          explanation: 'Self-testing and concept breakdown encourage deep processing, connecting new information to existing mental frameworks.',
          category: safeTitle,
        },
        {
          id: 'q_gen_4',
          type: 'multiple_choice',
          prompt: `When analyzing key components in ${safeTitle}, what metric evaluates diagnostic mastery?`,
          options: ['Accuracy and speed of correct retrieval', 'Total page count read', 'Font formatting size', 'Number of highlights'],
          correctAnswer: 0,
          explanation: 'Diagnostic mastery is measured by accuracy, consistency, and prompt recall of core principles.',
          category: safeTitle,
        },
        {
          id: 'q_gen_5',
          type: 'true_false',
          prompt: `Reviewing incorrect answers in a dedicated mistake bank prevents repeating misconceptions.`,
          options: ['True', 'False'],
          correctAnswer: 0,
          explanation: 'Targeting errors directly weakens false assumptions and solidifies correct mental models.',
          category: safeTitle,
        },
      ];
    }

    // Expand pool up to count requested
    const finalQuestions: Question[] = [];
    for (let i = 0; i < count; i++) {
      const template = samplePool[i % samplePool.length];
      finalQuestions.push({
        ...template,
        id: `q_smart_${Date.now()}_${i + 1}`,
      });
    }

    return {
      id: 'quiz_' + Date.now(),
      title: safeTitle,
      description: `Generated with Smarty AI Engine (${difficulty.toUpperCase()})`,
      category: categoryName,
      difficulty,
      questionTypes,
      questionsCount: finalQuestions.length,
      questions: finalQuestions,
      createdAt: new Date().toISOString(),
      timesTaken: 0,
      timeLimitMinutes: params.timeLimitMinutes || 5,
    };
  },
};
