// ─── documentExtractor.ts ────────────────────────────────────────────────────
// Responsible for extracting clean, structured text from uploaded files.
// Returns SlideBlock[] for per-slide / per-section structured content.

// @ts-ignore
import pako from 'pako';

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
  /** Flat joined text for display and AI quiz generation */
  text: string;
  /** Structured per-slide blocks */
  slides: SlideBlock[];
  /** Base64-encoded file content (used for direct multimodal Gemini PDF processing) */
  base64?: string;
}

export type FileSource = File | { name: string; size?: number; buffer: ArrayBuffer };

// ─── Internal helpers ─────────────────────────────────────────────────────────

function readAsText(file: FileSource): Promise<string> {
  if ('buffer' in file) {
    return Promise.resolve(new TextDecoder().decode(file.buffer));
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || '');
    reader.onerror = () => resolve('');
    reader.readAsText(file as File);
  });
}

function readAsArrayBuffer(file: FileSource): Promise<ArrayBuffer> {
  if ('buffer' in file) {
    return Promise.resolve(file.buffer);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) =>
      resolve((e.target?.result as ArrayBuffer) || new ArrayBuffer(0));
    reader.onerror = () => resolve(new ArrayBuffer(0));
    reader.readAsArrayBuffer(file as File);
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
 * Decompress a single DEFLATE-RAW compressed chunk from a ZIP archive using pako.
 */
function inflateRaw(data: Uint8Array): string | null {
  try {
    return pako.inflateRaw(data, { to: 'string' });
  } catch {
    try {
      return pako.inflate(data, { to: 'string' });
    } catch {
      return null;
    }
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
      let cSize =
        uint8[i + 18] |
        (uint8[i + 19] << 8) |
        (uint8[i + 20] << 16) |
        (uint8[i + 21] << 24);
      const nameLen = uint8[i + 26] | (uint8[i + 27] << 8);
      const extraLen = uint8[i + 28] | (uint8[i + 29] << 8);
      const name = new TextDecoder().decode(uint8.subarray(i + 30, i + 30 + nameLen));
      const dataOffset = i + 30 + nameLen + extraLen;

      if (cSize === 0) {
        // Streaming zip data descriptor: find next PK signature
        let nextPk = dataOffset;
        while (nextPk < uint8.length - 4) {
          if (uint8[nextPk] === 0x50 && uint8[nextPk + 1] === 0x4b) break;
          nextPk++;
        }
        cSize = nextPk - dataOffset;
      }

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
async function extractPptxSlides(file: FileSource): Promise<SlideBlock[]> {
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

async function extractDocxBlocks(file: FileSource): Promise<SlideBlock[]> {
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

  // Group every 15 lines into a virtual "slide" block
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

function bytesToBinaryString(uint8: Uint8Array): string {
  let res = '';
  const chunk = 8192;
  for (let i = 0; i < uint8.length; i += chunk) {
    const sub = uint8.subarray(i, Math.min(i + chunk, uint8.length));
    res += String.fromCharCode.apply(null, sub as any);
  }
  return res;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Pure JavaScript Base64 encoder for Uint8Array.
 * Works seamlessly in React Native Hermes, Web, iOS, and Android without Buffer or btoa.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  const rem = len % 3;
  const mainLen = len - rem;

  for (let i = 0; i < mainLen; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    result +=
      B64_CHARS[(b0 >> 2) & 63] +
      B64_CHARS[((b0 << 4) | (b1 >> 4)) & 63] +
      B64_CHARS[((b1 << 2) | (b2 >> 6)) & 63] +
      B64_CHARS[b2 & 63];
  }

  if (rem === 1) {
    const b0 = bytes[mainLen];
    result +=
      B64_CHARS[(b0 >> 2) & 63] +
      B64_CHARS[(b0 << 4) & 63] +
      '==';
  } else if (rem === 2) {
    const b0 = bytes[mainLen];
    const b1 = bytes[mainLen + 1];
    result +=
      B64_CHARS[(b0 >> 2) & 63] +
      B64_CHARS[((b0 << 4) | (b1 >> 4)) & 63] +
      B64_CHARS[(b1 << 2) & 63] +
      '=';
  }

  return result;
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

async function extractPdfBlocks(file: FileSource): Promise<SlideBlock[]> {
  const arrayBuffer = await readAsArrayBuffer(file);
  const uint8 = new Uint8Array(arrayBuffer);
  const lines: string[] = [];
  const seen = new Set<string>();

  // Use raw binary-string so byte indices align 1-to-1 without Hermes TextDecoder crash
  const rawText = bytesToBinaryString(uint8);

  // 1. Inflate FlateDecode streams
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let streamMatch: RegExpExecArray | null;
  while ((streamMatch = streamRegex.exec(rawText)) !== null) {
    try {
      const startIdx = streamMatch.index + streamMatch[0].indexOf('\n') + 1;
      const endIdx = streamMatch.index + streamMatch[0].lastIndexOf('endstream');
      if (endIdx > startIdx) {
        const streamBytes = uint8.subarray(startIdx, endIdx);
        let inflated: string | null = null;
        try {
          inflated = pako.inflate(streamBytes, { to: 'string' });
        } catch {
          try {
            inflated = pako.inflateRaw(streamBytes, { to: 'string' });
          } catch {}
        }

        if (inflated) {
          // A. Parenthesized literal strings: (Text) Tj
          const textMatches = inflated.match(/\(([^()]{2,200})\)\s*T[jJ]/g) || [];
          textMatches.forEach((m) => {
            const clean = m.replace(/^\(/, '').replace(/\)\s*T[jJ]$/i, '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
            const lower = clean.toLowerCase();
            if (isUsefulLine(clean) && !seen.has(lower) && clean.length > 2) {
              seen.add(lower);
              lines.push(clean);
            }
          });

          // B. TJ array text runs: [(Text 1) -10 (Text 2)] TJ -> assemble text
          const tjMatches = inflated.match(/\[([\s\S]*?)\]\s*TJ/gi) || [];
          tjMatches.forEach((tj) => {
            const parts = tj.match(/\(([^()]+)\)/g);
            if (parts && parts.length > 0) {
              const assembled = parts
                .map((p) => p.slice(1, -1).replace(/\\([()\\])/g, '$1'))
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
              const lower = assembled.toLowerCase();
              if (isUsefulLine(assembled) && !seen.has(lower) && assembled.length > 3) {
                seen.add(lower);
                lines.push(assembled);
              }
            }
          });

          // C. Hex-encoded strings: <00480065006C...> Tj
          const hexMatches = inflated.match(/<([0-9A-Fa-f]{8,})>\s*T[jJ]/g) || [];
          hexMatches.forEach((h) => {
            const hex = h.replace(/[^0-9A-Fa-f]/g, '');
            let decoded = '';
            if (hex.startsWith('00') && hex.length % 4 === 0) {
              for (let k = 0; k < hex.length; k += 4) {
                decoded += String.fromCharCode(parseInt(hex.substr(k, 4), 16));
              }
            } else {
              for (let k = 0; k < hex.length; k += 2) {
                decoded += String.fromCharCode(parseInt(hex.substr(k, 2), 16));
              }
            }
            decoded = decoded.replace(/\s+/g, ' ').trim();
            const lower = decoded.toLowerCase();
            if (isUsefulLine(decoded) && !seen.has(lower) && decoded.length > 3) {
              seen.add(lower);
              lines.push(decoded);
            }
          });
        }
      }
    } catch {}
  }

  // 2. Look for literal text runs in uncompressed streams or catalog
  const literalMatches = rawText.match(/\(([^()]{3,200})\)\s*T[jJ]/g) || [];
  literalMatches.forEach((m) => {
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

  // 3. Fallback: extract meaningful sentence-like lines from raw text
  if (lines.length === 0) {
    const sentenceMatches = rawText.match(/[A-Z][a-zA-Z0-9\s,.-]{15,120}[.?]/g) || [];
    sentenceMatches.slice(0, 30).forEach((m) => {
      const clean = m.trim();
      const lower = clean.toLowerCase();
      if (isUsefulLine(clean) && !seen.has(lower)) {
        seen.add(lower);
        lines.push(clean);
      }
    });
  }

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

async function extractTextBlocks(file: FileSource): Promise<SlideBlock[]> {
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
  async extractTextFromFile(file: FileSource): Promise<ExtractedDocument> {
    const fileName = file.name;
    const fileSizeMB =
      'size' in file && typeof file.size === 'number'
        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
        : '1.0 MB';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    let slides: SlideBlock[] = [];
    let base64: string | undefined;

    try {
      if (ext === 'pptx' || ext === 'ppt') {
        slides = await extractPptxSlides(file);
      } else if (ext === 'docx' || ext === 'doc') {
        slides = await extractDocxBlocks(file);
      } else if (ext === 'pdf') {
        slides = await extractPdfBlocks(file);
        try {
          const ab = await readAsArrayBuffer(file);
          if (ab.byteLength > 0 && ab.byteLength < 15 * 1024 * 1024) {
            base64 = uint8ArrayToBase64(new Uint8Array(ab));
          }
        } catch {}
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

    return { fileName, size: fileSizeMB, text, slides, base64 };
  },
};
