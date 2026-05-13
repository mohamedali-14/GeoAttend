const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { db } = require('../config/firebase');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Generate Excel report for session attendance
 */
async function generateSessionAttendanceExcel(sessionId) {
  try {
    // Get session details
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      throw new Error('Session not found');
    }
    
    const session = sessionDoc.data();
    
    // Get course details
    const courseDoc = await db.collection('courses').doc(session.courseId).get();
    const course = courseDoc.exists ? courseDoc.data() : { name: 'Unknown Course' };
    
    // Get all enrolled students
    const enrollmentsSnap = await db.collection('enrollments')
      .where('courseId', '==', session.courseId)
      .where('status', '==', 'ACTIVE')
      .get();
    
    const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);
    
    // Get attendance records for this session
    const attendanceSnap = await db.collection('attendance')
      .where('sessionId', '==', sessionId)
      .get();
    
    const presentStudentIds = attendanceSnap.docs.map(doc => doc.data().studentId);
    
    // Get student details
    const students = [];
    for (const studentId of studentIds) {
      const studentDoc = await db.collection('users').doc(studentId).get();
      if (studentDoc.exists) {
        const studentData = studentDoc.data();
        students.push({
          id: studentId,
          name: `${studentData.firstName} ${studentData.lastName}`,
          email: studentData.email,
          studentId: studentData.studentID || 'N/A',
          department: studentData.department || 'N/A',
          present: presentStudentIds.includes(studentId)
        });
      }
    }
    
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');
    
    // Add title
    worksheet.mergeCells('A1', 'F1');
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = `Attendance Report: ${course.name}`;
    titleRow.getCell(1).font = { size: 16, bold: true };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    
    // Add session info
    worksheet.mergeCells('A2', 'F2');
    worksheet.getRow(2).getCell(1).value = `Session: ${session.title} | Date: ${session.scheduledAt} | Duration: ${session.duration} min`;
    worksheet.getRow(2).font = { italic: true };
    
    // Add summary
    worksheet.mergeCells('A3', 'F3');
    worksheet.getRow(3).getCell(1).value = `Total Students: ${students.length} | Present: ${presentStudentIds.length} | Absent: ${students.length - presentStudentIds.length}`;
    worksheet.getRow(3).font = { bold: true };
    
    // Add headers
    const headerRow = worksheet.addRow(['Student ID', 'Name', 'Email', 'Department', 'Status', 'Time']);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Add student rows
    students.forEach(student => {
      const row = worksheet.addRow([
        student.studentId,
        student.name,
        student.email,
        student.department,
        student.present ? 'Present' : 'Absent',
        student.present ? new Date().toLocaleTimeString() : '-'
      ]);
      
      if (student.present) {
        row.getCell(5).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF90EE90' }
        };
      } else {
        row.getCell(5).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFB6C1' }
        };
      }
      
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 20;
    });
    
    // Save file
    const filePath = path.join(os.tmpdir(), `attendance_${sessionId}_${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    
    return filePath;
  } catch (error) {
    console.error('Error generating Excel report:', error);
    throw error;
  }
}

/**
 * Generate PDF report for session attendance
 */
async function generateSessionAttendancePDF(sessionId) {
  try {
    // Get session details
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) {
      throw new Error('Session not found');
    }
    
    const session = sessionDoc.data();
    
    // Get course details
    const courseDoc = await db.collection('courses').doc(session.courseId).get();
    const course = courseDoc.exists ? courseDoc.data() : { name: 'Unknown Course' };
    
    // Get all enrolled students and attendance
    const enrollmentsSnap = await db.collection('enrollments')
      .where('courseId', '==', session.courseId)
      .where('status', '==', 'ACTIVE')
      .get();
    
    const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);
    
    const attendanceSnap = await db.collection('attendance')
      .where('sessionId', '==', sessionId)
      .get();
    
    const presentStudentIds = attendanceSnap.docs.map(doc => doc.data().studentId);
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filePath = path.join(os.tmpdir(), `attendance_${sessionId}_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    
    // Title
    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    
    // Course info
    doc.fontSize(14).text(`Course: ${course.name}`);
    doc.fontSize(12).text(`Session: ${session.title}`);
    doc.text(`Date/Time: ${session.scheduledAt}`);
    doc.text(`Duration: ${session.duration} minutes`);
    doc.moveDown();
    
    // Summary
    doc.fontSize(14).text('Summary');
    doc.fontSize(12).text(`Total Students: ${studentIds.length}`);
    doc.text(`Present: ${presentStudentIds.length}`);
    doc.text(`Absent: ${studentIds.length - presentStudentIds.length}`);
    doc.moveDown();
    
    // Attendance table
    doc.fontSize(14).text('Attendance List');
    doc.moveDown();
    
    // Table headers
    const startX = 50;
    let y = doc.y;
    
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Student ID', startX, y);
    doc.text('Name', startX + 100, y);
    doc.text('Status', startX + 250, y);
    doc.text('Time', startX + 320, y);
    
    y += 20;
    doc.font('Helvetica');
    
    // Add students
    for (const studentId of studentIds) {
      const studentDoc = await db.collection('users').doc(studentId).get();
      if (studentDoc.exists) {
        const student = studentDoc.data();
        const present = presentStudentIds.includes(studentId);
        
        doc.text(student.studentID || 'N/A', startX, y);
        doc.text(`${student.firstName} ${student.lastName}`, startX + 100, y);
        doc.text(present ? 'Present' : 'Absent', startX + 250, y);
        doc.text(present ? new Date().toLocaleTimeString() : '-', startX + 320, y);
        
        if (present) {
          doc.fillColor('green').text('✓', startX + 400, y);
          doc.fillColor('black');
        } else {
          doc.fillColor('red').text('✗', startX + 400, y);
          doc.fillColor('black');
        }
        
        y += 20;
        
        // New page if needed
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      }
    }
    
    doc.end();
    
    // Wait for stream to finish
    await new Promise((resolve) => {
      stream.on('finish', resolve);
    });
    
    return filePath;
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
}

module.exports = {
  generateSessionAttendanceExcel,
  generateSessionAttendancePDF
};