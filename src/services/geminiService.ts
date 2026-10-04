import { Quiz, Question, Difficulty, QuestionType } from '../types/quiz';
import { storageService } from './storageService';
import { SlideBlock } from '../utils/documentExtractor';
import { generateQuizWithGemini } from './aiQuizGenerator';

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const normKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

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
  pdfBase64?: string;      // Base64-encoded PDF for direct multimodal AI processing
}

const isRealApiKey = (key?: string): boolean => {
  if (!key) return false;
  const trimmed = key.trim();
  return (
    trimmed.length >= 20 &&
    !trimmed.includes('your_gemini_api_key') &&
    !trimmed.includes('your_api_key') &&
    !trimmed.includes('placeholder')
  );
};


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



export const geminiService = {
  async generateQuiz(params: GenerateQuizParams): Promise<Quiz> {
    const { topicOrDocumentText, slides, count, difficulty, questionTypes, title, sourceDocName, sourceDocUrl, pdfBase64 } = params;
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

    const hasDocumentContent = Boolean(pdfBase64) || (slides && slides.length > 0) || content.length > 40;

    // ── Call Gemini AI with the real document content if key is valid ─────────
    const apiKey = await storageService.getGeminiApiKey();
    console.log(`[geminiService] Preparing quiz for "${quizTitle}" | Has real key: ${isRealApiKey(apiKey)} | Content length: ${content.length} | Has PDF Base64: ${Boolean(pdfBase64)}`);

    if (isRealApiKey(apiKey) && (content.length > 5 || Boolean(pdfBase64))) {
      try {
        const ai = await generateQuizWithGemini({
          apiKey: apiKey!,
          content: content.length > 5 ? content : `Document: ${quizTitle}`,
          count,
          difficulty,
          questionTypes,
          title: quizTitle,
          pdfBase64,
        });
        if (ai && ai.questions.length > 0) {
          return {
            id: 'quiz_' + Date.now(),
            title: title || ai.title || quizTitle,
            description: ai.description || `AI-generated quiz on ${quizTitle} (${difficulty})`,
            category: ai.category || 'General Knowledge',
            difficulty,
            questionTypes,
            questionsCount: ai.questions.length,
            questions: ai.questions,
            createdAt: new Date().toISOString(),
            timesTaken: 0,
            timeLimitMinutes: params.timeLimitMinutes || 5,
            sourceDocName,
            sourceDocUrl,
          };
        }
        console.warn('[geminiService] Gemini returned no usable questions — using local fallback.');
      } catch (err) {
        console.warn('[geminiService] Gemini call failed, falling back to local quiz generator:', err);
      }
    } else {
      console.warn('[geminiService] No valid Gemini API key (EXPO_PUBLIC_GEMINI_API_KEY) — using local fallback.');
    }

    // ── Resilient Fallback: If document content exists, extract from document; otherwise smart topic pool
    if (hasDocumentContent) {
      console.log(`[geminiService] Generating quiz directly from document content for "${quizTitle}"`);
      return geminiService.generateDocumentFallback(params);
    }

    return geminiService.generateSmartFallback(params);
  },

  generateDocumentFallback(params: GenerateQuizParams): Quiz {
    const { topicOrDocumentText, slides, count, difficulty, questionTypes, title, sourceDocName, sourceDocUrl } = params;
    const quizTitle = title || deriveQuizTitle(topicOrDocumentText, slides);

    // 1. Collect meaningful, de-duplicated sentences (skip headings & questions)
    const rawLines: string[] = [];
    if (slides && slides.length > 0) {
      for (const s of slides) rawLines.push(...s.lines);
    } else if (topicOrDocumentText) {
      rawLines.push(...topicOrDocumentText.split(/[\r\n]+|[.!]\s+/));
    }
    const seen = new Set<string>();
    const facts: string[] = [];
    for (const l of rawLines) {
      const t = l.replace(/^[\s•\-*\d.)]+/, '').trim();
      const k = normKey(t);
      if (t.length < 25 || t.length > 300 || t.endsWith('?') || /click to edit|^slide \d/i.test(t)) continue;
      if (t.split(/\s+/).length < 5 || seen.has(k)) continue;
      seen.add(k);
      facts.push(t);
    }

    // 2. Extract "Term: definition" / "Term is definition" pairs
    const defs: { term: string; def: string }[] = [];
    const usedFacts = new Set<string>();
    for (const f of facts) {
      const m = f.match(/^([A-Za-z][\w\s()\-/]{1,40}?)\s*(?::|\s[–—-]\s|\s(?:is|are|refers to|means)\s)\s*(.{12,})$/);
      if (m && m[1].trim().split(/\s+/).length <= 5) {
        defs.push({ term: m[1].trim(), def: m[2].trim().replace(/\.$/, '') });
        usedFacts.add(f);
      }
    }
    const plainFacts = shuffleArr(facts.filter((f) => !usedFacts.has(f)));
    const defPool = shuffleArr(defs);
    const allTerms = defs.map((d) => d.term);

    const category = quizTitle;
    const cleanQuestions: Question[] = [];
    const mkId = () => `q_doc_${Date.now()}_${cleanQuestions.length + 1}`;

    // 3. Build questions — each fact/definition is used at most once
    let guard = 0;
    while (cleanQuestions.length < count && guard++ < count * 4) {
      const qType: QuestionType = questionTypes[cleanQuestions.length % questionTypes.length] || 'multiple_choice';

      if ((qType === 'multiple_choice' || qType === 'enumeration') && defPool.length > 0) {
        const d = defPool.shift()!;
        const wrong = shuffleArr(allTerms.filter((t) => normKey(t) !== normKey(d.term))).slice(0, 3);
        if (qType === 'multiple_choice' && wrong.length === 3) {
          const options = shuffleArr([d.term, ...wrong]);
          cleanQuestions.push({
            id: mkId(), type: 'multiple_choice',
            prompt: `Which term matches this description: "${d.def}"?`,
            options, correctAnswer: options.indexOf(d.term),
            explanation: `${d.term}: ${d.def}.`, category,
          });
        } else {
          cleanQuestions.push({
            id: mkId(), type: 'enumeration',
            prompt: `_____ : ${d.def}.`,
            options: [], correctAnswer: d.term,
            explanation: `${d.term}: ${d.def}.`, category,
          });
        }
        continue;
      }

      // True/False (or any type when no definitions are left)
      if (defPool.length >= 2 && cleanQuestions.length % 2 === 1) {
        // False statement: pair a term with someone else's definition
        const a = defPool.shift()!;
        const b = defPool.shift()!;
        cleanQuestions.push({
          id: mkId(), type: 'true_false',
          prompt: `${a.term} refers to: ${b.def}.`,
          options: ['True', 'False'], correctAnswer: 1,
          explanation: `False. ${a.term}: ${a.def}. The description given belongs to ${b.term}.`, category,
        });
        continue;
      }
      const fact = plainFacts.shift() || (defPool.length ? (() => { const d = defPool.shift()!; return `${d.term} refers to ${d.def}`; })() : undefined);
      if (!fact) break; // material exhausted — better fewer questions than repeats
      cleanQuestions.push({
        id: mkId(), type: 'true_false',
        prompt: `${fact.replace(/\.$/, '')}.`,
        options: ['True', 'False'], correctAnswer: 0,
        explanation: `True — this is stated in the study material.`, category,
      });
    }
    if (cleanQuestions.length === 0) {
      return geminiService.generateSmartFallback(params);
    }

    return {
      id: 'quiz_' + Date.now(),
      title: quizTitle,
      description: `Generated from document content (${difficulty.toUpperCase()})`,
      category,
      difficulty,
      questionTypes,
      questionsCount: cleanQuestions.length,
      questions: cleanQuestions,
      createdAt: new Date().toISOString(),
      timesTaken: 0,
      timeLimitMinutes: params.timeLimitMinutes || 5,
      sourceDocName,
      sourceDocUrl,
    };
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

    // Use each pool question at most once (no repeats), with shuffled order and options
    const finalQuestions: Question[] = shuffleArr(samplePool)
      .slice(0, Math.min(count, samplePool.length))
      .map((template, i) => {
        if (template.type === 'multiple_choice' && typeof template.correctAnswer === 'number') {
          const correct = template.options[template.correctAnswer];
          const options = shuffleArr(template.options);
          return { ...template, options, correctAnswer: options.indexOf(correct), id: `q_smart_${Date.now()}_${i + 1}` };
        }
        return { ...template, id: `q_smart_${Date.now()}_${i + 1}` };
      });

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
