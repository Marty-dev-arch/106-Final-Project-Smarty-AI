// ─── nlpQuizEngine.ts ─────────────────────────────────────────────────────────
// Lightweight local NLP layer.
// Input  : SlideBlock[] from documentExtractor  OR  flat string fallback
// Output : FactItem[]  (compact structured facts ready to send to Gemini)
//          OR a full Quiz when used in pure-local mode (no Gemini key).

import { Quiz, Question, Difficulty, QuestionType } from '../types/quiz';
import { SlideBlock } from '../utils/documentExtractor';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FactItem {
  concept: string;
  fact: string;
  /** Best candidate for the correct answer */
  answer: string;
  sourceSlide: number;
  factType: 'definition' | 'fact' | 'list' | 'general';
}

export interface NlpQuizParams {
  topicOrDocumentText: string;
  slides?: SlideBlock[];
  count: number;
  difficulty: Difficulty;
  questionTypes: QuestionType[];
  title?: string;
  timeLimitMinutes?: number;
}

// ─── Patterns ─────────────────────────────────────────────────────────────────

// "X is Y" / "X refers to Y" / "X is defined as Y"
const DEF_RE =
  /^([^:\n—–\->]{2,60}?)\s+(?:is defined as|refers to|means|consists of|is called|is known as|is an|is a|is|are)\s+(.{4,200})/i;

// "X: Y" or "X — Y" or "X – Y" or "X - Y" or "X -> Y" or "X → Y"
const LABEL_RE = /^([^:\n—–\->]{2,50})\s*(?::|—|–|\s+-\s+|\s+->\s+|\s+→\s+)\s*(.{4,200})/i;

// Dates / years  e.g. "In 1969, ..."
const DATE_RE = /\b((?:in\s+)?\d{4})\b.{10,120}/i;

// Numeric facts: "X has N Y"
const NUMERIC_RE = /\b(\d[\d,.]*\s*(?:%|km|mb|gb|ms|ghz|hz|volts?|amps?)?)\b/i;

// "X, Y, and Z" list patterns (enumerations)
const LIST_RE = /(?:\b(?:includes?|contains?|consists? of|are|have)\s+)(.+(?:,\s*.+){1,})/i;

// Sentences that are just noise
const NOISE_RE =
  /^(click|agenda|overview|outline|table of contents?|references?|questions?\?|thank you|end of|introduction|conclusion|summary|recap|contents?|slide \d+|\d+\s*slides?|presented by|prepared by|chapter \d+|page \d+|untitled)$/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanLine(s: string): string {
  return s.replace(/^[•\-–—*▪►▸·]+\s*/, '').trim();
}

function isNoise(s: string): boolean {
  const t = s.trim();
  return t.length < 4 || NOISE_RE.test(t);
}

/**
 * Extract proper-noun / capitalized key terms from text.
 * Returns up to 20 unique terms, filtering known stopwords.
 */
function extractKeyTerms(text: string): string[] {
  const STOP = new Set([
    'The', 'This', 'That', 'These', 'Those', 'They', 'With', 'When', 'Where',
    'What', 'Which', 'There', 'Then', 'From', 'Into', 'Over', 'Also', 'Each',
    'More', 'Many', 'Some', 'Such', 'Most', 'Both', 'Have', 'Been', 'Will',
    'Has', 'Had', 'Can', 'Does', 'Did', 'For', 'And', 'Are', 'Its', 'Not',
    'All', 'Any', 'One', 'Two', 'New', 'Old', 'Our', 'Your', 'Their',
    'PowerPoint', 'Presentation', 'Slide', 'Slides', 'Document', 'File',
    'Page', 'Notes', 'Section', 'Figure', 'Table', 'Extracted', 'Key', 'Title',
  ]);
  const words = text.match(/\b[A-Z][a-zA-Z0-9_\-]{2,}\b/g) || [];
  return [...new Set(words)].filter((w) => !STOP.has(w)).slice(0, 20);
}

