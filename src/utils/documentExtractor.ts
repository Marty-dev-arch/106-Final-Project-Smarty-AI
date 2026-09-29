// ─── documentExtractor.ts ────────────────────────────────────────────────────
// Responsible ONLY for extracting clean, structured text from uploaded files.
// Returns SlideBlock[] so the NLP layer can work per-slide/per-section.

export interface SlideBlock {
  /** Slide number (1-based) or section index for non-PPTX files */
  slideIndex: number;
  /** Title line of the slide/section, if detectable */
  title: string;
  /** Remaining text lines (bullet points, body text, table cells) */
  lines: string[];
}

export interface ExtractedDocument {
  fileName: string;
  size: string;
  /** Flat joined text for quick display / NLP input */
  text: string;
  /** Structured per-slide blocks for high-quality NLP */
  slides: SlideBlock[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function readAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) =>
      resolve((e.target?.result as ArrayBuffer) || new ArrayBuffer(0));
    reader.onerror = () => resolve(new ArrayBuffer(0));
    reader.readAsArrayBuffer(file);
  });
}

/** Strip XML tags and decode common HTML entities */
function cleanXml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Reject placeholder / metadata strings that pollute quiz generation */
const JUNK_RE =
  /^(click to edit|slide \d+|title|footer|header|confidential|www\.|http|©|\d{4}(-\d{4})?|all rights reserved|powered by|template)$/i;

function isUsefulLine(s: string): boolean {
  return (
    s.length >= 3 &&
    s.length <= 350 &&
    !/^\d+$/.test(s) &&
    !JUNK_RE.test(s.trim())
  );
}

// ─── PPTX / PPT ──────────────────────────────────────────────────────────────

/**
 * Decompress a single DEFLATE-RAW compressed chunk from a ZIP archive.
 * Falls back to returning null if DecompressionStream is unavailable.
 */
async function inflateRaw(data: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  try {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    // Cast to Uint8Array<ArrayBuffer> for strict TS compatibility
    writer.write(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
    writer.close();
    return await new Response(ds.readable).text();
  } catch {
    return null;
  }
}

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  dataOffset: number;
}

/** Fast scanner for ZIP local-file-headers (PK\x03\x04). */
function scanZipEntries(uint8: Uint8Array): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let i = 0;
  while (i < uint8.length - 30) {
    if (
      uint8[i] === 0x50 &&
      uint8[i + 1] === 0x4b &&
      uint8[i + 2] === 0x03 &&
      uint8[i + 3] === 0x04
    ) {
      const method = uint8[i + 8] | (uint8[i + 9] << 8);
      const cSize =
        uint8[i + 18] |
        (uint8[i + 19] << 8) |
        (uint8[i + 20] << 16) |
        (uint8[i + 21] << 24);
      const nameLen = uint8[i + 26] | (uint8[i + 27] << 8);
      const extraLen = uint8[i + 28] | (uint8[i + 29] << 8);
      const name = new TextDecoder().decode(uint8.subarray(i + 30, i + 30 + nameLen));
      const dataOffset = i + 30 + nameLen + extraLen;
      entries.push({ name, method, compressedSize: cSize, dataOffset });
      i = dataOffset + (cSize > 0 ? cSize : 1);
    } else {
      i++;
    }
  }
  return entries;
}

/**
 * Extract slide text per-slide from an Open XML PPTX ZIP.
 * Parses ppt/slides/slideN.xml entries and pulls <a:t> text runs.
 * Title shape detection: checks <p:ph type="title"> or <p:ph type="ctrTitle">.
 */
async function extractPptxSlides(file: File): Promise<SlideBlock[]> {
  const arrayBuffer = await readAsArrayBuffer(file);
  const uint8 = new Uint8Array(arrayBuffer);
  const entries = scanZipEntries(uint8);

  // Filter only slide XML entries, sort by slide number
  const slideEntries = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.name))
    .sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || '0', 10);
      return numA - numB;
    });

  const blocks: SlideBlock[] = [];

  for (const entry of slideEntries) {
    const slideNum = parseInt(entry.name.match(/\d+/)?.[0] || '1', 10);
    const rawData = uint8.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);

    let xml = '';
    if (entry.method === 0) {
      xml = new TextDecoder().decode(rawData);
    } else if (entry.method === 8) {
      xml = (await inflateRaw(rawData)) ?? '';
    }

    if (!xml) continue;

    // ── Find title shape: look for placeholder type="title" or "ctrTitle"
    let titleText = '';
    const titleShapeMatch = xml.match(
      /<p:ph[^>]+type="(?:title|ctrTitle)"[^>]*\/?>[\s\S]{0,2000}?<\/p:sp>/
    );
    if (titleShapeMatch) {
      const runs = titleShapeMatch[0].match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
      titleText = runs
        .map((r) => cleanXml(r))
        .filter(isUsefulLine)
        .join(' ');
    }

    // ── Collect all <a:t> runs from non-title text shapes
    // Remove title shape XML to avoid double-counting
    const bodyXml = titleShapeMatch
      ? xml.replace(titleShapeMatch[0], '')
      : xml;

    const allRuns = bodyXml.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
    const lines: string[] = [];
    const seen = new Set<string>();

    allRuns.forEach((r) => {
      const t = cleanXml(r);
      const lower = t.toLowerCase();
      if (isUsefulLine(t) && !seen.has(lower)) {
        seen.add(lower);
        lines.push(t);
      }
    });

    if (titleText || lines.length > 0) {
      blocks.push({ slideIndex: slideNum, title: titleText, lines });
    }
  }

  return blocks;
}

