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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', Arial, sans-serif;
    background: #F8FAFC;
    color: #0F172A;
    padding: 0;
  }
  .page {
    max-width: 800px;
    margin: 0 auto;
    background: #fff;
    padding: 40px 48px;
    min-height: 100vh;
  }
  @media print {
    body { background: #fff; }
    .page { padding: 24px 32px; width: 100%; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
  }
  .student-header {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #475569;
    border-bottom: 2px solid #0F172A;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .quiz-title {
    font-size: 22px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 6px;
  }
  .meta-row {
    font-size: 12px;
    color: #64748B;
    margin-bottom: 24px;
    padding-bottom: 12px;
    border-bottom: 1px dashed #CBD5E1;
  }
  .q-block {
    margin-bottom: 20px;
    page-break-inside: avoid;
  }
  .q-prompt {
    font-size: 15px;
    font-weight: 600;
    color: #0F172A;
    line-height: 1.4;
    margin-bottom: 10px;
  }
  .opt-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
  .opt {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #334155;
    padding: 4px 0;
  }
  .opt-bubble {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid #64748B;
    display: inline-block;
  }
  .answer-key-section {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 2px dashed #0F172A;
  }
  .answer-key-title {
    font-size: 18px;
    font-weight: 700;
    color: #0F172A;
    margin-bottom: 14px;
  }
  .key-item {
    font-size: 13px;
    color: #1E293B;
    margin-bottom: 10px;
    padding: 8px 12px;
    background: #F8FAFC;
    border-left: 3px solid #4F46E5;
    border-radius: 4px;
  }
  .print-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #4F46E5;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
`;

// ─── PDF (Clean Student Quiz Paper) ──────────────────────────────────────────

function generatePdfHtml(quiz: Quiz, attempt?: QuizAttempt | null): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Student Question Sheet HTML (NO correct answers / green colors on question pages)
  let studentQuestionsHtml = '';
  quiz.questions.forEach((q, idx) => {
    const optionsHtml = q.options.map((opt, oIdx) => `
      <li class="opt">
        <span class="opt-bubble"></span>
        <span><strong>${letterOf(oIdx)}.</strong> ${escapeXml(opt)}</span>
      </li>
    `).join('');

    studentQuestionsHtml += `
      <div class="q-block">
        <div class="q-prompt">${idx + 1}. ${escapeXml(q.prompt)}</div>
        <ul class="opt-list">${optionsHtml}</ul>
      </div>`;
  });

  // Answer Key Section (Placed on a clean separate page for instructors)
  let answerKeyHtml = '';
  quiz.questions.forEach((q, idx) => {
    const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : parseInt(String(q.correctAnswer), 10) || 0;
    const correctOptText = q.options[correctIdx] || '';
    answerKeyHtml += `
      <div class="key-item">
        <strong>Q${idx + 1}: ${letterOf(correctIdx)}. ${escapeXml(correctOptText)}</strong>
        ${q.explanation ? `<div style="margin-top:4px;color:#475569;font-size:12px;">Explanation: ${escapeXml(q.explanation)}</div>` : ''}
      </div>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeXml(quiz.title)} — Student Quiz Sheet</title>
  <style>${CSS}</style>
</head>
<body>
<div class="page">
  <div class="student-header">
    <div><strong>Name:</strong> ____________________________________</div>
    <div><strong>Date:</strong> _______________</div>
    <div><strong>Score:</strong> ______ / ${quiz.questionsCount}</div>
  </div>

  <h1 class="quiz-title">${escapeXml(quiz.title)}</h1>
  <div class="meta-row">
    Subject / Category: ${escapeXml(quiz.category || 'General')} &nbsp;|&nbsp; 
    Difficulty: ${quiz.difficulty.toUpperCase()} &nbsp;|&nbsp; 
    Total Questions: ${quiz.questionsCount}
  </div>

  <!-- Student Questions -->
  ${studentQuestionsHtml}

  <!-- Page Break for Answer Key -->
  <div class="page-break answer-key-section">
    <div class="answer-key-title">🔑 ANSWER KEY & EXPLANATIONS (Instructor Reference)</div>
    ${answerKeyHtml}
  </div>

  <div class="no-print" style="text-align:center;padding:24px 0;">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
</div>
<script>
  window.onload = function() { setTimeout(function(){ window.print(); }, 800); };
</script>
</body>
</html>`;
}

// ─── Word (.docx Clean Student Layout) ──────────────────────────────────────

function generateDocxHtml(quiz: Quiz, attempt?: QuizAttempt | null): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let questionsHtml = '';
  quiz.questions.forEach((q, idx) => {
    const optionsHtml = q.options.map((opt, oIdx) => `
      <p style="margin:4px 0 4px 18px;font-size:13px;color:#334155;">
        ( &nbsp; ) <strong>${letterOf(oIdx)}.</strong> ${escapeXml(opt)}
      </p>
    `).join('');

    questionsHtml += `
      <div style="margin-bottom:18px;">
        <p style="font-size:14px;font-weight:bold;color:#0F172A;margin-bottom:6px;">${idx + 1}. ${escapeXml(q.prompt)}</p>
        ${optionsHtml}
      </div>`;
  });

  let answerKeyHtml = '';
  quiz.questions.forEach((q, idx) => {
    const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : parseInt(String(q.correctAnswer), 10) || 0;
    const correctOptText = q.options[correctIdx] || '';
    answerKeyHtml += `
      <p style="font-size:12px;margin-bottom:6px;color:#1E293B;">
        <strong>Q${idx + 1}: ${letterOf(correctIdx)}. ${escapeXml(correctOptText)}</strong>
        ${q.explanation ? `<br/><span style="color:#64748B;font-size:11px;">Explanation: ${escapeXml(q.explanation)}</span>` : ''}
      </p>`;
  });

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
         xmlns:w="urn:schemas-microsoft-com:office:word"
         xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${escapeXml(quiz.title)}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: 'Arial', sans-serif; margin: 40px; color: #0F172A; }
    h1 { color: #0F172A; font-size: 20px; border-bottom: 2px solid #0F172A; padding-bottom: 6px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div style="border-bottom:1px solid #CBD5E1;padding-bottom:10px;margin-bottom:16px;">
    <p style="font-size:13px;color:#475569;">
      <strong>Name:</strong> ____________________________________ &nbsp;&nbsp;&nbsp;&nbsp;
      <strong>Date:</strong> _______________ &nbsp;&nbsp;&nbsp;&nbsp;
      <strong>Score:</strong> ______ / ${quiz.questionsCount}
    </p>
  </div>

  <h1>${escapeXml(quiz.title)}</h1>
  <p style="font-size:12px;color:#64748B;margin-bottom:20px;">
    Category: ${escapeXml(quiz.category || 'General')} &nbsp;|&nbsp; Difficulty: ${quiz.difficulty.toUpperCase()}
  </p>

  ${questionsHtml}

  <br/><br/>
  <div style="page-break-before:always;border-top:2px dashed #0F172A;padding-top:16px;">
    <h2 style="font-size:16px;color:#0F172A;">🔑 ANSWER KEY (Instructor Reference)</h2>
    ${answerKeyHtml}
  </div>
</body>
</html>`;
}

