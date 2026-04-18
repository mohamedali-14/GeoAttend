// src/services/export.service.js
// COMPLETE VERSION - Full Excel and PDF generation with all styling

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { db } = require("../config/firebase");
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Generate Excel attendance report with selfie verification status
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
        
        // Build student data
        const students = [];
        for (const studentId of studentIds) {
            const studentDoc = await db.collection('users').doc(studentId).get();
            if (studentDoc.exists) {
                const studentData = studentDoc.data();
                const attendance = attendanceMap.get(studentId);
                const selfie = selfieMap.get(studentId);
                
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
                    selfieUrl: selfie?.publicUrl || null
                });
            }
        }
        
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance');
        
        // Determine column count based on selfie requirement
        const columnCount = requireSelfie ? 8 : 6;
        const lastColumnLetter = String.fromCharCode(64 + columnCount);
        
        // Title
        worksheet.mergeCells(`A1:${lastColumnLetter}1`);
        const titleRow = worksheet.getRow(1);
        titleRow.getCell(1).value = `Attendance Report: ${course.name}`;
        titleRow.getCell(1).font = { size: 16, bold: true };
        titleRow.getCell(1).alignment = { horizontal: 'center' };
        titleRow.height = 30;
        
        // Subtitle
        worksheet.mergeCells(`A2:${lastColumnLetter}2`);
        worksheet.getRow(2).getCell(1).value = `Session: ${session.title} | Date: ${session.scheduledDate || 'N/A'}`;
        worksheet.getRow(2).font = { italic: true };
        worksheet.getRow(2).alignment = { horizontal: 'center' };
        
        // Summary
        worksheet.mergeCells(`A3:${lastColumnLetter}3`);
        const presentCount = students.filter(s => s.present).length;
        worksheet.getRow(3).getCell(1).value = `Total Students: ${students.length} | Present: ${presentCount} | Absent: ${students.length - presentCount}`;
        worksheet.getRow(3).font = { bold: true };
        worksheet.getRow(3).alignment = { horizontal: 'center' };
        
        // Headers
        const headers = ['Student ID', 'Name', 'Email', 'Department', 'Status', 'Time'];
        if (requireSelfie) {
            headers.push('Selfie Status', 'Verification Method');
        }
        
        const headerRow = worksheet.addRow(headers);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, size: 12 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        headerRow.height = 25;
        
        // Data rows
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
                if (!student.present) {
                    selfieStatus = 'Not Required (Absent)';
                } else if (student.selfieStatus === 'VERIFIED') {
                    selfieStatus = '✅ Verified';
                } else if (student.selfieStatus === 'PENDING') {
                    selfieStatus = '⏳ Pending Review';
                } else if (student.selfieStatus === 'REJECTED') {
                    selfieStatus = '❌ Rejected';
                } else {
                    selfieStatus = '📸 Not Submitted';
                }
                rowData.push(selfieStatus, student.verificationMethod);
            }
            
            const row = worksheet.addRow(rowData);
            row.height = 20;
            
            // Color coding for status
            if (student.present) {
                row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
            } else {
                row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB6C1' } };
            }
            
            // Selfie status color coding
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
            
            // Add borders to all cells in the row
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
        
        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 20;
            column.alignment = { vertical: 'middle' };
        });
        
        // Add footer with generation timestamp
        const footerRow = worksheet.addRow(['']);
        footerRow.getCell(1).value = `Report generated on: ${new Date().toLocaleString()}`;
        footerRow.getCell(1).font = { italic: true, size: 10 };
        worksheet.mergeCells(`A${worksheet.rowCount}:${lastColumnLetter}${worksheet.rowCount}`);
        
        // Save file
        const filePath = path.join(os.tmpdir(), `attendance_${sessionId}_${Date.now()}.xlsx`);
        await workbook.xlsx.writeFile(filePath);
        
        console.log(`Excel report generated for session ${sessionId}`);
        return filePath;
    } catch (error) {
        console.error('Error generating Excel report:', error);
        throw error;
    }
}

