import { db } from '@/firebaseConfig';
import {
    collection, updateDoc, doc,
    query, where, onSnapshot, Timestamp
} from 'firebase/firestore';
import { QuizQuestion, QuizResult } from './types';
import * as FileSystem from 'expo-file-system/legacy';

const GEMINI_API_KEY = '';

export async function generateQuizWithAI(
    courseName: string,
    pdfUrl?: string,
): Promise<QuizQuestion[]> {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GEMINI_API_KEY;

    let prompt = ` أنت أستاذ جامعي وخبير أكاديمي. قم بتوليد 5 أسئلة اختيار من متعدد (MCQ) باللغة الانجليزية لمادة "${courseName}".\n${pdfUrl ? 'يجب أن تستخرج الأسئلة حصرياً من محتوى ملف الـ PDF المرفق.' : 'اعتمد على المعلومات الأكاديمية الدقيقة لهذه المادة.'}\n\nقواعد الإخراج (صارمة جداً):\n1. يجب أن يكون الرد عبارة عن مصفوفة JSON فقط تبدأ بـ [ وتنتهي بـ ].\n2. ممنوع كتابة أي كلمة خارج الأقواس.\n3. ممنوع استخدام علامات تنسيق Markdown.`;
    
    const parts: any[] = [];

    if (pdfUrl) {
        try {
            let localUri = pdfUrl;
            
            if (pdfUrl.startsWith('http')) {
                const tempPath = FileSystem.cacheDirectory + 'temp_quiz_' + Date.now() + '.pdf';
                const { uri, status } = await FileSystem.downloadAsync(pdfUrl, tempPath);
                
                if (status !== 200 && status !== 201 && status !== 304) {
                    throw new Error(`سيرفر Cloudinary يرفض التحميل. كود الخطأ: ${status}`);
                }
                localUri = uri; 
            }

            const fileInfo = await FileSystem.getInfoAsync(localUri);
            if (!fileInfo.exists || fileInfo.size < 100) {
                throw new Error("الملف المحفوظ فارغ تماماً (0 بايت).");
            }

            const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;
            const uploadResponse = await FileSystem.uploadAsync(uploadUrl, localUri, {
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                headers: {
                    'Content-Type': 'application/pdf',
                }
            });

            const uploadResult = JSON.parse(uploadResponse.body);

            if (uploadResult.error) {
                throw new Error("فشل رفع الملف الكبير لسيرفرات جوجل: " + uploadResult.error.message);
            }

            parts.push({
                file_data: {
                    mime_type: 'application/pdf',
                    file_uri: uploadResult.file.uri
                }
            });

        } catch (error: any) {
            throw new Error(error.message || "فشل في معالجة ملف الـ PDF.");
        }
    }

    parts.push({ 
        text: prompt + '\n\nهيكل الـ JSON المطلوب:\n[{"question":"نص السؤال؟","options":["أ","ب","ج","د"],"correctIndex":0}]' 
    });

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: parts }] })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || "خطأ من سيرفر جوجل.");
    }

    let resultText = data.candidates[0].content.parts[0].text;

    const firstBracket = resultText.indexOf('[');
    const lastBracket = resultText.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
        resultText = resultText.substring(firstBracket, lastBracket + 1);
    }
    resultText = resultText.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();

    try {
        const questions = JSON.parse(resultText) as QuizQuestion[];
        return questions;
    } catch (parseError) {
        throw new Error("جوجل أرجع نصاً غير صالح: " + resultText.substring(0, 50));
    }
}

export async function saveQuizToSession(
    sessionId: string,
    questions: QuizQuestion[],
): Promise<void> {
    await updateDoc(doc(db, 'sessions', sessionId), {
        quizQuestions: questions,
        quizActive:    false,
        quizCreatedAt: Timestamp.now(),
    });
}

export async function activateQuiz(sessionId: string): Promise<void> {
    await updateDoc(doc(db, 'sessions', sessionId), {
        quizActive:      true,
        quizActivatedAt: Timestamp.now(),
    });
}

export async function deactivateQuiz(sessionId: string): Promise<void> {
    await updateDoc(doc(db, 'sessions', sessionId), {
        quizActive: false,
    });
}

export function subscribeToQuizResults(
    sessionId: string,
    callback: (results: QuizResult[]) => void,
): () => void {
    const q = query(
        collection(db, 'quizResults'),
        where('sessionId', '==', sessionId),
    );
    return onSnapshot(q, (snap) => {
        return callback(
            snap.docs.map((d) => ({
                id: d.id,
                studentId: d.data().studentId || '',
                studentName: d.data().studentName || 'Unknown',
                sessionId: d.data().sessionId || '',
                courseId: d.data().courseId || '',
                answers: d.data().answers || [],
                score: d.data().score || 0,
                submittedAt: d.data().submittedAt || '',
            }))
        );
    });
}

export function buildExportText(
    sessionName: string,
    questions: QuizQuestion[],
    results: QuizResult[],
): string {
    const avg = results.length > 0
        ? (results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(1)
        : '0';

    let text = `نتائج اختبار: ${sessionName}\n`;
    text    += `عدد المتقدمين: ${results.length} | المتوسط: ${avg}/10\n`;
    text    += '─────────────────────────────\n';

    results
        .sort((a, b) => b.score - a.score)
        .forEach((r, i) => { text += `${i + 1}. ${r.studentName} — ${r.score}/10\n`; });

    text += '\n─────────────────────────────\n';
    text += 'الأسئلة والإجابات الصحيحة:\n\n';

    questions.forEach((q, i) => {
        text += `س${i + 1}: ${q.question}\n`;
        text += `✓ ${q.options[q.correctIndex]}\n\n`;
    });

    return text;
}