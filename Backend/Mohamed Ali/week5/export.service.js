// src/services/export.service.js
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { db } = require('../config/firebase');
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
    
    // Title
    worksheet.mergeCells('A1', `${String.fromCharCode(64 + columnCount)}1`);
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = `Attendance Report: ${course.name}`;
    titleRow.getCell(1).font = { size: 16, bold: true };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    
    // Subtitle
    worksheet.mergeCells('A2', `${String.fromCharCode(64 + columnCount)}2`);
    worksheet.getRow(2).getCell(1).value = `Session: ${session.title} | Date: ${session.scheduledDate || 'N/A'}`;
    worksheet.getRow(2).font = { italic: true };
    
    // Summary
    worksheet.mergeCells('A3', `${String.fromCharCode(64 + columnCount)}3`);
    const presentCount = students.filter(s => s.present).length;
    worksheet.getRow(3).getCell(1).value = `Total Students: ${students.length} | Present: ${presentCount} | Absent: ${students.length - presentCount}`;
    worksheet.getRow(3).font = { bold: true };
    
    // Headers
    const headers = ['Student ID', 'Name', 'Email', 'Department', 'Status', 'Time'];
    if (requireSelfie) {
      headers.push('Selfie Status', 'Verification Method');
    }
    
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    
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
      
      // Color coding
      if (student.present) {
        row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
      } else {
        row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB6C1' } };
      }
      
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });
    
    worksheet.columns.forEach(column => { column.width = 20; });
    
    const filePath = path.join(os.tmpdir(), `attendance_${sessionId}_${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
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
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filePath = path.join(os.tmpdir(), `attendance_${sessionId}_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    
    // Title
    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text(`Course: ${course.name}`);
    doc.fontSize(12).text(`Session: ${session.title}`);
    doc.text(`Date/Time: ${session.scheduledDate || 'N/A'}`);
    doc.text(`Selfie Required: ${requireSelfie ? 'Yes 📸' : 'No'}`);
    doc.moveDown();
    
    // Summary
    doc.fontSize(14).text('Summary');
    doc.fontSize(12).text(`Total Students: ${studentIds.length}`);
    doc.text(`Present: ${presentStudentIds.length}`);
    doc.text(`Absent: ${studentIds.length - presentStudentIds.length}`);
    
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
      
      doc.moveDown();
      doc.fontSize(12).text('Selfie Verification Status (Present Students):');
      doc.text(`✅ Verified: ${selfieStats.verified}`);
      doc.text(`⏳ Pending Review: ${selfieStats.pending}`);
      doc.text(`❌ Rejected: ${selfieStats.rejected}`);
      doc.text(`📸 Not Submitted: ${selfieStats.notSubmitted}`);
    }
    
    doc.moveDown();
    doc.fontSize(14).text('Attendance List');
    doc.moveDown();
    
    // Table headers
    const startX = 50;
    let y = doc.y;
    
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Student ID', startX, y);
    doc.text('Name', startX + 100, y);
    doc.text('Status', startX + 250, y);
    if (requireSelfie) {
      doc.text('Selfie Status', startX + 320, y);
    }
    doc.text('Time', startX + (requireSelfie ? 430 : 320), y);
    y += 20;
    doc.font('Helvetica');
    
    // Data rows
    for (const studentId of studentIds) {
      const studentDoc = await db.collection('users').doc(studentId).get();
      if (studentDoc.exists) {
        const student = studentDoc.data();
        const present = presentStudentIds.includes(studentId);
        const attendance = attendanceMap.get(studentId);
        const selfie = selfieMap.get(studentId);
        
        let selfieStatus = '';
        if (requireSelfie && present) {
          if (!selfie) selfieStatus = 'Not Submitted';
          else if (selfie.verificationStatus === 'VERIFIED') selfieStatus = '✓ Verified';
          else if (selfie.verificationStatus === 'PENDING') selfieStatus = '⏳ Pending';
          else if (selfie.verificationStatus === 'REJECTED') selfieStatus = '✗ Rejected';
        } else if (requireSelfie && !present) {
          selfieStatus = 'N/A (Absent)';
        }
        
        doc.text(student.studentId || 'N/A', startX, y);
        doc.text(student.fullName || 'Unknown', startX + 100, y);
        
        if (present) {
          doc.fillColor('green').text('Present', startX + 250, y);
        } else {
          doc.fillColor('red').text('Absent', startX + 250, y);
        }
        doc.fillColor('black');
        
        if (requireSelfie) {
          doc.text(selfieStatus, startX + 320, y);
          doc.text(present && attendance?.verifiedAt ? attendance.verifiedAt.toDate().toLocaleTimeString() : '-', startX + 430, y);
        } else {
          doc.text(present && attendance?.verifiedAt ? attendance.verifiedAt.toDate().toLocaleTimeString() : '-', startX + 320, y);
        }
        
        y += 20;
        
        if (y > 700) {
          doc.addPage();
          y = 50;
          doc.fontSize(10).font('Helvetica-Bold');
          doc.text('Student ID', startX, y);
          doc.text('Name', startX + 100, y);
          doc.text('Status', startX + 250, y);
          if (requireSelfie) {
            doc.text('Selfie Status', startX + 320, y);
          }
          doc.text('Time', startX + (requireSelfie ? 430 : 320), y);
          y += 20;
          doc.font('Helvetica');
        }
      }
    }
    
    doc.end();
    
    return new Promise((resolve) => {
      stream.on('finish', () => resolve(filePath));
    });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
}

module.exports = { generateSessionAttendanceExcel, generateSessionAttendancePDF };