/**
 * Generate PDF attendance report with selfie verification status
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
        
        // Create PDF document
        const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
        const filePath = path.join(os.tmpdir(), `attendance_${sessionId}_${Date.now()}.pdf`);
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        
        // Header Section
        doc.fontSize(24).font('Helvetica-Bold').text('Attendance Report', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(14).font('Helvetica-Bold').text(course.name, { align: 'center' });
        doc.fontSize(12).font('Helvetica');
        doc.text(`Session: ${session.title}`, { align: 'center' });
        doc.text(`Date: ${session.scheduledDate || 'N/A'}`, { align: 'center' });
        doc.text(`Selfie Required: ${requireSelfie ? 'Yes 📸' : 'No'}`, { align: 'center' });
        doc.moveDown();
        
        // Draw a line
        doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        
        // Summary Section
        doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
        doc.fontSize(12).font('Helvetica');
        doc.text(`Total Students: ${studentIds.length}`);
        doc.text(`Present: ${presentStudentIds.length}`);
        doc.text(`Absent: ${studentIds.length - presentStudentIds.length}`);
        doc.text(`Attendance Rate: ${studentIds.length > 0 ? Math.round((presentStudentIds.length / studentIds.length) * 100) : 0}%`);
        doc.moveDown();
        
        // Selfie Statistics (if enabled)
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
            
            doc.fontSize(12).font('Helvetica-Bold').text('Selfie Verification Status (Present Students):');
            doc.fontSize(11).font('Helvetica');
            doc.text(`✅ Verified: ${selfieStats.verified}`, { indent: 20 });
            doc.text(`⏳ Pending Review: ${selfieStats.pending}`, { indent: 20 });
            doc.text(`❌ Rejected: ${selfieStats.rejected}`, { indent: 20 });
            doc.text(`📸 Not Submitted: ${selfieStats.notSubmitted}`, { indent: 20 });
            doc.moveDown();
        }
        
        // Draw another line
        doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
        
        // Attendance List Section
        doc.fontSize(14).font('Helvetica-Bold').text('Attendance List', { underline: true });
        doc.moveDown(0.5);
        
        // Table Headers
        const startX = 50;
        let y = doc.y;
        const col1 = 50;      // Student ID
        const col2 = 130;     // Name
        const col3 = 280;     // Status
        const col4 = 360;     // Selfie Status (if enabled)
        const col5 = 460;     // Time
        
        doc.fontSize(10).font('Helvetica-Bold');
        doc.fillColor('#333333');
        doc.text('Student ID', col1, y);
        doc.text('Name', col2, y);
        doc.text('Status', col3, y);
        if (requireSelfie) {
            doc.text('Selfie Status', col4, y);
        }
        doc.text('Time', requireSelfie ? col5 : col4, y);
        
        // Draw header underline
        const headerY = y + 15;
        doc.moveTo(col1, headerY).lineTo(requireSelfie ? col5 + 60 : col4 + 60, headerY).stroke();
        y += 25;
        
        doc.font('Helvetica');
        doc.fillColor('black');
        
        // Data rows
        let rowCount = 0;
        for (const studentId of studentIds) {
            const studentDoc = await db.collection('users').doc(studentId).get();
            if (studentDoc.exists) {
                const student = studentDoc.data();
                const present = presentStudentIds.includes(studentId);
                const attendance = attendanceMap.get(studentId);
                const selfie = selfieMap.get(studentId);
                
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
                
                // Selfie Status (if enabled)
                if (requireSelfie) {
                    let selfieStatus = '';
                    let selfieColor = 'black';
                    if (!present) {
                        selfieStatus = 'N/A';
                    } else if (!selfie) {
                        selfieStatus = 'Not Submitted';
                        selfieColor = 'orange';
                    } else if (selfie.verificationStatus === 'VERIFIED') {
                        selfieStatus = '✓ Verified';
                        selfieColor = 'green';
                    } else if (selfie.verificationStatus === 'PENDING') {
                        selfieStatus = '⏳ Pending';
                        selfieColor = 'orange';
                    } else if (selfie.verificationStatus === 'REJECTED') {
                        selfieStatus = '✗ Rejected';
                        selfieColor = 'red';
                    }
                    doc.fillColor(selfieColor).text(selfieStatus, col4, y);
                    doc.fillColor('black');
                }
                
                // Time
                const timeStr = present && attendance?.verifiedAt ? 
                    attendance.verifiedAt.toDate().toLocaleTimeString() : '-';
                doc.text(timeStr, requireSelfie ? col5 : col4, y);
                
                y += 22;
                rowCount++;
                
                // Page break if needed
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                    
                    // Re-draw headers on new page
                    doc.fontSize(10).font('Helvetica-Bold');
                    doc.fillColor('#333333');
                    doc.text('Student ID', col1, y);
                    doc.text('Name', col2, y);
                    doc.text('Status', col3, y);
                    if (requireSelfie) {
                        doc.text('Selfie Status', col4, y);
                    }
                    doc.text('Time', requireSelfie ? col5 : col4, y);
                    y += 20;
                    doc.font('Helvetica');
                    doc.fillColor('black');
                }
            }
        }
        
        // Footer with generation timestamp
        doc.moveDown();
        doc.fontSize(8).font('Helvetica-Oblique');
        doc.fillColor('#888888');
        doc.text(`Report generated on: ${new Date().toLocaleString()}`, 50, doc.y);
        doc.text(`GeoAttend System - Attendance Management`, 50, doc.y + 12);
        
        // End document
        doc.end();
        
        return new Promise((resolve) => {
            stream.on('finish', () => {
                console.log(`PDF report generated for session ${sessionId}`);
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