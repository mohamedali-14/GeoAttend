// src/modules/ai/ai.controller.js
const axios = require('axios');

// Gemini API key (free tier - same one the mobile app uses)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyC9Xo2n8s1mLh3Zt5v9Qe7r8u6w4y2z1';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * POST /api/ai/generate-quiz
 * Body: multipart/form-data  { pdf: File, count?: number }
 */
async function generateQuizFromPDFBuffer(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No PDF file uploaded.' });
    }

    const count = Math.min(parseInt(req.body.count) || 5, 10);

    // ── Extract text from PDF ─────────────────────────────────────────────────
    let pdfText = '';
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(req.file.buffer);
      pdfText = (data.text || '').trim();
    } catch (e) {
      console.warn('[ai] pdf-parse failed:', e.message);
    }

    // If text too short, try raw buffer extraction
    if (!pdfText || pdfText.length < 30) {
      try {
        const raw = req.file.buffer.toString('utf8');
        const cleaned = raw
          .replace(/[^\x20-\x7E\u0600-\u06FF\u0020\n\r\t ]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (cleaned.length > 80) {
          pdfText = cleaned.substring(0, 10000);
        }
      } catch (_) {}
    }

    // Clean any remaining garbled characters from pdfText
    pdfText = (pdfText || '')
      .replace(/[^\x20-\x7E\u0600-\u06FF\n\r\t ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const topicHint = (req.file.originalname || 'lecture')
      .replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');

    // ── Try AI providers in order ─────────────────────────────────────────────
    let questions = null;
    let lastError = '';

    // 1. Try Gemini (free, same as mobile)
    const geminiKey = process.env.GEMINI_API_KEY;
    const isRealGeminiKey = geminiKey && geminiKey.startsWith('AIza') && geminiKey.length > 30 && geminiKey !== 'AIzaSyC9Xo2n8s1mLh3Zt5v9Qe7r8u6w4y2z1';
    if (isRealGeminiKey) {
      try {
        questions = await callGemini(pdfText, topicHint, count, geminiKey);
      } catch (e) {
        lastError = e.message;
        console.warn('[ai] Gemini failed:', e.message);
      }
    } else {
      console.log('[ai] Gemini skipped (no valid key), trying next provider...');
    }

    // 2. Try Anthropic
    if (!questions && process.env.ANTHROPIC_API_KEY) {
      try {
        questions = await callAnthropic(pdfText, topicHint, count, process.env.ANTHROPIC_API_KEY);
      } catch (e) {
        lastError = e.message;
        console.warn('[ai] Anthropic failed:', e.message);
      }
    }

    // 3. Try DeepSeek
    if (!questions && process.env.DEEPSEEK_API_KEY) {
      try {
        questions = await callDeepSeek(pdfText, topicHint, count, process.env.DEEPSEEK_API_KEY);
      } catch (e) {
        lastError = e.message;
        console.warn('[ai] DeepSeek failed:', e.message);
      }
    }

    if (!questions) {
      // Ultimate fallback: generate questions locally from the PDF text
      try {
        questions = generateLocalQuestions(pdfText, topicHint, count);
        if (questions && questions.length > 0) {
          return res.json({ success: true, questions, source: 'local_fallback' });
        }
      } catch (le) {
        console.warn('[ai] Local generation failed:', le.message);
      }
      return res.status(500).json({
        success: false,
        error: 'All AI providers failed. Last error: ' + lastError + '. Please set a valid GEMINI_API_KEY in backend .env file.'
      });
    }

    return res.json({ success: true, questions });

  } catch (err) {
    console.error('[ai] error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}

// ── Gemini ─────────────────────────────────────────────────────────────────
async function callGemini(text, topicHint, count, apiKey) {
  const prompt = buildPrompt(text, topicHint, count);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const resp = await axios.post(url, {
    contents: [{ parts: [{ text: prompt }] }]
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  });

  const raw = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!raw) throw new Error('Gemini returned empty response');
  return parseQuestions(raw);
}

// ── Anthropic ──────────────────────────────────────────────────────────────
async function callAnthropic(text, topicHint, count, apiKey) {
  const resp = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: buildPrompt(text, topicHint, count) }]
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      timeout: 30000
    }
  );
  const raw = resp.data.content?.find(c => c.type === 'text')?.text || '';
  return parseQuestions(raw);
}

// ── DeepSeek ───────────────────────────────────────────────────────────────
async function callDeepSeek(text, topicHint, count, apiKey) {
  const resp = await axios.post(
    'https://api.deepseek.com/v1/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: buildPrompt(text, topicHint, count) }],
      temperature: 0.7,
      max_tokens: 2000
    },
    { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 }
  );
  const raw = resp.data.choices[0].message.content || '';
  return parseQuestions(raw);
}

// ── Prompt ─────────────────────────────────────────────────────────────────
function buildPrompt(text, topicHint, count) {
  const hasContent = text && text.length > 50;
  const contentSection = hasContent
    ? `Lecture content:\n${text.substring(0, 12000)}`
    : `Topic: "${topicHint}" — use your academic knowledge to generate relevant questions.`;

  return `You are a university professor. Generate exactly ${count} multiple-choice questions.

${contentSection}

STRICT OUTPUT FORMAT — return ONLY a JSON array, nothing else:
[{"text":"question?","options":["A","B","C","D"],"correct":"exact option text","points":25}]

Rules:
- Exactly 4 options per question
- "correct" must be copied exactly from one of the options
- No markdown, no backticks, no explanation — JSON array only`;
}

// ── Parse ──────────────────────────────────────────────────────────────────
function parseQuestions(raw) {
  let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const start = clean.indexOf('[');
  const end   = clean.lastIndexOf(']');
  if (start !== -1 && end !== -1) clean = clean.substring(start, end + 1);

  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed) || parsed.length === 0)
    throw new Error('AI returned no questions.');

  return parsed.map((q, i) => ({
    id:      'AI_Q_' + Date.now() + '_' + i,
    text:    String(q.text || q.question || ''),
    options: Array.isArray(q.options) ? q.options.map(String) : ['', '', '', ''],
    correct: String(q.correct || q.answer || ''),
    points:  Number(q.points) || 25
  }));
}

// ── Local Fallback Generator (no AI needed) ────────────────────────────────
function generateLocalQuestions(text, topicHint, count) {
  const topic = topicHint || 'the subject';
  const sentences = (text || '')
    .replace(/\n+/g, ' ')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 40 && s.length < 300 && /[a-zA-Z\u0600-\u06FF]{3,}/.test(s));

  const questions = [];
  for (let i = 0; i < Math.min(count, 10); i++) {
    const sentence = sentences[i % sentences.length];
    const words = sentence ? sentence.split(/\s+/).filter(w => w.length > 4) : [];
    const keyword = words[Math.floor(words.length / 2)] || topic;
    questions.push({
      id: 'LQ_' + Date.now() + '_' + i,
      text: sentence
        ? `Which of the following best describes: "${sentence.slice(0, 80)}..."?`
        : `What is the main concept related to "${topic}" in this lecture?`,
      options: [
        `It refers to the core principle of ${keyword}`,
        `It is an unrelated concept from a different field`,
        `It contradicts the main theory discussed`,
        `It is a secondary detail with no major impact`,
      ],
      correct: `It refers to the core principle of ${keyword}`,
      points: 25,
    });
  }
  return questions;
}

module.exports = { generateQuizFromPDFBuffer };
