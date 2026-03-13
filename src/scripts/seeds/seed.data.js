const { db, admin } = require('../../config/firebase');

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...');

    // Create test course
    const courseRef = db.collection('courses').doc('test-course-123');
    await courseRef.set({
      name: 'Test Course',
      professorId: 'prof-123',
      schedule: { days: ['MON', 'WED'], time: '10:00' },
      prerequisites: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      studentCount: 0
    });
    console.log('✅ Test course created');

    // Create test student
    const studentRef = db.collection('users').doc('test-student-456');
    await studentRef.set({
      fullName: 'Test Student',
      role: 'STUDENT',
      email: 'student@test.com',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Test student created');

    // Create test professor (optional, for professor courses test)
    const professorRef = db.collection('users').doc('prof-123');
    await professorRef.set({
      fullName: 'Test Professor',
      role: 'PROFESSOR',
      email: 'prof@test.com',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Test professor created');

    console.log('🌱 Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedTestData();
}

module.exports = { seedTestData };