/** Returns true if a line ends with ? (is phrased as a question) */
function isQuestion(s: string): boolean {
  return s.trim().endsWith('?');
}

/** Returns true if the line is too short/vague to make a meaningful fact */
function isTooVague(s: string): boolean {
  return s.split(' ').length < 4 && !s.includes(':') && !s.includes('—') && !s.includes('–');
}

// ─── Core NLP: SlideBlock → FactItem[] ────────────────────────────────────────

/**
 * Analyse a single slide and produce up to `maxPerSlide` facts.
 */
function analyzeSlide(block: SlideBlock, maxPerSlide = 3): FactItem[] {
  const facts: FactItem[] = [];

  const title = cleanLine(block.title || '');
  const bodyLines = block.lines
    .map(cleanLine)
    .filter((l) => !isNoise(l) && l.length >= 4);

  // ── Case 1: Title is a question → pair with body lines ─────────────────────
  if (isQuestion(title) && bodyLines.length > 0) {
    const conceptRaw = title.replace(/\?$/, '').trim();

    let factLine = '';
    let answerText = '';

    for (const bl of bodyLines) {
      if (isQuestion(bl)) continue;

      const labelM = bl.match(LABEL_RE);
      if (labelM) {
        factLine = bl;
        answerText = labelM[2].trim().replace(/\.$/, '');
        break;
      }
      const defM = bl.match(DEF_RE);
      if (defM) {
        factLine = bl;
        answerText = defM[2].trim().replace(/\.$/, '');
        break;
      }
      if (bl.split(' ').length >= 4) {
        const isM = bl.match(/\b(?:is|are|was|were|means?)\s+(.{4,100})/i);
        factLine = bl;
        answerText = isM
          ? isM[1].split(/[,;.]/)[0].trim()
          : bl.split(/[,;.]/)[0].trim();
        break;
      }
    }

    if (factLine && answerText && answerText.length >= 3) {
      facts.push({
        concept: conceptRaw,
        fact: factLine,
        answer: answerText.slice(0, 100),
        sourceSlide: block.slideIndex,
        factType: 'definition',
      });
    }

    // Also mine remaining body lines for more facts
    for (let i = 0; i < bodyLines.length && facts.length < maxPerSlide; i++) {
      const bl = bodyLines[i];
      if (bl === factLine || isQuestion(bl)) continue;

      const labelM = bl.match(LABEL_RE);
      if (labelM) {
        facts.push({
          concept: labelM[1].trim(),
          fact: bl,
          answer: labelM[2].trim().replace(/\.$/, ''),
          sourceSlide: block.slideIndex,
          factType: 'definition',
        });
        continue;
      }
      const defM = bl.match(DEF_RE);
      if (defM) {
        facts.push({
          concept: defM[1].trim(),
          fact: bl,
          answer: defM[2].trim().replace(/\.$/, ''),
          sourceSlide: block.slideIndex,
          factType: 'definition',
        });
        continue;
      }
      if (!isTooVague(bl) && bl.split(' ').length >= 5) {
        const isM = bl.match(/\b(?:is|are|was|were|means?)\s+(.{4,100})/i);
        const ans = isM
          ? isM[1].split(/[,;.]/)[0].trim()
          : bl.split(/[,;.]/)[0].trim().slice(0, 80);
        if (ans.length >= 3) {
          facts.push({
            concept: conceptRaw,
            fact: bl,
            answer: ans,
            sourceSlide: block.slideIndex,
            factType: 'general',
          });
        }
      }
    }

    return facts;
  }

  // ── Case 2: Normal slide — scan all non-question lines ─────────────────────
  const titleIsConcept = title && !isNoise(title) && !isQuestion(title);
  const allLines = (titleIsConcept ? [title] : []).concat(bodyLines);

  for (let i = 0; i < allLines.length && facts.length < maxPerSlide; i++) {
    const line = allLines[i];

    // Never use a question as a fact
    if (isQuestion(line)) continue;

    // ── Label:Value or Label — Value
    const labelM = line.match(LABEL_RE);
    if (labelM) {
      facts.push({
        concept: labelM[1].trim(),
        fact: line,
        answer: labelM[2].trim().replace(/\.$/, ''),
        sourceSlide: block.slideIndex,
        factType: 'definition',
      });
      continue;
    }

    // ── Definition: "X is Y"
    const defM = line.match(DEF_RE);
    if (defM) {
      facts.push({
        concept: defM[1].trim(),
        fact: line,
        answer: defM[2].trim().replace(/\.$/, ''),
        sourceSlide: block.slideIndex,
        factType: 'definition',
      });
      continue;
    }

    // ── List fact
    const listM = line.match(LIST_RE);
    if (listM && listM[1].includes(',')) {
      const listItems = listM[1]
        .split(/,\s*(?:and\s+)?/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1);
      if (listItems.length >= 2) {
        facts.push({
          concept: titleIsConcept ? title : line.slice(0, 40),
          fact: line,
          answer: listItems[0],
          sourceSlide: block.slideIndex,
          factType: 'list',
        });
        continue;
      }
    }

    // ── Numeric / date fact
    if (DATE_RE.test(line) && line.length >= 15) {
      const numM = line.match(NUMERIC_RE);
      facts.push({
        concept: titleIsConcept ? title : line.slice(0, 40),
        fact: line,
        answer: numM ? numM[1] : line.split(' ').slice(-3).join(' '),
        sourceSlide: block.slideIndex,
        factType: 'fact',
      });
      continue;
    }

    // ── General line
    if (!isTooVague(line) && line.split(' ').length >= 5) {
      const isM = line.match(/\b(?:is|are|was|were|means?)\s+(.{4,100})/i);
      const answer = isM
        ? isM[1].split(/[,;.]/)[0].trim()
        : line.split(/[,;.]/)[0].trim().slice(0, 80);

      if (answer.length >= 3 && !isQuestion(answer)) {
        facts.push({
          concept: titleIsConcept ? title : line.slice(0, 40),
          fact: line,
          answer,
          sourceSlide: block.slideIndex,
          factType: 'general',
        });
      }
    }
  }

  return facts;
}

