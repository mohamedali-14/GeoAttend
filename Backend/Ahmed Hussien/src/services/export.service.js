
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { db } = require('../config/firebase');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Generate Excel attendance report with selfie verification status and quiz scores
 * @param {string} sessionId - The session ID
 * @returns {Promise<string>} - Path to generated file
 */
async function generateSessionAttendanceExcel(sessionId) {
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        const session = sessionDoc.data();
        
        const courseDoc = await db.collection('courses').doc(session.courseId).get();
        const course = courseDoc.exists ? courseDoc.data() : { name: 'Unknown Course' };
        
        // Get enrolled students
        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', session.courseId)
            .where('status', '==', 'ACTIVE')
            .get();
        
        const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);
        
        // Get attendance records
        const attendanceSnap = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .get();
        
        const attendanceMap = new Map();
        attendanceSnap.docs.forEach(doc => {
            const data = doc.data();
            attendanceMap.set(data.studentId, data);
        });
        
        // Get selfie records if enabled
        const selfieSnap = await db.collection('attendanceSelfies')
            .where('sessionId', '==', sessionId)
            .get();
        
        const selfieMap = new Map();
        selfieSnap.docs.forEach(doc => {
            const data = doc.data();
            selfieMap.set(data.studentId, data);
        });
        
        const requireSelfie = session.verificationSettings?.requireSelfie || false;
        const quizEnabled = session.verificationSettings?.quizEnabled || false;
        
        // Build student data
        const students = [];
        for (const studentId of studentIds) {
            const studentDoc = await db.collection('users').doc(studentId).get();
            if (studentDoc.exists) {
                const studentData = studentDoc.data();
                const attendance = attendanceMap.get(studentId);
                const selfie = selfieMap.get(studentId);
                
                // Get quiz score if quiz enabled
                let quizScore = null;
                if (quizEnabled) {
                    const quizSubmission = await db.collection('quizSubmissions')
                        .where('sessionId', '==', sessionId)
                        .where('studentId', '==', studentId)
                        .limit(1)
                        .get();
                    if (!quizSubmission.empty) {
                        quizScore = quizSubmission.docs[0].data().score;
                    }
                }
                
                students.push({
                    id: studentId,
                    name: studentData.fullName || 'Unknown',
                    email: studentData.email || 'N/A',
                    studentId: studentData.studentId || 'N/A',
                    department: studentData.department || 'N/A',
                    present: !!attendance,
                    verificationMethod: attendance?.verificationMethod || 'N/A',
                    verifiedAt: attendance?.verifiedAt?.toDate?.() || null,
                    selfieStatus: selfie?.verificationStatus || 'NOT_SUBMITTED',
                    selfieUrl: selfie?.publicUrl || null,
                    quizScore: quizScore
                });
            }
        }
        
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');
        
        // Determine column count based on features enabled
        let columnCount = 6; // Base: ID, Name, Email, Department, Status, Time
        if (requireSelfie) columnCount += 2; // Selfie Status, Verification Method
        if (quizEnabled) columnCount += 1; // Quiz Score
        
        const lastColumnLetter = String.fromCharCode(64 + columnCount);
        
        // ============ HEADER SECTION ============
        
        // Title
        worksheet.mergeCells(`A1:${lastColumnLetter}1`);
        const titleRow = worksheet.getRow(1);
        titleRow.getCell(1).value = `Attendance Report: ${course.name}`;
        titleRow.getCell(1).font = { size: 18, bold: true, name: 'Calibri' };
        titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        titleRow.height = 30;
        
        // Subtitle
        worksheet.mergeCells(`A2:${lastColumnLetter}2`);
        worksheet.getRow(2).getCell(1).value = `Session: ${session.title}`;
        worksheet.getRow(2).font = { size: 12, italic: true };
        worksheet.getRow(2).alignment = { horizontal: 'center' };
        
        // Date and Time
        worksheet.mergeCells(`A3:${lastColumnLetter}3`);
        const sessionDate = session.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString() : 'N/A';
        worksheet.getRow(3).getCell(1).value = `Date: ${sessionDate} | Generated: ${new Date().toLocaleString()}`;
        worksheet.getRow(3).font = { size: 10, italic: true };
        worksheet.getRow(3).alignment = { horizontal: 'center' };
        
        // ============ SUMMARY SECTION ============
        
        worksheet.mergeCells(`A4:${lastColumnLetter}4`);
        const presentCount = students.filter(s => s.present).length;
        const absentCount = students.length - presentCount;
        const attendanceRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0;
        
        worksheet.getRow(4).getCell(1).value = `📊 Summary: Total Students: ${students.length} | Present: ${presentCount} (${attendanceRate}%) | Absent: ${absentCount}`;
        worksheet.getRow(4).font = { bold: true, size: 11 };
        worksheet.getRow(4).alignment = { horizontal: 'center' };
        
        // Selfie summary if enabled
        let currentRow = 5;
        if (requireSelfie) {
            const selfieStats = {
                verified: students.filter(s => s.selfieStatus === 'VERIFIED').length,
                pending: students.filter(s => s.selfieStatus === 'PENDING').length,
                rejected: students.filter(s => s.selfieStatus === 'REJECTED').length,
                notSubmitted: students.filter(s => s.selfieStatus === 'NOT_SUBMITTED').length
            };
            
            worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
            worksheet.getRow(currentRow).getCell(1).value = `📸 Selfie Status: ✅ Verified: ${selfieStats.verified} | ⏳ Pending: ${selfieStats.pending} | ❌ Rejected: ${selfieStats.rejected} | 📸 Not Submitted: ${selfieStats.notSubmitted}`;
            worksheet.getRow(currentRow).font = { size: 10 };
            worksheet.getRow(currentRow).alignment = { horizontal: 'center' };
            currentRow++;
        }
        
        // Quiz summary if enabled
        if (quizEnabled) {
            const quizScores = students.filter(s => s.quizScore !== null).map(s => s.quizScore);
            const avgQuizScore = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;
            const highestScore = quizScores.length > 0 ? Math.max(...quizScores) : 0;
            const lowestScore = quizScores.length > 0 ? Math.min(...quizScores) : 0;
            
            worksheet.mergeCells(`A${currentRow}:${lastColumnLetter}${currentRow}`);
            worksheet.getRow(currentRow).getCell(1).value = `🤖 Quiz Summary: Average: ${avgQuizScore}% | Highest: ${highestScore}% | Lowest: ${lowestScore}% | Taken: ${quizScores.length}/${students.length}`;
            worksheet.getRow(currentRow).font = { size: 10 };
            worksheet.getRow(currentRow).alignment = { horizontal: 'center' };
            currentRow++;
        }
        
        // Empty row for spacing
        worksheet.getRow(currentRow).height = 10;
        currentRow++;
        
        // ============ HEADERS SECTION ============
        
        const headers = ['Student ID', 'Name', 'Email', 'Department', 'Status', 'Time'];
        if (requireSelfie) {
            headers.push('Selfie Status', 'Verification Method');
        }
        if (quizEnabled) {
            headers.push('Quiz Score');
        }
        
        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell, colNumber) => {
            cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF2C3E50' }
            };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        headerRow.height = 25;
        
        // ============ DATA ROWS ============
        
        students.forEach(student => {
            const rowData = [
                student.studentId,
                student.name,
                student.email,
                student.department,
                student.present ? 'Present' : 'Absent',
                student.present && student.verifiedAt ? student.verifiedAt.toLocaleTimeString() : '-'
            ];
            
            if (requireSelfie) {
                let selfieStatus = 'N/A';
                let selfieColor = null;
                
                if (!student.present) {
                    selfieStatus = 'Not Required (Absent)';
                    selfieColor = 'FFE0E0E0';
                } else if (student.selfieStatus === 'VERIFIED') {
                    selfieStatus = '✅ Verified';
                    selfieColor = 'FFA5D6A5';
                } else if (student.selfieStatus === 'PENDING') {
                    selfieStatus = '⏳ Pending Review';
                    selfieColor = 'FFFFD966';
                } else if (student.selfieStatus === 'REJECTED') {
                    selfieStatus = '❌ Rejected';
                    selfieColor = 'FFFF9999';
                } else {
                    selfieStatus = '📸 Not Submitted';
                    selfieColor = 'FFFFB6C1';
                }
                rowData.push(selfieStatus, student.verificationMethod);
            }
            
            if (quizEnabled) {
                const scoreDisplay = student.quizScore !== null ? `${Math.round(student.quizScore)}%` : 'Not taken';
                rowData.push(scoreDisplay);
            }
            
            const row = worksheet.addRow(rowData);
            row.height = 20;
            
            // Color coding for status column (column 5)
            if (student.present) {
                row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
            } else {
                row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB6C1' } };
            }
            
            // Color coding for selfie status column if enabled
            if (requireSelfie && student.present) {
                const selfieCell = row.getCell(7);
                if (student.selfieStatus === 'VERIFIED') {
                    selfieCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA5D6A5' } };
                } else if (student.selfieStatus === 'PENDING') {
                    selfieCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } };
                } else if (student.selfieStatus === 'REJECTED') {
                    selfieCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9999' } };
                }
            }
            
            // Color coding for quiz score if enabled
            if (quizEnabled && student.quizScore !== null) {
                const scoreCell = row.getCell(requireSelfie ? 9 : 7);
                if (student.quizScore >= 90) {
                    scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA5D6A5' } };
                } else if (student.quizScore >= 70) {
                    scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD966' } };
                } else if (student.quizScore >= 50) {
                    scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB6C1' } };
                } else {
                    scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9999' } };
                }
            }
            
            // Add borders to all cells
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { vertical: 'middle' };
            });
        });
        
        // ============ FOOTER ============
        
        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 18;
            column.alignment = { vertical: 'middle' };
        });
        
        // Add footer with generation info
        const footerRow = worksheet.addRow(['']);
        footerRow.getCell(1).value = `Report generated by GeoAttend System on ${new Date().toLocaleString()}`;
        footerRow.getCell(1).font = { italic: true, size: 9 };
        worksheet.mergeCells(`A${worksheet.rowCount}:${lastColumnLetter}${worksheet.rowCount}`);
        
        // Save file
        const filePath = path.join(os.tmpdir(), `attendance_${sessionId}_${Date.now()}.xlsx`);
        await workbook.xlsx.writeFile(filePath);
        
        console.log(`✅ Excel report generated for session ${sessionId}`);
        return filePath;
    } catch (error) {
        console.error('Error generating Excel report:', error);
        throw error;
    }
}

