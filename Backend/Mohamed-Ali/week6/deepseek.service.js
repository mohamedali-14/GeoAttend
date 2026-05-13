// src/services/deepseek.service.js
const { db, admin } = require('../config/firebase');
const axios = require('axios');
const { extractTextFromPDF } = require('./pdf-parser.service');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function generateQuizFromPDF(sessionId, pdfBuffer) {
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        const session = sessionDoc.data();

        if (!session.verificationSettings?.quizEnabled) {
            throw new Error('Quiz is not enabled for this session');
        }

        const extractedText = await extractTextFromPDF(pdfBuffer);
        if (!extractedText || extractedText.length < 100) {
            throw new Error('Could not extract sufficient text from PDF');
        }

        const truncatedText = extractedText.substring(0, 12000);

        const prompt = `Generate exactly 10 multiple-choice questions from this lecture content: "${truncatedText}"

Return JSON format: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "..."}]}`;

        const response = await axios.post(DEEPSEEK_API_URL, {
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7, max_tokens: 4000
        }, { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` } });

        const aiResponse = response.data.choices[0].message.content;
        let quizData = JSON.parse(aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, ''));

        const quizRef = await db.collection('quizzes').add({
            sessionId, questions: quizData.questions,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: getQuizExpiration(), isActive: true,
            totalSubmissions: 0, averageScore: 0
        });

        return { quizId: quizRef.id, questions: quizData.questions };
    } catch (error) {
        console.error('Error generating quiz:', error);
        throw error;
    }
}

async function getStudentQuiz(sessionId, studentId) {
    try {
        const attendanceCheck = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .where('studentId', '==', studentId).limit(1).get();

        if (attendanceCheck.empty) throw new Error('Must mark attendance first');

        const existingSubmission = await db.collection('quizSubmissions')
            .where('sessionId', '==', sessionId)
            .where('studentId', '==', studentId).limit(1).get();

        if (!existingSubmission.empty) {
            const sub = existingSubmission.docs[0].data();
            return { alreadySubmitted: true, score: sub.score, totalQuestions: sub.totalQuestions };
        }

        const quizSnap = await db.collection('quizzes')
            .where('sessionId', '==', sessionId)
            .where('isActive', '==', true).limit(1).get();

        if (quizSnap.empty) throw new Error('No active quiz found');

        const quiz = quizSnap.docs[0];
        const quizData = quiz.data();

        if (quizData.expiresAt && quizData.expiresAt.toDate() < new Date()) {
            throw new Error('Quiz has expired');
        }

        const questionsForStudent = quizData.questions.map((q, idx) => ({
            id: idx, question: q.question, options: q.options
        }));

        return { quizId: quiz.id, questions: questionsForStudent, totalQuestions: questionsForStudent.length };
    } catch (error) {
        console.error('Error getting student quiz:', error);
        throw error;
    }
}

async function submitQuizAnswers(sessionId, studentId, answers) {
    try {
        const existingSubmission = await db.collection('quizSubmissions')
            .where('sessionId', '==', sessionId)
            .where('studentId', '==', studentId).limit(1).get();

        if (!existingSubmission.empty) throw new Error('Quiz already submitted');

        const quizSnap = await db.collection('quizzes')
            .where('sessionId', '==', sessionId)
            .where('isActive', '==', true).limit(1).get();

        if (quizSnap.empty) throw new Error('No active quiz found');

        const quiz = quizSnap.docs[0];
        const questions = quiz.data().questions;

        let score = 0;
        const results = [];
        for (let i = 0; i < questions.length; i++) {
            const isCorrect = answers[i] === questions[i].correctAnswer;
            if (isCorrect) score++;
            results.push({
                questionId: i, question: questions[i].question,
                studentAnswer: answers[i], correctAnswer: questions[i].correctAnswer,
                isCorrect, explanation: questions[i].explanation
            });
        }

        const percentageScore = (score / questions.length) * 100;

        await db.collection('quizSubmissions').add({
            sessionId, studentId, quizId: quiz.id, answers, results,
            score: percentageScore, correctCount: score, totalQuestions: questions.length,
            submittedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const newTotal = (quiz.data().totalSubmissions || 0) + 1;
        const newAvg = ((quiz.data().averageScore || 0) * (quiz.data().totalSubmissions || 0) + percentageScore) / newTotal;
        await db.collection('quizzes').doc(quiz.id).update({ totalSubmissions: newTotal, averageScore: newAvg });

        return { score: percentageScore, correctCount: score, totalQuestions: questions.length, results };
    } catch (error) {
        console.error('Error submitting quiz:', error);
        throw error;
    }
}

async function getQuizAnalytics(sessionId, professorId) {
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (sessionDoc.data().professorId !== professorId) throw new Error('Unauthorized');

        const quizSnap = await db.collection('quizzes')
            .where('sessionId', '==', sessionId).limit(1).get();

        if (quizSnap.empty) return { quizGenerated: false };

        const quiz = quizSnap.docs[0];
        const quizData = quiz.data();
        const submissionsSnap = await db.collection('quizSubmissions')
            .where('sessionId', '==', sessionId).get();

        const submissions = submissionsSnap.docs.map(d => d.data());
        const scores = submissions.map(s => s.score);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        const questionPerformance = [];
        for (let i = 0; i < quizData.questions.length; i++) {
            let correctCount = 0;
            for (const sub of submissions) {
                if (sub.results && sub.results[i]?.isCorrect) correctCount++;
            }
            questionPerformance.push({
                question: quizData.questions[i].question,
                correctRate: submissions.length > 0 ? (correctCount / submissions.length) * 100 : 0
            });
        }

        return {
            quizGenerated: true, quizId: quiz.id,
            summary: { totalSubmissions: submissions.length, averageScore: Math.round(avgScore) },
            questionPerformance, generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting quiz analytics:', error);
        throw error;
    }
}

function getQuizExpiration() {
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    return admin.firestore.Timestamp.fromDate(expires);
}

module.exports = { generateQuizFromPDF, getStudentQuiz, submitQuizAnswers, getQuizAnalytics };