// ─── Pure-local question builder (no Gemini) ──────────────────────────────────

/** Fallback distractor phrases for definition questions */
const FALLBACK_PHRASE_DISTRACTORS = [
  'Directs data packets between different networks',
  'Translates human-readable domain names to IP addresses',
  'Filters network traffic based on configured security rules',
  'Provides encrypted tunnels for remote communications',
  'Assigns IP addresses dynamically to client nodes',
  'Monitors bandwidth consumption and error rates',
  'Stores cached data copies for rapid retrieval',
  'Manages access authorization and encryption keys',
];

/** Fallback term distractors for concept-name questions */
const FALLBACK_TERM_DISTRACTORS = [
  'Router',
  'Gateway',
  'Firewall',
  'Network Bridge',
  'Access Point',
  'DNS Server',
  'DHCP Server',
  'Load Balancer',
];

/**
 * Build a question from a FactItem.
 * Ensures clean prompts and type-appropriate distractors.
 */
function buildLocalQuestion(
  fact: FactItem,
  qType: QuestionType,
  allKeyTerms: string[],
  index: number,
  quizTitle: string,
  allFacts: FactItem[] = []
): Question {
  const id = `q_nlp_${Date.now()}_${index}`;

  const sourceFact = isQuestion(fact.fact)
    ? `${fact.concept} — ${fact.answer}`
    : fact.fact;

  if (qType === 'true_false') {
    const isTrue = index % 2 === 0;
    let tfStatement = sourceFact;
    let correctAnswer = isTrue ? 0 : 1;

    const safeAnswer =
      fact.answer && !isQuestion(fact.answer) && fact.answer.length >= 2
        ? fact.answer
        : fact.concept;

    if (!isTrue && safeAnswer.length >= 2) {
      const alt =
        allKeyTerms.find(
          (t) =>
            t.toLowerCase() !== safeAnswer.toLowerCase() &&
            t.length >= 3 &&
            !isQuestion(t)
        ) || 'an alternative protocol';
      tfStatement = sourceFact.replace(safeAnswer, alt);
      if (tfStatement === sourceFact) {
        tfStatement = `${fact.concept} does not involve ${alt}.`;
      }
    }

    return {
      id,
      type: 'true_false',
      prompt: `True or False: ${tfStatement}`,
      options: ['True', 'False'],
      correctAnswer,
      explanation: `Source excerpt: "${sourceFact}"`,
      category: quizTitle,
    };
  }

  // ── Multiple choice ───────────────────────────────────────────────────────
  let prompt: string;
  let safeAnswer: string;
  const isMultiWordAnswer = fact.answer.split(' ').length >= 3;

  if (fact.factType === 'definition') {
    // Style A: Ask function/definition of concept
    if (index % 2 === 0 || fact.concept.length > 30) {
      prompt = `Which of the following best describes the role of "${fact.concept}"?`;
      safeAnswer = fact.answer;
    } else {
      // Style B: Ask which term matches description
      prompt = `Which term or concept matches this description: "${fact.answer}"?`;
      safeAnswer = fact.concept;
    }
  } else if (fact.factType === 'list') {
    prompt = `Which of the following is associated with "${fact.concept}"?`;
    safeAnswer = fact.answer;
  } else if (fact.factType === 'fact') {
    prompt = `According to the source material, what detail relates to "${fact.concept}"?`;
    safeAnswer = fact.answer;
  } else {
    // General statement
    prompt = `What does the learning material state regarding "${fact.concept}"?`;
    safeAnswer = fact.answer;
  }

  // ── Pick matching distractors based on whether answer is a phrase or a term ──
  const distractors: string[] = [];
  const isPhrase = safeAnswer.split(' ').length >= 3 || safeAnswer.length > 20;

  if (isPhrase) {
    // Collect phrases from other extracted facts
    for (const f of allFacts) {
      if (distractors.length >= 3) break;
      const ans = f.answer.trim();
      if (
        ans.toLowerCase() !== safeAnswer.toLowerCase() &&
        ans.split(' ').length >= 2 &&
        !distractors.includes(ans) &&
        !isQuestion(ans)
      ) {
        distractors.push(ans);
      }
    }
    // Fallback phrase distractors
    for (const fb of FALLBACK_PHRASE_DISTRACTORS) {
      if (distractors.length >= 3) break;
      if (
        fb.toLowerCase() !== safeAnswer.toLowerCase() &&
        !distractors.includes(fb)
      ) {
        distractors.push(fb);
      }
    }
  } else {
    // Collect term distractors from other facts concepts or key terms
    for (const f of allFacts) {
      if (distractors.length >= 3) break;
      const c = f.concept.trim();
      if (
        c.toLowerCase() !== safeAnswer.toLowerCase() &&
        c.length >= 3 &&
        c.length <= 35 &&
        !distractors.includes(c) &&
        !isQuestion(c)
      ) {
        distractors.push(c);
      }
    }
    for (const t of allKeyTerms) {
      if (distractors.length >= 3) break;
      if (
        t.toLowerCase() !== safeAnswer.toLowerCase() &&
        t.length >= 3 &&
        t !== fact.concept &&
        !distractors.includes(t) &&
        !isQuestion(t)
      ) {
        distractors.push(t);
      }
    }
    for (const d of FALLBACK_TERM_DISTRACTORS) {
      if (distractors.length >= 3) break;
      if (
        d.toLowerCase() !== safeAnswer.toLowerCase() &&
        !distractors.includes(d)
      ) {
        distractors.push(d);
      }
    }
  }

  const rawOptions = [safeAnswer, ...distractors.slice(0, 3)];
  const shuffled = rawOptions
    .map((v) => ({ v, s: Math.random() }))
    .sort((a, b) => a.s - b.s)
    .map((x) => x.v);
  const correctIdx = shuffled.indexOf(safeAnswer);

  return {
    id,
    type: 'multiple_choice',
    prompt,
    options: shuffled,
    correctAnswer: correctIdx >= 0 ? correctIdx : 0,
    explanation: `Source excerpt: "${sourceFact}"`,
    category: quizTitle,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const nlpQuizEngine = {
  /**
   * Extract structured facts from slide blocks (or flat text fallback).
   * Called before Gemini — sends only these facts to the API.
   */
  extractFacts(params: NlpQuizParams): FactItem[] {
    const { slides, topicOrDocumentText, count } = params;

    if (slides && slides.length > 0) {
      // Per-slide NLP — each slide can produce up to 3 facts
      const maxPerSlide = Math.max(2, Math.ceil((count * 1.5) / slides.length));
      const all: FactItem[] = [];
      for (const block of slides) {
        all.push(...analyzeSlide(block, maxPerSlide));
        if (all.length >= count * 2) break; // never over-extract
      }
      return all;
    }

    // Flat-text fallback: split into virtual 10-line blocks
    const lines = topicOrDocumentText
      .split(/\r?\n/)
      .map(cleanLine)
      .filter((l) => !isNoise(l) && l.length >= 5);

    const chunkSize = 10;
    const all: FactItem[] = [];
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunk = lines.slice(i, i + chunkSize);
      const block: SlideBlock = {
        slideIndex: Math.floor(i / chunkSize) + 1,
        title: chunk[0],
        lines: chunk.slice(1),
      };
      all.push(...analyzeSlide(block, 2));
      if (all.length >= count * 2) break;
    }
    return all;
  },

  /**
   * Build a local quiz from facts (used when Gemini is unavailable).
   * Validates each question before adding it.
   */
  generateQuizFromFacts(params: NlpQuizParams, facts: FactItem[]): Quiz {
    const { count, difficulty, questionTypes, title, topicOrDocumentText } = params;

    const quizTitle =
      title?.trim() ||
      this.deriveTitle(topicOrDocumentText, params.slides) ||
      'Document Study Quiz';

    const allKeyTerms = extractKeyTerms(topicOrDocumentText);
    const questions: Question[] = [];

    facts.forEach((fact, idx) => {
      if (questions.length >= count) return;
      const qType = questionTypes[idx % questionTypes.length] || 'multiple_choice';
      const q = buildLocalQuestion(fact, qType, allKeyTerms, idx + 1, quizTitle, facts);
      if (this.validateQuestion(q)) questions.push(q);
    });

    // If we still need more questions, cycle over facts again with different types
    let cycle = 0;
    while (questions.length < count && facts.length > 0) {
      const fact = facts[cycle % facts.length];
      const qType = questionTypes[(questions.length) % questionTypes.length] || 'multiple_choice';
      const q = buildLocalQuestion(fact, qType, allKeyTerms, questions.length + 100, quizTitle, facts);
      q.id = `q_cycle_${Date.now()}_${questions.length}`;
      if (this.validateQuestion(q)) questions.push(q);
      cycle++;
      if (cycle > facts.length * 3) break; // safety exit
    }

    return {
      id: 'quiz_' + Date.now(),
      title: quizTitle,
      description: `Generated from your uploaded document (${difficulty.toUpperCase()})`,
      category: this.detectCategory(quizTitle, topicOrDocumentText),
      difficulty,
      questionTypes,
      questionsCount: questions.length,
      questions,
      createdAt: new Date().toISOString(),
      timesTaken: 0,
      timeLimitMinutes: params.timeLimitMinutes || 5,
    };
  },

  /**
   * Full pipeline (extraction + quiz) for pure-local mode.
   */
  generateQuizFromDocument(params: NlpQuizParams): Quiz {
    const facts = this.extractFacts(params);
    return this.generateQuizFromFacts(params, facts);
  },

  /**
   * Validate a generated question before it reaches the quiz screen.
   * Returns false if the question should be discarded.
   */
  validateQuestion(q: Question): boolean {
    if (!q.prompt || q.prompt.trim().length < 10) return false;
    if (!q.options || q.options.length < 2) return false;
    if (q.type === 'multiple_choice' && q.options.length < 4) return false;
    if (typeof q.correctAnswer !== 'number') return false;
    if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) return false;
    // The correct answer option must not be empty
    if (!q.options[q.correctAnswer] || q.options[q.correctAnswer].trim().length < 1) return false;
    // No duplicate options
    const uniq = new Set(q.options.map((o) => o.toLowerCase().trim()));
    if (uniq.size !== q.options.length) return false;
    return true;
  },

  /**
   * Validate and clean an array of questions from Gemini output.
   * Discards invalid questions; never throws.
   */
  validateGeminiQuestions(
    raw: any[],
    facts: FactItem[],
    quizTitle: string
  ): Question[] {
    if (!Array.isArray(raw)) return [];

    const valid: Question[] = [];
    const seenPrompts = new Set<string>();

    raw.forEach((q: any, idx: number) => {
      try {
        // Basic field checks
        if (!q.prompt || typeof q.prompt !== 'string') return;
        const prompt = q.prompt.trim();
        if (prompt.length < 10) return;
        if (seenPrompts.has(prompt.toLowerCase())) return;

        const options: string[] =
          Array.isArray(q.options) && q.options.length >= 2
            ? q.options.map((o: any) => String(o).trim())
            : [];
        if (q.type === 'multiple_choice' && options.length < 4) return;
        if (q.type === 'true_false' && options.length < 2) return;

        const correctAnswer =
          typeof q.correctAnswer === 'number'
            ? q.correctAnswer
            : typeof q.correctAnswer === 'string'
            ? parseInt(q.correctAnswer, 10)
            : -1;

        if (correctAnswer < 0 || correctAnswer >= options.length) return;
        if (!options[correctAnswer] || options[correctAnswer].trim().length < 1) return;

        // No duplicate options
        const uniq = new Set(options.map((o) => o.toLowerCase().trim()));
        if (uniq.size !== options.length) return;

        seenPrompts.add(prompt.toLowerCase());
        valid.push({
          id: q.id || `q_gem_${Date.now()}_${idx}`,
          type: q.type || 'multiple_choice',
          prompt,
          options,
          correctAnswer,
          explanation: q.explanation || `Sourced from uploaded material: ${quizTitle}`,
          category: q.category || quizTitle,
        });
      } catch {
        // Skip malformed question silently
      }
    });

    return valid;
  },

  deriveTitle(text: string, slides?: SlideBlock[]): string {
    if (slides && slides.length > 0) {
      // Use the first slide's title if it looks meaningful
      const t = slides[0].title.replace(/\b\d+\s*slides\b/gi, '').trim();
      if (t.length >= 3 && t.length <= 60) return t;
    }
    const firstLine = text.split(/\r?\n/)[0] || '';
    const cleaned = firstLine
      .replace(/\.[^/.]+$/, '')
      .replace(/[_]/g, ' ')
      .replace(/\b\d+\s*slides\b/gi, '')
      .trim();
    if (cleaned.length >= 3 && cleaned.length <= 60) return cleaned;
    return 'Study Quiz';
  },

  detectCategory(title: string, text: string): string {
    const combined = `${title} ${text}`.toLowerCase();
    if (/cisco|network|ip|router|tcp|udp|vlan|subnet|switch|ethernet|fiber|optic|wavelength|attenuation/.test(combined))
      return 'Networking & Telecommunications';
    if (/code|program|javascript|react|python|html|css|sql|git|developer|software|algorithm|data structure/.test(combined))
      return 'Software Engineering & IT';
    if (/bio|cell|organ|gene|dna|med|health|body|plant|chemistry|physics|electron|proton|atom/.test(combined))
      return 'Science & Medicine';
    if (/history|war|revolution|empire|century|ancient|civilization|president|king|queen/.test(combined))
      return 'History';
    if (/math|calculus|algebra|geometry|statistics|probability|integral|derivative/.test(combined))
      return 'Mathematics';
    return 'General Education';
  },
};
