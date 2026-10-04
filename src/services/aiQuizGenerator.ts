/**
 * AI Quiz Generator — calls the Gemini API with structured JSON output,
 * validates every question, removes duplicates, and tops up missing questions.
 *
 * Why this exists:
 *  - Old model names (gemini-1.5/2.0) are retired → every call 404'd and the app
 *    silently fell back to a template generator that produced nonsense
 *    ("Which of the following is directly stated...") and repeated questions.
 *  - Free-form JSON prompts let the model repeat concepts/answers.
 */
import { GEMINI_CONFIG } from '../config/gemini';
import { Question, QuestionType, Difficulty } from '../types/quiz';

// ─── Models ───────────────────────────────────────────────────────────────────

interface ModelSpec {
  name: string;
  supportsThinkingLevel: boolean;
}

/** Current active models: gemini-3.5-flash-lite (fastest, high throughput) & gemini-3.8-flash. */
const MODELS: ModelSpec[] = [
  { name: 'gemini-3.5-flash-lite', supportsThinkingLevel: false },
  { name: 'gemini-3.8-flash', supportsThinkingLevel: false },
];

const PER_MODEL_TIMEOUT_MS = 60000;
const MAX_CONTENT_CHARS = 30000; // Flash models have 1M-token context; 30k chars ≈ 8k tokens

// ─── Structured output schema ────────────────────────────────────────────────

function buildResponseSchema(allowedTypes: QuestionType[]) {
  return {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short, specific quiz title based on the material.' },
      category: { type: 'string', description: 'Academic subject, e.g. "Object-Oriented Programming".' },
      description: { type: 'string', description: 'One sentence describing what the quiz covers.' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            concept: {
              type: 'string',
              description: 'The single distinct concept/fact this question tests (2-6 words). Must be unique across all questions.',
            },
            type: { type: 'string', enum: allowedTypes },
            prompt: { type: 'string', description: 'The full, self-contained question text.' },
            options: {
              type: 'array',
              items: { type: 'string' },
              description: 'multiple_choice: exactly 4 distinct options. true_false: ["True","False"]. enumeration: [].',
            },
            correctIndex: {
              type: 'integer',
              description: 'multiple_choice/true_false: 0-based index of the correct option. enumeration: -1.',
            },
            answerText: {
              type: 'string',
              description: 'The exact correct answer text (for enumeration: the 1-4 word term).',
            },
            explanation: { type: 'string', description: '1-2 sentences explaining why the answer is correct.' },
          },
          required: ['concept', 'type', 'prompt', 'options', 'correctIndex', 'answerText', 'explanation'],
        },
      },
    },
    required: ['title', 'category', 'description', 'questions'],
  };
}

// ─── Prompt ──────────────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are an expert university instructor who writes clear, fair, high-quality exam questions from study material (lecture slides, PDFs, notes).
You test UNDERSTANDING of the subject matter — never the structure of the document itself.`;

const DIFFICULTY_GUIDE: Record<Difficulty, string> = {
  easy: 'Recall of key definitions, terms and facts. Wrong options are clearly wrong to someone who studied.',
  medium: 'Conceptual understanding: why/how something works, comparing concepts, applying a rule to a simple example. Wrong options are plausible misconceptions.',
  hard: 'Application and analysis: short scenarios, code/example interpretation, edge cases, combining concepts. Wrong options are subtle but definitely incorrect.',
};

const TYPE_GUIDE: Record<QuestionType, string> = {
  multiple_choice:
    '"multiple_choice": a direct question with exactly 4 options of similar length and style. Exactly ONE option is correct; the other 3 must be definitely wrong (not just "also mentioned in the material").',
  true_false:
    '"true_false": a single clear factual statement (not a question). options = ["True","False"]. Mix true and false statements roughly evenly; false statements must change a key fact so they are unambiguously false.',
  enumeration:
    '"enumeration" (fill in the blank): a sentence with one blank "_____" whose answer is a specific 1-4 word term from the material. options = [], correctIndex = -1, answerText = the term.',
};

function buildPrompt(
  content: string,
  count: number,
  difficulty: Difficulty,
  types: QuestionType[],
  title: string,
  avoid: string[] = []
): string {
  const typeLines = types.map((t) => `- ${TYPE_GUIDE[t]}`).join('\n');
  const avoidBlock = avoid.length
    ? `\nALREADY COVERED — do NOT ask about these concepts again or reuse these answers:\n${avoid.map((a) => `- ${a}`).join('\n')}\n`
    : '';

  return `Create EXACTLY ${count} quiz questions from the study material below.

<material title="${title}">
${content}
</material>

DIFFICULTY: ${difficulty.toUpperCase()} — ${DIFFICULTY_GUIDE[difficulty]}