// ─── PPTX (Clean Classroom Presentation Deck) ──────────────────────────────────

function buildPptxZip(quiz: Quiz): ArrayBuffer {
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
        <a:solidFill><a:srgbClr val="1E293B"/></a:solidFill></p:spPr>
        <p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>
      <!-- Title -->
      <p:sp><p:nvSpPr><p:cNvPr id="3" name="title"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="2200000"/><a:ext cx="8229600" cy="1440000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
        <p:txBody><a:bodyPr wrap="square" rtlCol="0"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="3600" b="1" dirty="0"/><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
            <a:t>${t}</a:t></a:r></a:p></p:txBody></p:sp>
      <!-- Subtitle -->
      <p:sp><p:nvSpPr><p:cNvPr id="4" name="sub"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="3800000"/><a:ext cx="8229600" cy="800000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
        <p:txBody><a:bodyPr wrap="square"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="1800" dirty="0"/><a:solidFill><a:srgbClr val="94A3B8"/></a:solidFill>
            <a:t>${sub}</a:t></a:r></a:p></p:txBody></p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
  }

  function questionSlide(q: { prompt: string; options: string[] }, idx: number): string {
    const prompt = escapeXml(q.prompt);
    const optionsText = q.options.map((o, i) => `• ${letterOf(i)}.  ${escapeXml(o)}`).join('&#xA;');

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
        <p:spPr><a:xfrm><a:off x="457200" y="400000"/><a:ext cx="900000" cy="330000"/></a:ext>
        <a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val 50000"/></a:avLst></a:prstGeom>
        <a:solidFill><a:srgbClr val="EEF2FF"/></a:solidFill></p:spPr>
        <p:txBody><a:bodyPr anchor="ctr"/><a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="1100" b="1" dirty="0"/><a:solidFill><a:srgbClr val="4F46E5"/></a:solidFill>
            <a:t>Question ${idx + 1}</a:t></a:r></a:p></p:txBody></p:sp>
      <!-- Question prompt -->
      <p:sp><p:nvSpPr><p:cNvPr id="3" name="prompt"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="850000"/><a:ext cx="8229600" cy="1400000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>
        <p:txBody><a:bodyPr wrap="square"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="2200" b="1" dirty="0"/><a:solidFill><a:srgbClr val="0F172A"/></a:solidFill>
            <a:t>${prompt}</a:t></a:r></a:p></p:txBody></p:sp>
      <!-- Options -->
      <p:sp><p:nvSpPr><p:cNvPr id="4" name="opts"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr/></p:nvSpPr>
        <p:spPr><a:xfrm><a:off x="457200" y="2400000"/><a:ext cx="8229600" cy="3800000"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        <a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill>
        <a:ln><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:ln></p:spPr>
        <p:txBody><a:bodyPr wrap="square" lIns="180000" rIns="180000" tIns="180000"/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="en-US" sz="1500" dirty="0"/><a:solidFill><a:srgbClr val="334155"/></a:solidFill>
            <a:t>${optionsText}</a:t></a:r></a:p></p:txBody></p:sp>
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
        { prompt: q.prompt, options: q.options },
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