/**
 * Generate PDF attendance report with selfie verification status and quiz scores
 * @param {string} sessionId - The session ID
 * @returns {Promise<string>} - Path to generated file
 */
async function generateSessionAttendancePDF(sessionId) {
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        const session = sessionDoc.data();
        
        const courseDoc = await db.collection('courses').doc(session.courseId).get();
        const course = courseDoc.exists ? courseDoc.data() : { name: 'Unknown Course' };
        
        // Get enrolled students
        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', session.courseId)
            .where('status', '==', 'ACTIVE')
            .get();
        
        const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);
        
        // Get attendance records
        const attendanceSnap = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .get();
        
        const presentStudentIds = attendanceSnap.docs.map(doc => doc.data().studentId);
        const attendanceMap = new Map();
        attendanceSnap.docs.forEach(doc => {
            attendanceMap.set(doc.data().studentId, doc.data());
        });
        
        // Get selfie records
        const selfieSnap = await db.collection('attendanceSelfies')
            .where('sessionId', '==', sessionId)
            .get();
        
        const selfieMap = new Map();
        selfieSnap.docs.forEach(doc => {
            selfieMap.set(doc.data().studentId, doc.data());
        });
        
        const requireSelfie = session.verificationSettings?.requireSelfie || false;
        const quizEnabled = session.verificationSettings?.quizEnabled || false;
        
        // Get quiz scores if enabled
        const quizScoresMap = new Map();
        if (quizEnabled) {
            const submissionsSnap = await db.collection('quizSubmissions')
                .where('sessionId', '==', sessionId)
                .get();
            submissionsSnap.docs.forEach(doc => {
                quizScoresMap.set(doc.data().studentId, doc.data().score);
            });
        }
        
        // Create PDF document
        const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
        const filePath = path.join(os.tmpdir(), `attendance_${sessionId}_${Date.now()}.pdf`);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        
        // ============ HEADER ============
        
        // Title
        doc.fontSize(24).font('Helvetica-Bold').text('Attendance Report', { align: 'center' });
        doc.moveDown(0.5);
        
        // Course and Session Info
        doc.fontSize(16).font('Helvetica-Bold').text(course.name, { align: 'center' });
        doc.fontSize(12).font('Helvetica');
        doc.text(`Session: ${session.title}`, { align: 'center' });
        
        const sessionDate = session.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString() : 'N/A';
        doc.text(`Date: ${sessionDate}`, { align: 'center' });
        doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        
        doc.moveDown();
        
        // Divider
        doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        
        // ============ SUMMARY SECTION ============
        
        doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
        doc.fontSize(12).font('Helvetica');
        
        const presentCount = presentStudentIds.length;
        const absentCount = studentIds.length - presentCount;
        const attendanceRate = studentIds.length > 0 ? Math.round((presentCount / studentIds.length) * 100) : 0;
        
        doc.text(`• Total Students: ${studentIds.length}`);
        doc.text(`• Present: ${presentCount} (${attendanceRate}%)`);
        doc.text(`• Absent: ${absentCount}`);
        doc.moveDown();
        
        // Selfie Statistics
        if (requireSelfie) {
            const selfieStats = {
                verified: 0,
                pending: 0,
                rejected: 0,
                notSubmitted: 0
            };
            
            for (const studentId of presentStudentIds) {
                const selfie = selfieMap.get(studentId);
                if (!selfie) {
                    selfieStats.notSubmitted++;
                } else if (selfie.verificationStatus === 'VERIFIED') {
                    selfieStats.verified++;
                } else if (selfie.verificationStatus === 'PENDING') {
                    selfieStats.pending++;
                } else if (selfie.verificationStatus === 'REJECTED') {
                    selfieStats.rejected++;
                }
            }
            
            doc.fontSize(11).font('Helvetica-Bold').text('Selfie Verification Status:');
            doc.fontSize(10).font('Helvetica');
            doc.text(`   ✅ Verified: ${selfieStats.verified}`, { indent: 10 });
            doc.text(`   ⏳ Pending Review: ${selfieStats.pending}`, { indent: 10 });
            doc.text(`   ❌ Rejected: ${selfieStats.rejected}`, { indent: 10 });
            doc.text(`   📸 Not Submitted: ${selfieStats.notSubmitted}`, { indent: 10 });
            doc.moveDown();
        }
        
        // Quiz Statistics
        if (quizEnabled) {
            const quizScores = Array.from(quizScoresMap.values());
            const avgScore = quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : 0;
            const highestScore = quizScores.length > 0 ? Math.max(...quizScores) : 0;
            const lowestScore = quizScores.length > 0 ? Math.min(...quizScores) : 0;
            
            doc.fontSize(11).font('Helvetica-Bold').text('Quiz Performance:');
            doc.fontSize(10).font('Helvetica');
            doc.text(`   🤖 Average Score: ${avgScore}%`, { indent: 10 });
            doc.text(`   🏆 Highest Score: ${highestScore}%`, { indent: 10 });
            doc.text(`   📉 Lowest Score: ${lowestScore}%`, { indent: 10 });
            doc.text(`   📝 Taken: ${quizScores.length}/${studentIds.length} students`, { indent: 10 });
            doc.moveDown();
        }
        
        // Divider
        doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        
        // ============ ATTENDANCE LIST ============
        
        doc.fontSize(14).font('Helvetica-Bold').text('Attendance List', { underline: true });
        doc.moveDown(0.5);
        
        // Table Headers
        const startX = 50;
        let y = doc.y;
        const col1 = 50;      // Student ID
        const col2 = 130;     // Name
        const col3 = 280;     // Status
        const col4 = 360;     // Selfie Status (if enabled)
        const col5 = 420;     // Quiz Score (if enabled)
        const col6 = 490;     // Time
        
        doc.fontSize(9).font('Helvetica-Bold');
        doc.fillColor('#333333');
        doc.text('Student ID', col1, y);
        doc.text('Name', col2, y);
        doc.text('Status', col3, y);
        
        let currentCol = col4;
        if (requireSelfie) {
            doc.text('Selfie Status', currentCol, y);
            currentCol += 60;
        }
        if (quizEnabled) {
            doc.text('Quiz Score', currentCol, y);
            currentCol += 70;
        }
        doc.text('Time', currentCol, y);
        
        // Draw header underline
        const headerY = y + 15;
        doc.moveTo(col1, headerY).lineTo(currentCol + 50, headerY).stroke();
        y += 22;
        
        doc.font('Helvetica');
        doc.fillColor('black');
        
        // ============ DATA ROWS ============
        
        let rowCount = 0;
        for (const studentId of studentIds) {
            const studentDoc = await db.collection('users').doc(studentId).get();
            if (studentDoc.exists) {
                const student = studentDoc.data();
                const present = presentStudentIds.includes(studentId);
                const attendance = attendanceMap.get(studentId);
                const selfie = selfieMap.get(studentId);
                const quizScore = quizScoresMap.get(studentId);
                
                // Alternate row background
                if (rowCount % 2 === 0) {
                    doc.rect(col1 - 5, y - 3, 550, 20).fill('#f9f9f9');
                    doc.fillColor('black');
                }
                
                // Student ID
                doc.fontSize(9).text(student.studentId || 'N/A', col1, y);
                
                // Name (truncate if too long)
                let name = student.fullName || 'Unknown';
                if (name.length > 25) name = name.substring(0, 22) + '...';
                doc.text(name, col2, y);
                
                // Status with color
                if (present) {
                    doc.fillColor('green').text('✓ Present', col3, y);
                } else {
                    doc.fillColor('red').text('✗ Absent', col3, y);
                }
                doc.fillColor('black');
                
                // Selfie Status
                let currentX = col4;
                if (requireSelfie) {
                    let selfieStatus = '';
                    let selfieColor = 'black';
                    if (!present) {
                        selfieStatus = 'N/A';
                        selfieColor = '#888888';
                    } else if (!selfie) {
                        selfieStatus = 'Not Submitted';
                        selfieColor = '#FF9800';
                    } else if (selfie.verificationStatus === 'VERIFIED') {
                        selfieStatus = '✓ Verified';
                        selfieColor = '#4CAF50';
                    } else if (selfie.verificationStatus === 'PENDING') {
                        selfieStatus = '⏳ Pending';
                        selfieColor = '#FFC107';
                    } else if (selfie.verificationStatus === 'REJECTED') {
                        selfieStatus = '✗ Rejected';
                        selfieColor = '#F44336';
                    }
                    doc.fillColor(selfieColor).text(selfieStatus, currentX, y);
                    doc.fillColor('black');
                    currentX += 60;
                }
                
                // Quiz Score
                if (quizEnabled) {
                    let scoreDisplay = quizScore !== undefined ? `${Math.round(quizScore)}%` : 'Not taken';
                    let scoreColor = quizScore !== undefined ? 
                        (quizScore >= 70 ? '#4CAF50' : (quizScore >= 50 ? '#FF9800' : '#F44336')) : '#888888';
                    doc.fillColor(scoreColor).text(scoreDisplay, currentX, y);
                    doc.fillColor('black');
                    currentX += 70;
                }
                
                // Time
                const timeStr = present && attendance?.verifiedAt ? 
                    attendance.verifiedAt.toDate().toLocaleTimeString() : '-';
                doc.text(timeStr, currentX, y);
                
                y += 22;
                rowCount++;
                
                // Page break if needed
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                    
                    // Re-draw headers on new page
                    doc.fontSize(9).font('Helvetica-Bold');
                    doc.fillColor('#333333');
                    doc.text('Student ID', col1, y);
                    doc.text('Name', col2, y);
                    doc.text('Status', col3, y);
                    
                    let newCol = col4;
                    if (requireSelfie) {
                        doc.text('Selfie Status', newCol, y);
                        newCol += 60;
                    }
                    if (quizEnabled) {
                        doc.text('Quiz Score', newCol, y);
                        newCol += 70;
                    }
                    doc.text('Time', newCol, y);
                    
                    y += 22;
                    doc.font('Helvetica');
                    doc.fillColor('black');
                }
            }
        }
        
        // ============ FOOTER ============
        
        doc.moveDown();
        doc.fontSize(8).font('Helvetica-Oblique');
        doc.fillColor('#888888');
        doc.text(`Report generated by GeoAttend System on ${new Date().toLocaleString()}`, 50, doc.y);
        doc.text(`© GeoAttend - Smart Attendance Management System`, 50, doc.y + 12);
        
        // End document
        doc.end();
        
        return new Promise((resolve) => {
            stream.on('finish', () => {
                console.log(`✅ PDF report generated for session ${sessionId}`);
                resolve(filePath);
            });
        });
    } catch (error) {
        console.error('Error generating PDF report:', error);
        throw error;
    }
}

module.exports = { 
    generateSessionAttendanceExcel, 
    generateSessionAttendancePDF 
};