QUESTION TYPES (distribute roughly evenly across: ${types.join(', ')}):
${typeLines}
${avoidBlock}
PROCESS:
1. First identify ${count} DIFFERENT important concepts spread across the WHOLE material (beginning, middle and end).
2. Write exactly one question per concept. Record it in "concept".

QUALITY RULES:
- Every question must be self-contained and make sense to a student who studied the topic, even without seeing the slides.
- Test the SUBJECT MATTER (e.g. "What does encapsulation protect?"), NEVER the document (forbidden: "Which is stated in the material?", "What does slide 3 say?", "'Why Learn OOP?' refers to ___").
- Never use slide titles, headings, section names, or questions from the material as answers.
- No two questions may test the same concept, have the same correct answer, or be rephrasings of each other.
- The correct answer must be verifiable from the material. You may use general knowledge only to write wrong options.
- Do not use "All of the above" / "None of the above".
- Correct-answer positions in multiple_choice should vary.
- Grammatically correct, concise, unambiguous English.

EXAMPLE (topic: OOP)
Good: "Which OOP principle hides an object's internal data and exposes it only through methods?" → Encapsulation / Inheritance / Polymorphism / Abstraction
Bad: "According to the material, which of the following is directly stated?"  (tests the document, multiple options are true)
Bad enumeration: "'Why Learn OOP?' refers to _____"  (uses a heading)
Good enumeration: "A _____ is a blueprint used to create objects."  → class`;
}

// ─── Networking ──────────────────────────────────────────────────────────────

async function callModel(
  apiKey: string,
  model: ModelSpec,
  prompt: string,
  types: QuestionType[],
  pdfBase64?: string
): Promise<any | null> {
  const generationConfig: Record<string, any> = {
    responseMimeType: 'application/json',
    responseJsonSchema: buildResponseSchema(types),
  };
  if (model.supportsThinkingLevel) {
    // A little reasoning noticeably improves question quality without much latency.
    generationConfig.thinkingConfig = { thinkingLevel: 'low' };
  }

  const parts: any[] = [];
  if (pdfBase64 && pdfBase64.length > 50) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBase64,
      },
    });
  }
  parts.push({ text: prompt });

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts }],
    generationConfig,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_CONFIG.endpoint}/${model.name}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    console.log(`[aiQuizGenerator] ${model.name} → ${res.status}`);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[aiQuizGenerator] ${model.name} error: ${errText.slice(0, 300)}`);
      if (res.status === 401 || res.status === 403) throw new Error('INVALID_API_KEY');
      return null;
    }

    const data = await res.json();
    const partsRes: any[] = data?.candidates?.[0]?.content?.parts || [];
    // Skip thought parts; join the actual text output
    const text = partsRes.filter((p) => !p.thought && typeof p.text === 'string').map((p) => p.text).join('');
    if (!text) return null;
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(clean);
  } catch (e: any) {
    if (e?.message === 'INVALID_API_KEY') throw e;
    console.warn(`[aiQuizGenerator] ${model.name} failed:`, e?.message || e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callWithFallback(
  apiKey: string,
  prompt: string,
  types: QuestionType[],
  pdfBase64?: string
): Promise<any | null> {
  for (const model of MODELS) {
    try {
      const parsed = await callModel(apiKey, model, prompt, types, pdfBase64);
      if (parsed?.questions && Array.isArray(parsed.questions)) return parsed;
    } catch (e: any) {
      if (e?.message === 'INVALID_API_KEY') break; // no point trying other models
    }
  }
  return null;
}

// ─── Validation & de-duplication ─────────────────────────────────────────────

const normalize = (s: string) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

const STOP = new Set(['the', 'a', 'an', 'of', 'in', 'is', 'are', 'to', 'and', 'or', 'which', 'what', 'following', 'that', 'for', 'on', 'by', 'with', 'it', 'this', 'be']);

function tokenSet(s: string): Set<string> {
  return new Set(normalize(s).split(' ').filter((w) => w.length > 1 && !STOP.has(w)));
}

function similarity(a: string, b: string): number {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((w) => { if (B.has(w)) inter++; });
  return inter / (A.size + B.size - inter);
}

/** Questions that test the document instead of the subject. */
const META_QUESTION = /(directly stated|stated in the (study )?material|according to the (study )?(material|document|slides?|text)|which of the following (is|appears) (mentioned|stated)|refers to _+\s*:?$)/i;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Accepted {
  q: Question;
  concept: string;
  answerKey: string;
}

function toQuestion(raw: any, allowed: QuestionType[], category: string, idx: number): { q: Question; concept: string; answerKey: string } | null {
  if (!raw || typeof raw.prompt !== 'string') return null;
  const prompt = raw.prompt.trim();
  if (prompt.length < 10 || META_QUESTION.test(prompt)) return null;

  const type: QuestionType = allowed.includes(raw.type) ? raw.type : allowed[0];
  const answerText = String(raw.answerText ?? '').trim();
  const explanation = typeof raw.explanation === 'string' ? raw.explanation.trim() : undefined;
  const id = `q_ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
  let q: Question;
  let answerKey = '';

  if (type === 'enumeration') {
    const ans = answerText || String(raw.correctAnswer ?? '').trim();
    if (!ans || ans.split(/\s+/).length > 6) return null;
    q = { id, type, prompt, options: [], correctAnswer: ans, explanation, category };
    answerKey = normalize(ans);
  } else if (type === 'true_false') {
    let idxTF = typeof raw.correctIndex === 'number' ? raw.correctIndex : -1;
    if (/^true$/i.test(answerText)) idxTF = 0;
    else if (/^false$/i.test(answerText)) idxTF = 1;
    if (idxTF !== 0 && idxTF !== 1) return null;
    q = { id, type, prompt, options: ['True', 'False'], correctAnswer: idxTF, explanation, category };
    answerKey = ''; // True/False answers naturally repeat
  } else {
    const opts: string[] = Array.isArray(raw.options)
      ? raw.options.map((o: any) => String(o ?? '').trim()).filter(Boolean)
      : [];
    // Options must be distinct
    const uniq = Array.from(new Map(opts.map((o) => [normalize(o), o])).values());
    if (uniq.length < 4) return null;
    const four = uniq.slice(0, 4);
    if (four.some((o) => /^(all|none) of the above$/i.test(o))) return null;

    // Prefer the answer text to locate the correct option (models sometimes mis-index)
    let ci = four.findIndex((o) => normalize(o) === normalize(answerText));
    if (ci < 0) ci = typeof raw.correctIndex === 'number' ? raw.correctIndex : -1;
    if (ci < 0 || ci >= four.length) return null;

    const correct = four[ci];
    const shuffled = shuffle(four);
    q = { id, type, prompt, options: shuffled, correctAnswer: shuffled.indexOf(correct), explanation, category };
    answerKey = normalize(correct);
  }

  const concept = String(raw.concept || '').trim() || prompt.slice(0, 60);
  return { q, concept, answerKey };
}

function addUnique(accepted: Accepted[], rawQuestions: any[], allowed: QuestionType[], category: string, max: number) {
  for (const raw of rawQuestions) {
    if (accepted.length >= max) break;
    const item = toQuestion(raw, allowed, category, accepted.length + 1);
    if (!item) continue;

    const dup = accepted.some((a) =>
      normalize(a.q.prompt) === normalize(item.q.prompt) ||
      similarity(a.q.prompt, item.q.prompt) >= 0.7 ||
      (item.concept && normalize(a.concept) === normalize(item.concept)) ||
      (item.answerKey && a.answerKey && a.answerKey === item.answerKey)
    );
    if (!dup) accepted.push(item);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface AiQuizResult {
  title: string;
  category: string;
  description: string;
  questions: Question[];
}

export async function generateQuizWithGemini(opts: {
  apiKey: string;
  content: string;
  count: number;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  title: string;
  pdfBase64?: string;
}): Promise<AiQuizResult | null> {
  const { apiKey, count, difficulty, title, pdfBase64 } = opts;
  const types: QuestionType[] = opts.questionTypes.length ? opts.questionTypes : ['multiple_choice'];
  const content = opts.content.slice(0, MAX_CONTENT_CHARS);

  // Ask for a few extra so that de-duplication still leaves enough questions.
  const firstAsk = Math.min(count + 3, Math.ceil(count * 1.3) + 1);
  const first = await callWithFallback(
    apiKey,
    buildPrompt(content, firstAsk, difficulty, types, title),
    types,
    pdfBase64
  );
  if (!first) return null;

  const category = String(first.category || '').trim() || 'General Knowledge';
  const accepted: Accepted[] = [];
  addUnique(accepted, first.questions, types, category, count);

  // Top-up round: request only what's missing, telling the model what to avoid.
  if (accepted.length < count) {
    const missing = count - accepted.length;
    const avoid = accepted.map((a) => `${a.concept}${a.answerKey ? ` (answer: ${a.answerKey})` : ''}`);
    const more = await callWithFallback(
      apiKey,
      buildPrompt(content, missing + 2, difficulty, types, title, avoid),
      types,
      pdfBase64
    );
    if (more?.questions) addUnique(accepted, more.questions, types, category, count);
  }

  if (accepted.length === 0) return null;
  console.log(`[aiQuizGenerator] Accepted ${accepted.length}/${count} unique questions`);

  return {
    title: String(first.title || '').trim() || title,
    category,
    description: String(first.description || '').trim() || `AI-generated quiz on ${title}`,
    questions: accepted.map((a) => a.q),
  };
}
