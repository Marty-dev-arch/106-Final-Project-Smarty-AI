/**
 * exportService.ts
 *
 * Generates clean, downloadable quiz files in three formats:
 *   - PDF  : HTML page styled for print → triggers browser print dialog
 *   - DOCX : Rich HTML wrapped in Word-compatible XML (opens in Word/Docs)
 *   - PPTX : Proper Open XML PPTX zip-structured XML (opens in PowerPoint)
 *
 * All formats are generated client-side with zero external dependencies.
 */

import { Platform, Alert } from 'react-native';
import { Quiz, QuizAttempt } from '../types/quiz';

export type ExportFormat = 'pdf' | 'docx' | 'ppt';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').slice(0, 60);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function letterOf(n: number): string {
  return String.fromCharCode(65 + n);
}

// ─── Shared CSS design tokens ─────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    background: #F8F7FF;
    color: #111827;
    padding: 0;
  }
  .page {
    max-width: 820px;
    margin: 0 auto;
    background: #fff;
    padding: 48px 52px;
    min-height: 100vh;
  }
  @media print {
    body { background: #fff; }
    .page { padding: 30px 40px; }
    .no-print { display: none !important; }
  }
  .header {
    border-bottom: 3px solid #4648D4;
    padding-bottom: 18px;
    margin-bottom: 28px;
  }
  .badge {
    display: inline-block;
    background: #4648D4;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 20px;
    margin-bottom: 10px;
  }
  h1 {
    font-size: 26px;
    font-weight: 800;
    color: #1E1B4B;
    line-height: 1.2;
    margin-bottom: 6px;
  }
  .meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin-top: 14px;
    padding: 14px 18px;
    background: #F5F3FF;
    border-radius: 10px;
    border-left: 4px solid #6D44F2;
  }
  .meta-item { font-size: 13px; color: #374151; }
  .meta-item strong { color: #4648D4; }
  .q-block {
    margin-bottom: 28px;
    border: 1px solid #E5E7EB;
    border-radius: 14px;
    overflow: hidden;
  }
  .q-header {
    background: #F5F3FF;
    padding: 14px 18px;
    border-bottom: 1px solid #E5E7EB;
  }
  .q-num {
    font-size: 11px;
    font-weight: 700;
    color: #6D44F2;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 4px;
  }
  .q-prompt {
    font-size: 16px;
    font-weight: 700;
    color: #1E1B4B;
    line-height: 1.5;
  }
  .q-body { padding: 14px 18px; }
  .opt-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .opt {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1.5px solid #E5E7EB;
    font-size: 14px;
    color: #374151;
    background: #FAFAFA;
  }
  .opt.correct {
    background: #ECFDF5;
    border-color: #10B981;
    color: #065F46;
    font-weight: 700;
  }
  .opt-letter {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #E5E7EB;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #374151;
  }
  .opt.correct .opt-letter { background: #10B981; color: #fff; }
  .check-mark { margin-left: auto; color: #10B981; font-weight: 800; }
  .explanation {
    margin-top: 12px;
    background: #FFFBEB;
    border-left: 3px solid #F59E0B;
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 13px;
    color: #78350F;
    line-height: 1.5;
  }
  .explanation strong { color: #B45309; }
  .footer {
    margin-top: 40px;
    padding-top: 16px;
    border-top: 1px solid #E5E7EB;
    font-size: 12px;
    color: #9CA3AF;
    text-align: center;
  }
  .print-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 24px;
    padding: 12px 24px;
    background: #4648D4;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }
`;

// ─── PDF (print-ready HTML) ────────────────────────────────────────────────────

function generatePdfHtml(quiz: Quiz, attempt?: QuizAttempt | null): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const scoreHtml = attempt
    ? `<div class="meta-item"><strong>Score:</strong> ${attempt.score}/${attempt.totalQuestions} (${attempt.percentage}%)</div>`
    : '';

  let questionsHtml = '';
  quiz.questions.forEach((q, idx) => {
    const optionsHtml = q.options.map((opt, oIdx) => {
      const isCorrect = oIdx === q.correctAnswer;
      return `
        <li class="opt ${isCorrect ? 'correct' : ''}">
          <span class="opt-letter">${letterOf(oIdx)}</span>
          <span>${escapeXml(opt)}</span>
          ${isCorrect ? '<span class="check-mark">✓ Correct</span>' : ''}
        </li>`;
    }).join('');

    questionsHtml += `
      <div class="q-block">
        <div class="q-header">
          <div class="q-num">Question ${idx + 1} of ${quiz.questions.length}</div>
          <div class="q-prompt">${escapeXml(q.prompt)}</div>
        </div>
        <div class="q-body">
          <ul class="opt-list">${optionsHtml}</ul>
          ${q.explanation ? `<div class="explanation"><strong>💡 Concept Key:</strong> ${escapeXml(q.explanation)}</div>` : ''}
        </div>
      </div>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(quiz.title)} — Smarty AI Quiz</title>
  <style>${CSS}</style>
</head>
<body>
<div class="page">
  <div class="header">
    <span class="badge">Smarty AI</span>
    <h1>${escapeXml(quiz.title)}</h1>
    <div class="meta-row">
      <div class="meta-item"><strong>Category:</strong> ${escapeXml(quiz.category || 'General Knowledge')}</div>
      <div class="meta-item"><strong>Difficulty:</strong> ${quiz.difficulty.toUpperCase()}</div>
      <div class="meta-item"><strong>Questions:</strong> ${quiz.questionsCount}</div>
      <div class="meta-item"><strong>Generated:</strong> ${date}</div>
      ${scoreHtml}
    </div>
  </div>

  ${questionsHtml}

  <div class="footer">Generated by Smarty AI — ${date}</div>

  <div class="no-print" style="text-align:center;padding:24px 0;">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
</div>
<script>
  // Auto-trigger print for PDF saving
  window.onload = function() { setTimeout(function(){ window.print(); }, 800); };
</script>
</body>
</html>`;
}

// ─── Word (.docx via HTML-in-Word format) ─────────────────────────────────────

function generateDocxHtml(quiz: Quiz, attempt?: QuizAttempt | null): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let questionsHtml = '';
  quiz.questions.forEach((q, idx) => {
    const optionsHtml = q.options.map((opt, oIdx) => {
      const isCorrect = oIdx === q.correctAnswer;
      const marker = isCorrect ? '✓' : '○';
      const style = isCorrect
        ? 'background:#ECFDF5;color:#065F46;font-weight:bold;border:1px solid #10B981;'
        : 'background:#F9FAFB;color:#374151;border:1px solid #E5E7EB;';
      return `<p style="padding:8px 12px;border-radius:6px;margin:5px 0;font-size:13px;${style}">${marker} ${letterOf(oIdx)}. ${escapeXml(opt)}</p>`;
    }).join('');

    questionsHtml += `
      <div style="margin-bottom:22px;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
        <div style="background:#F5F3FF;padding:14px 18px;border-bottom:1px solid #E5E7EB;">
          <p style="font-size:11px;color:#6D44F2;font-weight:bold;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Question ${idx + 1}</p>
          <p style="font-size:15px;font-weight:bold;color:#1E1B4B;line-height:1.5;">${escapeXml(q.prompt)}</p>
        </div>
        <div style="padding:14px 18px;">
          ${optionsHtml}
          ${q.explanation ? `<div style="margin-top:10px;background:#FFFBEB;border-left:3px solid #F59E0B;padding:10px 14px;font-size:12px;color:#78350F;border-radius:4px;"><strong>💡 Concept Key:</strong> ${escapeXml(q.explanation)}</div>` : ''}
        </div>
      </div>`;
  });

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
         xmlns:w="urn:schemas-microsoft-com:office:word"
         xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${escapeXml(quiz.title)}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml><![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #111827; }
    h1 { color: #4648D4; font-size: 24px; border-bottom: 3px solid #4648D4; padding-bottom: 10px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <p style="display:inline-block;background:#4648D4;color:#fff;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:20px;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">Smarty AI</p>
  <h1>${escapeXml(quiz.title)}</h1>
  <div style="background:#F5F3FF;padding:14px 18px;border-radius:10px;border-left:4px solid #6D44F2;margin:16px 0 28px;">
    <p style="font-size:13px;color:#374151;margin-bottom:4px;"><strong style="color:#4648D4;">Category:</strong> ${escapeXml(quiz.category || 'General Knowledge')}</p>
    <p style="font-size:13px;color:#374151;margin-bottom:4px;"><strong style="color:#4648D4;">Difficulty:</strong> ${quiz.difficulty.toUpperCase()}</p>
    <p style="font-size:13px;color:#374151;margin-bottom:4px;"><strong style="color:#4648D4;">Questions:</strong> ${quiz.questionsCount}</p>
    ${attempt ? `<p style="font-size:13px;color:#374151;"><strong style="color:#4648D4;">Score:</strong> ${attempt.score}/${attempt.totalQuestions} (${attempt.percentage}%)</p>` : ''}
    <p style="font-size:13px;color:#374151;margin-top:4px;"><strong style="color:#4648D4;">Generated:</strong> ${date}</p>
  </div>
  ${questionsHtml}
  <p style="margin-top:40px;padding-top:14px;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF;text-align:center;">Generated by Smarty AI — ${date}</p>
</body>
</html>`;
}

// ─── PPTX (Open XML via PresentationML) ───────────────────────────────────────
//
// We build a minimal but valid Open XML PPTX in memory as a text-based ZIP,
// then trigger browser download. This uses a simple approach where each file is
// stored as a Stored (compression=0) entry in the ZIP so no zip library is needed.

function buildPptxZip(quiz: Quiz): ArrayBuffer {
  // ── Slide helpers ───────────────────────────────────────────────────────────

  function titleSlide(): string {
    const t = escapeXml(quiz.title);
    const sub = escapeXml(`${quiz.category || 'General'} · ${quiz.difficulty.toUpperCase()} · ${quiz.questionsCount} Questions`);
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="6858000"/></a:xfrm></p:grpSpPr>
      <!-- Background -->
      <p:sp><p:nvSpPr><p:cNvPr id="2" name="bg"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="6858000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="4648D4"/></a:solidFill></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>
      <!-- Title -->
      <p:sp><p:nvSpPr><p:cNvPr id="3" name="title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="1800000"/><a:ext cx="8229600" cy="1440000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
        <p:txBody><a:bodyPr wrap="square" rtlCol="0"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="3600" b="1" dirty="0"/><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
            <a:t>${t}</a:t></a:r></a:p></p:txBody></p:sp>
      <!-- Subtitle -->
      <p:sp><p:nvSpPr><p:cNvPr id="4" name="sub"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="3420000"/><a:ext cx="8229600" cy="800000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
        <p:txBody><a:bodyPr wrap="square"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="1800" dirty="0"/><a:solidFill><a:srgbClr val="C7C3FF"/></a:solidFill>
            <a:t>${sub}</a:t></a:r></a:p></p:txBody></p:sp>
      <!-- Smarty AI badge -->
      <p:sp><p:nvSpPr><p:cNvPr id="5" name="badge"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="5800000"/><a:ext cx="1800000" cy="360000"/></a:xfrm>
        <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 25000"/></a:avLst></a:prstGeom>
        <a:solidFill><a:srgbClr val="FFFFFF"><a:alpha val="25000"/></a:srgbClr></a:solidFill></p:spPr>
        <p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="1100" b="1" dirty="0"/><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
            <a:t>✦ SMARTY AI</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
  }

  function questionSlide(q: { prompt: string; options: string[]; correctAnswer: number; explanation?: string }, idx: number): string {
    const prompt = escapeXml(q.prompt);
    const optionsText = q.options.map((o, i) => {
      const check = i === q.correctAnswer ? ' ✓' : '';
      return `• ${letterOf(i)}.  ${escapeXml(o)}${check}`;
    }).join('&#xA;');
    const expText = q.explanation ? escapeXml('💡 ' + q.explanation) : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="9144000" cy="6858000"/></a:xfrm></p:grpSpPr>
      <!-- Q number pill -->
      <p:sp><p:nvSpPr><p:cNvPr id="2" name="pill"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="330000"/><a:ext cx="900000" cy="330000"/></a:xfrm>
        <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 50000"/></a:avLst></a:prstGeom>
        <a:solidFill><a:srgbClr val="EDE9FF"/></a:solidFill></p:spPr>
        <p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="1000" b="1" dirty="0"/><a:solidFill><a:srgbClr val="4648D4"/></a:solidFill>
            <a:t>Q${idx + 1}</a:t></a:r></a:p></p:txBody></p:sp>
      <!-- Question prompt -->
      <p:sp><p:nvSpPr><p:cNvPr id="3" name="prompt"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="750000"/><a:ext cx="8229600" cy="1200000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
        <p:txBody><a:bodyPr wrap="square"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="2000" b="1" dirty="0"/><a:solidFill><a:srgbClr val="1E1B4B"/></a:solidFill>
            <a:t>${prompt}</a:t></a:r></a:p></p:txBody></p:sp>
      <!-- Options -->
      <p:sp><p:nvSpPr><p:cNvPr id="4" name="opts"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="2050000"/><a:ext cx="8229600" cy="3200000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="F5F3FF"/></a:solidFill>
        <a:ln><a:solidFill><a:srgbClr val="E5E7EB"/></a:solidFill></a:ln></p:spPr>
        <p:txBody><a:bodyPr wrap="square" lIns="180000" rIns="180000" tIns="180000"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="1400" dirty="0"/><a:solidFill><a:srgbClr val="374151"/></a:solidFill>
            <a:t>${optionsText}</a:t></a:r></a:p></p:txBody></p:sp>
      ${expText ? `<!-- Explanation -->
      <p:sp><p:nvSpPr><p:cNvPr id="5" name="exp"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="5350000"/><a:ext cx="8229600" cy="1000000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="FFFBEB"/></a:solidFill>
        <a:ln><a:solidFill><a:srgbClr val="F59E0B"/></a:solidFill></a:ln></p:spPr>
        <p:txBody><a:bodyPr wrap="square" lIns="180000" rIns="180000" tIns="120000"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="1100" dirty="0"/><a:solidFill><a:srgbClr val="78350F"/></a:solidFill>
            <a:t>${expText}</a:t></a:r></a:p></p:txBody></p:sp>` : ''}
    </p:spTree>
  </p:cSld>
</p:sld>`;
  }

  // ── Build ZIP entries ───────────────────────────────────────────────────────

  const slideCount = quiz.questions.length + 1; // title + questions

  const slides: { path: string; content: string }[] = [
    { path: 'ppt/slides/slide1.xml', content: titleSlide() },
    ...quiz.questions.map((q, i) => ({
      path: `ppt/slides/slide${i + 2}.xml`,
      content: questionSlide(
        {
          ...q,
          correctAnswer: typeof q.correctAnswer === 'string'
            ? parseInt(q.correctAnswer, 10)
            : q.correctAnswer,
        },
        i
      ),
    })),
  ];

  // Slide relationships (all reference slideLayout1)
  const slideRels = slides.map((s, i) => ({
    path: s.path.replace('slides/', 'slides/_rels/').replace('.xml', '.xml.rels'),
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`,
  }));

  // slideIdList for presentation.xml
  const slideIdList = slides
    .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`)
    .join('\n    ');

  // presentation.xml relationship entries
  const presRelSlides = slides
    .map((s, i) => `  <Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`)
    .join('\n');

  const allFiles: { path: string; content: string }[] = [
    {
      path: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${slides.map((s) => `<Override PartName="/${s.path}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n  ')}
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
</Types>`,
    },
    {
      path: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,
    },
    {
      path: 'ppt/_rels/presentation.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
${presRelSlides}
</Relationships>`,
    },
    {
      path: 'ppt/presentation.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
    xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    saveSubsetFonts="1">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${slideIdList}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,
    },
    // Minimal slide master (required by spec)
    {
      path: 'ppt/slideMasters/slideMaster1.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`,
    },
    {
      path: 'ppt/slideMasters/_rels/slideMaster1.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`,
    },
    // Minimal slide layout
    {
      path: 'ppt/slideLayouts/slideLayout1.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
             type="blank" preserve="1">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
</p:sldLayout>`,
    },
    {
      path: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`,
    },
    ...slides,
    ...slideRels,
  ];

  // ── Pack into a Stored ZIP (no compression) ─────────────────────────────────

  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDir: { name: Uint8Array; offset: number; crc: number; size: number }[] = [];

  function crc32(data: Uint8Array): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function uint16LE(n: number): Uint8Array {
    return new Uint8Array([n & 0xFF, (n >> 8) & 0xFF]);
  }
  function uint32LE(n: number): Uint8Array {
    return new Uint8Array([n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF]);
  }

  let offset = 0;

  for (const file of allFiles) {
    const nameBytes = enc.encode(file.path);
    const dataBytes = enc.encode(file.content);
    const crc = crc32(dataBytes);

    // Local file header (PK\x03\x04)
    const localHeader = new Uint8Array([
      0x50, 0x4B, 0x03, 0x04, // signature
      0x14, 0x00,             // version needed
      0x00, 0x00,             // general purpose flags
      0x00, 0x00,             // compression method: stored
      0x00, 0x00,             // last mod time
      0x00, 0x00,             // last mod date
      ...uint32LE(crc),
      ...uint32LE(dataBytes.length),
      ...uint32LE(dataBytes.length),
      ...uint16LE(nameBytes.length),
      0x00, 0x00,             // extra field length
    ]);

    parts.push(localHeader, nameBytes, dataBytes);
    centralDir.push({ name: nameBytes, offset, crc, size: dataBytes.length });
    offset += localHeader.length + nameBytes.length + dataBytes.length;
  }

  // Central directory
  const cdStart = offset;
  for (const cd of centralDir) {
    const cdEntry = new Uint8Array([
      0x50, 0x4B, 0x01, 0x02, // central dir signature
      0x14, 0x00,             // version made by
      0x14, 0x00,             // version needed
      0x00, 0x00,             // flags
      0x00, 0x00,             // compression: stored
      0x00, 0x00,             // time
      0x00, 0x00,             // date
      ...uint32LE(cd.crc),
      ...uint32LE(cd.size),
      ...uint32LE(cd.size),
      ...uint16LE(cd.name.length),
      0x00, 0x00,             // extra length
      0x00, 0x00,             // comment length
      0x00, 0x00,             // disk start
      0x00, 0x00,             // internal attrs
      0x00, 0x00, 0x00, 0x00, // external attrs
      ...uint32LE(cd.offset),
    ]);
    parts.push(cdEntry, cd.name);
    offset += cdEntry.length + cd.name.length;
  }

  const cdSize = offset - cdStart;

  // End of central directory
  const eocd = new Uint8Array([
    0x50, 0x4B, 0x05, 0x06,   // signature
    0x00, 0x00,               // disk number
    0x00, 0x00,               // disk with central dir
    ...uint16LE(centralDir.length),
    ...uint16LE(centralDir.length),
    ...uint32LE(cdSize),
    ...uint32LE(cdStart),
    0x00, 0x00,               // comment length
  ]);
  parts.push(eocd);

  // Concatenate all parts
  const totalLen = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) {
    result.set(p, pos);
    pos += p.length;
  }
  return result.buffer;
}

