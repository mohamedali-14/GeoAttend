// src/controllers/quiz.controller.js
// COMPLETE VERSION - AI Quiz Generation and Management

const { db, admin } = require('../config/firebase');
const { generateQuizFromPDF, getStudentQuiz, submitQuizAnswers, getQuizAnalytics } = require('../services/deepseek.service');
const { uploadBuffer } = require('../services/storage.service');

/**
 * Upload a lecture PDF and generate AI-powered quiz questions
 * POST /api/quiz/sessions/:sessionId/upload-lecture
 * Access: PROFESSOR only
 */
async function uploadLectureAndGenerateQuiz(req, res) {
    try {
        const { sessionId } = req.params;
        const { professorId } = req.body;
        const pdfFile = req.file;

        // Validate file upload
        if (!pdfFile) {
            return res.status(400).json({ 
                success: false, 
                error: 'No PDF file uploaded. Please upload a valid PDF file.' 
            });
        }

        // Validate file type
        if (pdfFile.mimetype !== 'application/pdf') {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid file type. Only PDF files are allowed.' 
            });
        }

        // Get session details
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return res.status(404).json({ 
                success: false, 
                error: 'Session not found' 
            });
        }

        const sessionData = sessionDoc.data();

        // Verify professor authorization
        if (sessionData.professorId !== professorId) {
            return res.status(403).json({ 
                success: false, 
                error: 'Unauthorized: You do not have permission to modify this session.' 
            });
        }

        // Check if quiz is enabled for this session
        const quizEnabled = sessionData.verificationSettings?.quizEnabled || false;
        if (!quizEnabled) {
            return res.status(400).json({ 
                success: false, 
                error: 'Quiz is not enabled for this session. Please enable quiz in session settings first.' 
            });
        }

        // Check if quiz already exists for this session
        if (sessionData.verificationSettings?.quizGenerated) {
            return res.status(400).json({ 
                success: false, 
                error: 'A quiz has already been generated for this session. You cannot generate another one.' 
            });
        }

        // Upload PDF to storage
        const fileName = `lectures/${sessionId}/lecture_${Date.now()}.pdf`;
        const pdfUrl = await uploadBuffer(pdfFile.buffer, fileName, 'application/pdf');

        // Store lecture record
        await db.collection('sessionLectures').add({
            sessionId,
            fileName,
            pdfUrl,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            uploadedBy: professorId,
            originalName: pdfFile.originalname,
            fileSize: pdfFile.size
        });

        // Generate quiz from PDF using DeepSeek AI
        const quiz = await generateQuizFromPDF(sessionId, pdfFile.buffer);

        // Update session with quiz information
        await db.collection('sessions').doc(sessionId).update({
            'verificationSettings.quizGenerated': true,
            'verificationSettings.quizId': quiz.quizId,
            'verificationSettings.quizGeneratedAt': admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log quiz generation activity
        await db.collection('quizGenerationLogs').add({
            sessionId,
            professorId,
            quizId: quiz.quizId,
            questionsCount: quiz.questions.length,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Quiz generated successfully for session ${sessionId} by professor ${professorId}`);

        res.status(200).json({ 
            success: true, 
            message: 'Lecture uploaded and quiz generated successfully!',
            quizId: quiz.quizId,
            questionsCount: quiz.questions.length,
            pdfUrl 
        });

    } catch (error) {
        console.error('Error in uploadLectureAndGenerateQuiz:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to generate quiz. Please try again.' 
        });
    }
}

/**
 * Get quiz questions for a student
 * GET /api/quiz/:sessionId?studentId=xxx
 * Access: STUDENT only
 */
async function getQuiz(req, res) {
    try {
        const { sessionId } = req.params;
        const { studentId } = req.query;

        // Validate required fields
        if (!sessionId || !studentId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Session ID and Student ID are required.' 
            });
        }

        // Get quiz for student
        const quiz = await getStudentQuiz(sessionId, studentId);

        // Log quiz access
        await db.collection('quizAccessLogs').add({
            sessionId,
            studentId,
            accessedAt: admin.firestore.FieldValue.serverTimestamp(),
            alreadySubmitted: quiz.alreadySubmitted || false
        });

        res.status(200).json({ 
            success: true, 
            data: quiz 
        });

    } catch (error) {
        console.error('Error in getQuiz:', error);
        
        // Handle specific error messages
        if (error.message === 'Must mark attendance first') {
            return res.status(403).json({ 
                success: false, 
                error: 'You must mark your attendance before taking the quiz.' 
            });
        }
        
        if (error.message === 'No active quiz found') {
            return res.status(404).json({ 
                success: false, 
                error: 'No active quiz found for this session. Please contact your professor.' 
            });
        }
        
        if (error.message === 'Quiz has expired') {
            return res.status(410).json({ 
                success: false, 
                error: 'This quiz has expired. You can no longer take it.' 
            });
        }

        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
}

/**
 * Submit quiz answers for grading
 * POST /api/quiz/submit
 * Access: STUDENT only
 */
async function submitQuiz(req, res) {
    try {
        const { sessionId, studentId, answers } = req.body;

        // Validate required fields
        if (!sessionId || !studentId || !answers) {
            return res.status(400).json({ 
                success: false, 
                error: 'Session ID, Student ID, and answers are required.' 
            });
        }

        // Validate answers array
        if (!Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Answers must be a non-empty array.' 
            });
        }

        // Submit and grade answers
        const result = await submitQuizAnswers(sessionId, studentId, answers);

        // Log quiz submission
        await db.collection('quizSubmissionLogs').add({
            sessionId,
            studentId,
            score: result.score,
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
            answersCount: answers.length
        });

        console.log(`📝 Quiz submitted for student ${studentId} in session ${sessionId} with score ${result.score}%`);

        res.status(200).json({ 
            success: true, 
            data: result,
            message: `Quiz submitted successfully! Your score: ${result.score}%`
        });

    } catch (error) {
        console.error('Error in submitQuiz:', error);

        if (error.message === 'Quiz already submitted') {
            return res.status(400).json({ 
                success: false, 
                error: 'You have already submitted this quiz. Multiple submissions are not allowed.' 
            });
        }

        if (error.message === 'No active quiz found') {
            return res.status(404).json({ 
                success: false, 
                error: 'No active quiz found for this session.' 
            });
        }

        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
}

/**
 * Get quiz analytics for professor
 * GET /api/quiz/sessions/:sessionId/analytics?professorId=xxx
 * Access: PROFESSOR only
 */
async function getQuizAnalyticsEndpoint(req, res) {
    try {
        const { sessionId } = req.params;
        const { professorId } = req.query;

        // Validate required fields
        if (!sessionId || !professorId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Session ID and Professor ID are required.' 
            });
        }

        // Get quiz analytics
        const analytics = await getQuizAnalytics(sessionId, professorId);

        res.status(200).json({ 
            success: true, 
            data: analytics 
        });

    } catch (error) {
        console.error('Error in getQuizAnalyticsEndpoint:', error);

        if (error.message === 'Unauthorized') {
            return res.status(403).json({ 
                success: false, 
                error: 'You are not authorized to view analytics for this session.' 
            });
        }

        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
}

/**
 * Get quiz results for a specific student (professor view)
 * GET /api/quiz/sessions/:sessionId/student/:studentId/results
 * Access: PROFESSOR only
 */
async function getStudentQuizResults(req, res) {
    try {
        const { sessionId, studentId } = req.params;
        const { professorId } = req.query;

        // Verify professor authorization
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        if (sessionDoc.data().professorId !== professorId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // Get student submission
        const submissionSnap = await db.collection('quizSubmissions')
            .where('sessionId', '==', sessionId)
            .where('studentId', '==', studentId)
            .limit(1)
            .get();

        if (submissionSnap.empty) {
            return res.status(404).json({ 
                success: false, 
                error: 'No quiz submission found for this student.' 
            });
        }

        const submission = submissionSnap.docs[0].data();

        // Get student details
        const studentDoc = await db.collection('users').doc(studentId).get();
        const studentName = studentDoc.exists ? studentDoc.data().fullName : 'Unknown';

        res.status(200).json({ 
            success: true, 
            data: {
                studentId,
                studentName,
                sessionId,
                score: submission.score,
                correctCount: submission.correctCount,
                totalQuestions: submission.totalQuestions,
                submittedAt: submission.submittedAt,
                results: submission.results
            }
        });

    } catch (error) {
        console.error('Error in getStudentQuizResults:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Get all quiz submissions for a session (professor view)
 * GET /api/quiz/sessions/:sessionId/submissions?professorId=xxx
 * Access: PROFESSOR only
 */
async function getAllQuizSubmissions(req, res) {
    try {
        const { sessionId } = req.params;
        const { professorId } = req.query;

        // Verify professor authorization
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        if (sessionDoc.data().professorId !== professorId) {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        // Get all submissions
        const submissionsSnap = await db.collection('quizSubmissions')
            .where('sessionId', '==', sessionId)
            .orderBy('score', 'desc')
            .get();

        const submissions = [];
        for (const doc of submissionsSnap.docs) {
            const data = doc.data();
            const studentDoc = await db.collection('users').doc(data.studentId).get();
            submissions.push({
                studentId: data.studentId,
                studentName: studentDoc.exists ? studentDoc.data().fullName : 'Unknown',
                score: data.score,
                correctCount: data.correctCount,
                totalQuestions: data.totalQuestions,
                submittedAt: data.submittedAt
            });
        }

        // Calculate statistics
        const scores = submissions.map(s => s.score);
        const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

        res.status(200).json({ 
            success: true, 
            data: {
                submissions,
                statistics: {
                    totalSubmissions: submissions.length,
                    averageScore: Math.round(averageScore),
                    highestScore,
                    lowestScore,
                    completionRate: submissions.length > 0 ? Math.round((submissions.length / (sessionDoc.data().studentsPresent || 1)) * 100) : 0
                }
            }
        });

    } catch (error) {
        console.error('Error in getAllQuizSubmissions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = { 
    uploadLectureAndGenerateQuiz, 
    getQuiz, 
    submitQuiz, 
    getQuizAnalyticsEndpoint,
    getStudentQuizResults,
    getAllQuizSubmissions
};