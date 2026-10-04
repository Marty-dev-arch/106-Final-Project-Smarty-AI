/**
 * exportService.ts
 *
 * Generates clean, downloadable and shareable quiz files in two formats:
 *   - PDF  : Print-ready document (native PDF generation on mobile via expo-print + expo-sharing; browser print dialog on web)
 *   - DOCX : Rich Microsoft Word document (.docx) with student sheet & optional answer keys
 *
 * Fully supports iOS, Android, and Web with native file sharing and download triggers.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Quiz, QuizAttempt } from '../types/quiz';
import { sanitizeTitle } from './documentExtractor';

export type ExportFormat = 'pdf' | 'docx';

export interface ExportOptions {
  includeAnswerKey?: boolean;
  includeStudentScore?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeFilename(title: string): string {
  const clean = sanitizeTitle(title, undefined, 'Study_Quiz');
  return clean.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').slice(0, 60) || 'Smarty_Quiz';
}

function escapeXml(str?: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function letterOf(n: number): string {
  return String.fromCharCode(65 + n);
}

// ─── Shared Styling Tokens ───────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
    background: #F8FAFC;
    color: #0F172A;
    padding: 0;
    line-height: 1.5;
  }
  .page {
    max-width: 820px;
    margin: 0 auto;
    background: #FFFFFF;
    padding: 40px 48px;
    min-height: 100vh;
  }
  @media print {
    body { background: #FFFFFF; }
    .page { padding: 24px 32px; width: 100%; max-width: 100%; min-height: auto; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; break-before: page; }
  }
  .student-header {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    border-bottom: 2px solid #0F172A;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .brand-badge {
    display: inline-block;
    background: #EEF2FF;
    color: #4F46E5;
    font-size: 11px;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 6px;
    margin-bottom: 10px;
    letter-spacing: 0.5px;
  }
  .quiz-title {
    font-size: 24px;
    font-weight: 800;
    color: #0F172A;
    margin-bottom: 6px;
    letter-spacing: -0.3px;
  }
  .meta-row {
    font-size: 12px;
    font-weight: 500;
    color: #64748B;
    margin-bottom: 24px;
    padding-bottom: 14px;
    border-bottom: 1px dashed #CBD5E1;
  }
  .score-banner {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: #166534;
    font-weight: 600;
  }
  .q-block {
    margin-bottom: 22px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .q-prompt {
    font-size: 15px;
    font-weight: 700;
    color: #0F172A;
    line-height: 1.45;
    margin-bottom: 10px;
  }
  .opt-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .opt {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #334155;
    padding: 2px 0;
  }
  .opt-bubble {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid #64748B;
    display: inline-block;
    flex-shrink: 0;
  }
  .fill-line {
    margin-top: 8px;
    font-size: 14px;
    color: #64748B;
    border-bottom: 1.5px solid #94A3B8;
    width: 80%;
    padding-bottom: 4px;
  }
  .answer-key-section {
    margin-top: 36px;
    padding-top: 24px;
    border-top: 2px dashed #0F172A;
  }
  .answer-key-title {
    font-size: 18px;
    font-weight: 800;
    color: #0F172A;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .key-item {
    font-size: 13px;
    color: #1E293B;
    margin-bottom: 10px;
    padding: 10px 14px;
    background: #F8FAFC;
    border-left: 3.5px solid #4F46E5;
    border-radius: 6px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .print-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: #4F46E5;
    color: #FFFFFF;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
  }
`;

// ─── PDF HTML Generator ─────────────────────────────────────────────────────

function generatePdfHtml(quiz: Quiz, attempt?: QuizAttempt | null, options?: ExportOptions): string {
  const includeAnswers = options?.includeAnswerKey !== false;
  const includeScore = Boolean(options?.includeStudentScore !== false && attempt);
  const quizTitle = sanitizeTitle(quiz.title, quiz.sourceDocName, 'Study Quiz');

  let studentQuestionsHtml = '';
  quiz.questions.forEach((q, idx) => {
    let choicesMarkup = '';
    if (q.type === 'enumeration') {
      choicesMarkup = `<div class="fill-line">Answer: </div>`;
    } else if (q.type === 'true_false') {
      choicesMarkup = `
        <div style="display:flex;gap:32px;margin:8px 0;">
          <span class="opt"><span class="opt-bubble"></span> True</span>
          <span class="opt"><span class="opt-bubble"></span> False</span>
        </div>`;
    } else {
      const opts = q.options && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];
      const listItems = opts.map((opt, oIdx) => `
        <li class="opt">
          <span class="opt-bubble"></span>
          <span><strong>${letterOf(oIdx)}.</strong> ${escapeXml(opt)}</span>
        </li>
      `).join('');
      choicesMarkup = `<ul class="opt-list">${listItems}</ul>`;
    }

    studentQuestionsHtml += `
      <div class="q-block">
        <div class="q-prompt">${idx + 1}. ${escapeXml(q.prompt)}</div>
        ${choicesMarkup}
      </div>`;
  });

  let answerKeyHtml = '';
  if (includeAnswers) {
    quiz.questions.forEach((q, idx) => {
      let correctText = '';
      if (q.type === 'enumeration') {
        correctText = String(q.correctAnswer || '');
      } else if (typeof q.correctAnswer === 'number') {
        const letter = letterOf(q.correctAnswer);
        const optText = q.options?.[q.correctAnswer] || '';
        correctText = `${letter}. ${optText}`;
      } else {
        correctText = String(q.correctAnswer || '');
      }

      answerKeyHtml += `
        <div class="key-item">
          <strong>Q${idx + 1}: ${escapeXml(correctText)}</strong>
          ${q.explanation ? `<div style="margin-top:4px;color:#475569;font-size:12px;"><strong>Note:</strong> ${escapeXml(q.explanation)}</div>` : ''}
        </div>`;
    });
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeXml(quizTitle)} — Smarty AI Study Guide</title>
  <style>${CSS}</style>
</head>
<body>
<div class="page">
  <div class="student-header">
    <div><strong>Name:</strong> ____________________________________</div>
    <div><strong>Date:</strong> _______________</div>
    <div><strong>Score:</strong> ______ / ${quiz.questionsCount || quiz.questions.length}</div>
  </div>

  <span class="brand-badge">SMARTY AI QUIZ</span>
  <h1 class="quiz-title">${escapeXml(quizTitle)}</h1>
  <div class="meta-row">
    Subject / Category: ${escapeXml(quiz.category || 'General Knowledge')} &nbsp;|&nbsp; 
    Difficulty: ${String(quiz.difficulty || 'medium').toUpperCase()} &nbsp;|&nbsp; 
    Total Questions: ${quiz.questionsCount || quiz.questions.length}
  </div>

  ${includeScore && attempt ? `
    <div class="score-banner">
      <span>Completed Assessment Score: <strong>${attempt.score} / ${attempt.totalQuestions} (${attempt.percentage}%)</strong></span>
      <span>XP Earned: +${attempt.earnedXP || 250} XP</span>
    </div>
  ` : ''}

  <!-- Student Question Sheet -->
  ${studentQuestionsHtml}

  ${includeAnswers ? `
    <!-- Page Break for Answer Key Section -->
    <div class="page-break answer-key-section">
      <div class="answer-key-title">🔑 ANSWER KEY & EXPLANATIONS (Study Reference)</div>
      ${answerKeyHtml}
    </div>
  ` : ''}

  <div class="no-print" style="text-align:center;padding:28px 0;">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
</div>
<script>
  if (window.location.search.includes('print=true')) {
    window.onload = function() { setTimeout(function(){ window.print(); }, 700); };
  }
</script>
</body>
</html>`;
}

// ─── Word (.docx HTML Generator) ─────────────────────────────────────────────

function generateDocxHtml(quiz: Quiz, attempt?: QuizAttempt | null, options?: ExportOptions): string {
  const includeAnswers = options?.includeAnswerKey !== false;
  const includeScore = Boolean(options?.includeStudentScore !== false && attempt);
  const quizTitle = sanitizeTitle(quiz.title, quiz.sourceDocName, 'Study Quiz');

  let questionsHtml = '';
  quiz.questions.forEach((q, idx) => {
    let choicesMarkup = '';
    if (q.type === 'enumeration') {
      choicesMarkup = `<p style="margin:8px 0 8px 18px;font-size:13px;color:#475569;">Answer: ____________________________________________________</p>`;
    } else if (q.type === 'true_false') {
      choicesMarkup = `<p style="margin:6px 0 6px 18px;font-size:13px;color:#334155;">( &nbsp; ) True &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp; ) False</p>`;
    } else {
      const opts = q.options && q.options.length > 0 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'];
      choicesMarkup = opts.map((opt, oIdx) => `
        <p style="margin:4px 0 4px 18px;font-size:13px;color:#334155;">
          ( &nbsp; ) <strong>${letterOf(oIdx)}.</strong> ${escapeXml(opt)}
        </p>
      `).join('');
    }

    questionsHtml += `
      <div style="margin-bottom:18px;">
        <p style="font-size:14px;font-weight:bold;color:#0F172A;margin-bottom:6px;">${idx + 1}. ${escapeXml(q.prompt)}</p>
        ${choicesMarkup}
      </div>`;
  });

  let answerKeyHtml = '';
  if (includeAnswers) {
    quiz.questions.forEach((q, idx) => {
      let correctText = '';
      if (q.type === 'enumeration') {
        correctText = String(q.correctAnswer || '');
      } else if (typeof q.correctAnswer === 'number') {
        const letter = letterOf(q.correctAnswer);
        const optText = q.options?.[q.correctAnswer] || '';
        correctText = `${letter}. ${optText}`;
      } else {
        correctText = String(q.correctAnswer || '');
      }

      answerKeyHtml += `
        <p style="font-size:12px;margin-bottom:6px;color:#1E293B;">
          <strong>Q${idx + 1}: ${escapeXml(correctText)}</strong>
          ${q.explanation ? `<br/><span style="color:#64748B;font-size:11px;">Explanation: ${escapeXml(q.explanation)}</span>` : ''}
        </p>`;
    });
  }

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
         xmlns:w="urn:schemas-microsoft-com:office:word"
         xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${escapeXml(quizTitle)}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: 'Arial', sans-serif; margin: 40px; color: #0F172A; }
    h1 { color: #0F172A; font-size: 20px; border-bottom: 2px solid #0F172A; padding-bottom: 6px; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div style="border-bottom:1px solid #CBD5E1;padding-bottom:10px;margin-bottom:16px;">
    <p style="font-size:13px;color:#475569;">
      <strong>Name:</strong> ____________________________________ &nbsp;&nbsp;&nbsp;&nbsp;
      <strong>Date:</strong> _______________ &nbsp;&nbsp;&nbsp;&nbsp;
      <strong>Score:</strong> ______ / ${quiz.questionsCount || quiz.questions.length}
    </p>
  </div>

  <h1>${escapeXml(quizTitle)}</h1>
  <p style="font-size:12px;color:#64748B;margin-bottom:20px;">
    Category: ${escapeXml(quiz.category || 'General')} &nbsp;|&nbsp; Difficulty: ${String(quiz.difficulty || 'medium').toUpperCase()}
  </p>

  ${includeScore && attempt ? `
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;padding:8px 12px;margin-bottom:16px;font-size:12px;color:#166534;">
      <strong>Assessment Score:</strong> ${attempt.score} / ${attempt.totalQuestions} (${attempt.percentage}%)
    </div>
  ` : ''}

  ${questionsHtml}

  ${includeAnswers ? `
    <br/><br/>
    <div style="page-break-before:always;border-top:2px dashed #0F172A;padding-top:16px;">
      <h2 style="font-size:16px;color:#0F172A;margin-bottom:10px;">🔑 ANSWER KEY (Study Reference)</h2>
      ${answerKeyHtml}
    </div>
  ` : ''}
</body>
</html>`;
}

// ─── Public Export Service ───────────────────────────────────────────────────

export const exportService = {
  async exportQuiz(quiz: Quiz, format: ExportFormat, attempt?: QuizAttempt | null, options?: ExportOptions): Promise<void> {
    const baseName = safeFilename(quiz.title);
    const filename = `${baseName}_Quiz.${format}`;

    try {
      if (Platform.OS === 'web') {
        // ── Web Export ────────────────────────────────────────────────────────
        if (format === 'pdf') {
          const html = generatePdfHtml(quiz, attempt, options);
          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const win = window.open(`${url}?print=true`, '_blank');
          if (!win) {
            this.triggerDownload(filename.replace('.pdf', '.html'), blob);
          }
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        } else if (format === 'docx') {
          const html = generateDocxHtml(quiz, attempt, options);
          const blob = new Blob([html], {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          });
          this.triggerDownload(filename, blob);
        }
      } else {
        // ── Mobile Native Export (iOS & Android) ─────────────────────────────
        if (format === 'pdf') {
          const html = generatePdfHtml(quiz, attempt, options);
          const { uri } = await Print.printToFileAsync({ html });
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: `Export "${quiz.title}" PDF`,
              UTI: 'com.adobe.pdf',
            });
          }
        } else if (format === 'docx') {
          const html = generateDocxHtml(quiz, attempt, options);
          const fileUri = `${FileSystem.cacheDirectory}${filename}`;
          await FileSystem.writeAsStringAsync(fileUri, html, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              dialogTitle: `Export "${quiz.title}" Word Document`,
              UTI: 'org.openxmlformats.wordprocessingml.document',
            });
          }
        }
      }
    } catch (e: any) {
      console.warn('[exportService] Error exporting quiz:', e);
      throw new Error(e?.message || 'Export generation failed.');
    }
  },

  triggerDownload(filename: string, blob: Blob) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  },
};
