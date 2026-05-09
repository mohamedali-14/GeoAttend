// src/services/advanced-report.service.js
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { db, admin } = require('../../config/firebase');
const { getAttendanceStats, getStudentEngagement } = require('./analytics.service');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Build custom report with selected fields
 * @param {Object} options - Report options
 * @returns {Promise<Object>} - Custom report data
 */
async function buildCustomReport({ courseId, professorId, fields = [], dateRange = {}, filters = {} }) {
    try {
        let sessionsQuery = db.collection('sessions');
        if (courseId) sessionsQuery = sessionsQuery.where('courseId', '==', courseId);
        if (professorId) sessionsQuery = sessionsQuery.where('professorId', '==', professorId);
        if (dateRange.start) sessionsQuery = sessionsQuery.where('scheduledDate', '>=', dateRange.start);
        if (dateRange.end) sessionsQuery = sessionsQuery.where('scheduledDate', '<=', dateRange.end);

        const sessionsSnapshot = await sessionsQuery.get();
        const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const reportData = {
            generatedAt: new Date().toISOString(),
            filters: { courseId, professorId, dateRange, filters },
            sessions: []
        };

        for (const session of sessions) {
            const sessionData = {};
            for (const field of fields) {
                switch (field) {
                    case 'sessionTitle':
                        sessionData.title = session.title;
                        break;
                    case 'sessionDate':
                        sessionData.date = session.scheduledDate;
                        break;
                    case 'attendanceRate':
                        const enrollments = await db.collection('enrollments')
                            .where('courseId', '==', session.courseId)
                            .where('status', '==', 'ACTIVE').get();
                        const attendance = await db.collection('attendance')
                            .where('sessionId', '==', session.id)
                            .where('status', '==', 'PRESENT').get();
                        sessionData.attendanceRate = enrollments.size > 0 ? (attendance.size / enrollments.size) * 100 : 0;
                        break;
                    case 'presentCount':
                        const presentCount = await db.collection('attendance')
                            .where('sessionId', '==', session.id)
                            .where('status', '==', 'PRESENT').get();
                        sessionData.presentCount = presentCount.size;
                        break;
                    case 'quizEnabled':
                        sessionData.quizEnabled = session.verificationSettings?.quizEnabled || false;
                        break;
                }
            }
            reportData.sessions.push(sessionData);
        }
        return reportData;
    } catch (error) {
        console.error('Error building custom report:', error);
        throw error;
    }
}

/**
 * Schedule automated reports
 * @param {Object} scheduleConfig - Schedule configuration
 * @returns {Promise<string>} - Schedule ID
 */
