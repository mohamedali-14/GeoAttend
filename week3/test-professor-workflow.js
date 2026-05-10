const { db, admin } = require('../config/firebase');
const { startRandomCheck } = require('../utils/randomCheck');
const { uploadAttendanceSelfie } = require('../utils/selfieUpload');
const { generateSessionAttendanceExcel } = require('../utils/export.service');
const fs = require('fs');

/**
 * Test full professor workflow
 */
async function testProfessorWorkflow() {
  try {
    console.log('🧪 Testing professor workflow...\n');
    
    // 1. Create a test session
    console.log('📝 Creating test session...');
    const sessionData = {
      title: 'Integration Test Lecture',
      courseId: 'test-course-123',
      courseName: 'Test Course',
      professorId: 'prof-123',
      professorName: 'Dr. Test Professor',
      department: 'Computer Science',
      scheduledAt: new Date().toLocaleTimeString(),
      duration: 90,
      status: 'SCHEDULED',
      studentsPresent: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const sessionRef = await db.collection('sessions').add(sessionData);
    console.log(`✅ Session created with ID: ${sessionRef.id}\n`);
    
    // 2. Start the session
    console.log('🔔 Starting session (notifications would be sent)...');
    await db.collection('sessions').doc(sessionRef.id).update({
      status: 'ACTIVE',
      startedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Session started\n');
    
    // 3. Start a random check
    console.log('🎲 Starting random attendance check...');
    const randomCheck = await startRandomCheck(sessionRef.id, 5);
    console.log(`✅ Random check started with code: ${randomCheck.verificationCode}\n`);
    
    // 4. Simulate students marking attendance
    console.log('👥 Simulating student attendance...');
    
    const testStudents = [
      { id: 'test-student-456', name: 'Test Student 1' },
      { id: 'test-student-789', name: 'Test Student 2' }
    ];
    
    for (const student of testStudents) {
      // Regular attendance
      await db.collection('attendance').add({
        sessionId: sessionRef.id,
        studentId: student.id,
        studentName: student.name,
        markedAt: admin.firestore.FieldValue.serverTimestamp(),
        method: 'QR_SCAN'
      });
      console.log(`  ✓ ${student.name} marked attendance via QR`);
    }
    
    // Update session student count
    await db.collection('sessions').doc(sessionRef.id).update({
      studentsPresent: 2
    });
    console.log('✅ Attendance recorded\n');
    
    // 5. Generate report
    console.log('📊 Generating attendance report...');
    const excelPath = await generateSessionAttendanceExcel(sessionRef.id);
    console.log(`✅ Excel report generated: ${excelPath}`);
    
    console.log('\n✅ Professor workflow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testProfessorWorkflow();
}

module.exports = { testProfessorWorkflow };