// ─── Public export service ────────────────────────────────────────────────────

export const exportService = {
  exportQuiz(quiz: Quiz, format: ExportFormat, attempt?: QuizAttempt | null) {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Export',
        `"${quiz.title}" export is available on web browsers. Open the app in a browser to download.`
      );
      return;
    }

    const filename = `${safeFilename(quiz.title)}_Quiz.${format === 'ppt' ? 'pptx' : format}`;

    try {
      if (format === 'pdf') {
        // Open a new tab with the print-ready HTML; browser handles PDF saving
        const html = generatePdfHtml(quiz, attempt);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          // Popup blocked — fall back to direct download
          this.triggerDownload(filename.replace('.pdf', '.html'), blob);
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);

      } else if (format === 'docx') {
        const html = generateDocxHtml(quiz, attempt);
        const blob = new Blob([html], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        this.triggerDownload(filename, blob);

      } else if (format === 'ppt') {
        const buffer = buildPptxZip(quiz);
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        });
        this.triggerDownload(filename, blob);
      }
    } catch (e: any) {
      throw new Error(e?.message || 'Export generation failed');
    }
  },

  triggerDownload(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  },

  // Keep backward compat
  downloadFile(filename: string, content: string, mimeType: string) {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      this.triggerDownload(filename, blob);
    }
  },
};