// ─── DOCX ─────────────────────────────────────────────────────────────────────

async function extractDocxBlocks(file: File): Promise<SlideBlock[]> {
  const arrayBuffer = await readAsArrayBuffer(file);
  const uint8 = new Uint8Array(arrayBuffer);
  const entries = scanZipEntries(uint8);

  const docEntry = entries.find((e) =>
    e.name === 'word/document.xml'
  );
  if (!docEntry) return [];

  const rawData = uint8.subarray(
    docEntry.dataOffset,
    docEntry.dataOffset + docEntry.compressedSize
  );
  let xml = '';
  if (docEntry.method === 0) {
    xml = new TextDecoder().decode(rawData);
  } else if (docEntry.method === 8) {
    xml = (await inflateRaw(rawData)) ?? '';
  }

  if (!xml) return [];

  // Split into paragraphs, combine <w:t> runs per paragraph
  const paragraphs = xml.split(/<\/w:p>/i);
  const lines: string[] = [];
  const seen = new Set<string>();

  paragraphs.forEach((para) => {
    const runs = para.match(/<w:t[^>]*>(.*?)<\/w:t>/gi) || [];
    const text = runs.map((r) => cleanXml(r)).join('').trim();
    const lower = text.toLowerCase();
    if (isUsefulLine(text) && !seen.has(lower)) {
      seen.add(lower);
      lines.push(text);
    }
  });

  if (lines.length === 0) return [];

  // Group every 15 lines into a virtual "slide" block for the NLP layer
  const blocks: SlideBlock[] = [];
  const chunkSize = 15;
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    blocks.push({
      slideIndex: Math.floor(i / chunkSize) + 1,
      title: chunk[0],
      lines: chunk.slice(1),
    });
  }
  return blocks;
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

async function extractPdfBlocks(file: File): Promise<SlideBlock[]> {
  const text = await readAsText(file);

  // Heuristic: pull readable ASCII text chunks between Tj/TJ operators
  const matches = text.match(/\(([^()]{3,200})\)\s*T[jJ]/g) || [];
  const lines: string[] = [];
  const seen = new Set<string>();

  matches.forEach((m) => {
    const clean = m
      .replace(/^\(/, '')
      .replace(/\)\s*T[jJ]$/, '')
      .replace(/\\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const lower = clean.toLowerCase();
    if (isUsefulLine(clean) && !/^[\d\s.,/\\-]+$/.test(clean) && !seen.has(lower)) {
      seen.add(lower);
      lines.push(clean);
    }
  });

  if (lines.length === 0) return [];

  // Group into virtual slide blocks
  const blocks: SlideBlock[] = [];
  const chunkSize = 12;
  for (let i = 0; i < lines.length && i < 300; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    blocks.push({
      slideIndex: Math.floor(i / chunkSize) + 1,
      title: chunk[0],
      lines: chunk.slice(1),
    });
  }
  return blocks;
}

// ─── TXT / Plain text ─────────────────────────────────────────────────────────

async function extractTextBlocks(file: File): Promise<SlideBlock[]> {
  const raw = await readAsText(file);
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(isUsefulLine);

  if (lines.length === 0) return [];

  const blocks: SlideBlock[] = [];
  const chunkSize = 10;
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    blocks.push({
      slideIndex: Math.floor(i / chunkSize) + 1,
      title: chunk[0],
      lines: chunk.slice(1),
    });
  }
  return blocks;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const documentExtractor = {
  /**
   * Main entry point.
   * Parses the file once and returns both flat text and structured slides.
   */
  async extractTextFromFile(file: File): Promise<ExtractedDocument> {
    const fileName = file.name;
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    let slides: SlideBlock[] = [];

    try {
      if (ext === 'pptx' || ext === 'ppt') {
        slides = await extractPptxSlides(file);
      } else if (ext === 'docx' || ext === 'doc') {
        slides = await extractDocxBlocks(file);
      } else if (ext === 'pdf') {
        slides = await extractPdfBlocks(file);
      } else {
        slides = await extractTextBlocks(file);
      }
    } catch (e) {
      console.warn('[documentExtractor] Extraction error:', e);
    }

    // Build flat text from slide blocks for backward compat
    const text =
      slides.length > 0
        ? slides
            .map((s) => {
              const parts = [];
              if (s.title) parts.push(s.title);
              parts.push(...s.lines);
              return parts.join('\n');
            })
            .join('\n\n')
        : fileName;

    return { fileName, size: fileSizeMB, text, slides };
  },
};