async function scheduleReport({ name, professorId, type, schedule, recipients, format = 'pdf', filters = {} }) {
    try {
        const scheduleRef = await db.collection('scheduledReports').add({
            name, professorId, type, schedule, recipients, format, filters,
            isActive: true, lastRun: null, nextRun: calculateNextRun(schedule),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return scheduleRef.id;
    } catch (error) {
        console.error('Error scheduling report:', error);
        throw error;
    }
}

/**
 * Generate comparative report between periods
 * @param {Object} options - Comparison options
 * @returns {Promise<Object>} - Comparative report
 */
async function generateComparativeReport({ courseId, period1 = {}, period2 = {}, metrics = ['attendance'] }) {
    try {
        const stats1 = await getAttendanceStats({ courseId, period: 'custom', dateRange: period1 });
        const stats2 = await getAttendanceStats({ courseId, period: 'custom', dateRange: period2 });

        return {
            periods: {
                period1: { start: period1.start, end: period1.end, label: formatDateRange(period1) },
                period2: { start: period2.start, end: period2.end, label: formatDateRange(period2) }
            },
            metrics: {
                attendance: {
                    period1: stats1.summary.averageAttendanceRate,
                    period2: stats2.summary.averageAttendanceRate,
                    change: stats2.summary.averageAttendanceRate - stats1.summary.averageAttendanceRate,
                    trend: stats2.summary.averageAttendanceRate > stats1.summary.averageAttendanceRate ? 'up' : 'down'
                }
            }
        };
    } catch (error) {
        console.error('Error generating comparative report:', error);
        throw error;
    }
}

/**
 * Generate student progress report (PDF)
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {Promise<string>} - File path
 */
async function generateStudentProgressReport(studentId, courseId) {
    try {
        const studentDoc = await db.collection('users').doc(studentId).get();
        const student = studentDoc.data();
        const courseDoc = await db.collection('courses').doc(courseId).get();
        const course = courseDoc.data();
        const engagement = await getStudentEngagement(studentId, courseId);

        const sessionsSnap = await db.collection('sessions')
            .where('courseId', '==', courseId)
            .orderBy('scheduledDate', 'asc').get();
        const sessions = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const attendanceHistory = [];
        for (const session of sessions) {
            const attendanceSnap = await db.collection('attendance')
                .where('sessionId', '==', session.id)
                .where('studentId', '==', studentId).limit(1).get();
            attendanceHistory.push({
                sessionTitle: session.title, date: session.scheduledDate,
                status: attendanceSnap.empty ? 'ABSENT' : attendanceSnap.docs[0].data().status
            });
        }

        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const filePath = path.join(os.tmpdir(), `student_progress_${studentId}_${Date.now()}.pdf`);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.fontSize(20).text('Student Progress Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Student: ${student.fullName || student.email}`);
        doc.text(`Student ID: ${student.studentId || studentId}`);
        doc.text(`Course: ${course.name} (${course.code})`);
        doc.moveDown();

        doc.fontSize(14).text('Summary Statistics');
        doc.fontSize(12);
        doc.text(`Total Sessions: ${engagement.summary.totalSessions}`);
        doc.text(`Present: ${engagement.summary.presentCount}`);
        doc.text(`Absent: ${engagement.summary.absentCount}`);
        doc.text(`Attendance Rate: ${engagement.summary.attendanceRate}%`);
        doc.moveDown();

        doc.fontSize(14).text('Attendance History');
        doc.moveDown();

        let y = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Date', 50, y); doc.text('Session', 150, y); doc.text('Status', 350, y);
        y += 20;
        doc.font('Helvetica');

        for (const record of attendanceHistory) {
            const date = record.date ? record.date.toDate().toLocaleDateString() : 'N/A';
            doc.text(date, 50, y);
            doc.text(record.sessionTitle.substring(0, 30), 150, y);
            if (record.status === 'PRESENT') {
                doc.fillColor('green').text('Present', 350, y);
            } else {
                doc.fillColor('red').text('x Absent', 350, y);
            }
            doc.fillColor('black');
            y += 20;
            if (y > 700) { doc.addPage(); y = 50; }
        }

        doc.end();
        return new Promise((resolve) => stream.on('finish', () => resolve(filePath)));
    } catch (error) {
        console.error('Error generating student progress report:', error);
        throw error;
    }
}

/**
 * Export data to CSV
 * @param {Array} data - Data to export
 * @param {string} filename - Output filename
 * @returns {Promise<string>} - File path
 */
async function exportToCSV(data, filename = 'export') {
    if (!data || data.length === 0) throw new Error('No data to export');
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
        const values = headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`);
        csvRows.push(values.join(','));
    }
    const filePath = path.join(os.tmpdir(), `${filename}_${Date.now()}.csv`);
    fs.writeFileSync(filePath, csvRows.join('\n'));
    return filePath;
}

/**
 * Export data to JSON
 * @param {Array|Object} data - Data to export
 * @param {string} filename - Output filename
 * @returns {Promise<string>} - File path
 */
async function exportToJSON(data, filename = 'export') {
    const filePath = path.join(os.tmpdir(), `${filename}_${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
}

function calculateNextRun(schedule) {
    const nextRun = new Date();
    if (schedule === 'daily') nextRun.setDate(nextRun.getDate() + 1);
    else if (schedule === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
    else if (schedule === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);
    return nextRun;
}

function formatDateRange(dateRange) {
    if (!dateRange.start && !dateRange.end) return 'All Time';
    const start = dateRange.start ? new Date(dateRange.start).toLocaleDateString() : 'Start';
    const end = dateRange.end ? new Date(dateRange.end).toLocaleDateString() : 'Present';
    return `${start} to ${end}`;
}

module.exports = {
    buildCustomReport, scheduleReport, generateComparativeReport,
    generateStudentProgressReport, exportToCSV, exportToJSON
};