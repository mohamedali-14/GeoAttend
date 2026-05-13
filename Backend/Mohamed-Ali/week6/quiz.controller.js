// src/controllers/quiz.controller.js
const { db } = require('../config/firebase');
const { generateQuizFromPDF, getStudentQuiz, submitQuizAnswers, getQuizAnalytics } = require('../services/deepseek.service');
const { uploadBuffer } = require('../services/storage.service');

async function uploadLectureAndGenerateQuiz(req, res) {
    try {
        const { sessionId } = req.params;
        const { professorId } = req.body;
        const pdfFile = req.file;

        if (!pdfFile) return res.status(400).json({ success: false, error: 'No PDF file uploaded' });

        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) return res.status(404).json({ success: false, error: 'Session not found' });
        if (sessionDoc.data().professorId !== professorId) return res.status(403).json({ success: false, error: 'Unauthorized' });

        const quizEnabled = sessionDoc.data().verificationSettings?.quizEnabled || false;
        if (!quizEnabled) return res.status(400).json({ success: false, error: 'Quiz not enabled for this session' });

        const fileName = `lectures/${sessionId}/lecture_${Date.now()}.pdf`;
        const pdfUrl = await uploadBuffer(pdfFile.buffer, fileName, 'application/pdf');

        await db.collection('sessionLectures').add({
            sessionId, fileName, pdfUrl, uploadedAt: new Date(), uploadedBy: professorId
        });

        const quiz = await generateQuizFromPDF(sessionId, pdfFile.buffer);

        await db.collection('sessions').doc(sessionId).update({
            'verificationSettings.quizGenerated': true, 'verificationSettings.quizId': quiz.quizId
        });

        res.status(200).json({ success: true, message: 'Quiz generated successfully', quizId: quiz.quizId, pdfUrl });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

async function getQuiz(req, res) {
    try {
        const { sessionId } = req.params;
        const { studentId } = req.query;
        const quiz = await getStudentQuiz(sessionId, studentId);
        res.status(200).json({ success: true, data: quiz });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
}

async function submitQuiz(req, res) {
    try {
        const { sessionId, studentId, answers } = req.body;
        const result = await submitQuizAnswers(sessionId, studentId, answers);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
}

async function getQuizAnalyticsEndpoint(req, res) {
    try {
        const { sessionId } = req.params;
        const { professorId } = req.query;
        const analytics = await getQuizAnalytics(sessionId, professorId);
        res.status(200).json({ success: true, data: analytics });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
}

module.exports = { uploadLectureAndGenerateQuiz, getQuiz, submitQuiz, getQuizAnalyticsEndpoint };