const { db, admin } = require('../../config/firebase');

async function seedTestData() {
    try {
        console.log('🌱 Seeding test data...');

        const courseRef = db.collection('courses').doc('test-course-123');
        await courseRef.set({
            name: 'Test Course',
            code: 'TEST101',
            professorId: 'prof-123',
            professorName: 'Test Professor',
            schedule: { days: ['MON', 'WED'], time: '10:00' },
            prerequisites: [],
            department: 'Computer Science',
            creditHours: 3,
            isActive: true,
            studentCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Test course created');

        const studentRef = db.collection('users').doc('test-student-456');
        await studentRef.set({
            fullName: 'Test Student',
            role: 'STUDENT',
            email: 'student@test.com',
            studentId: 'STU001',
            department: 'Computer Science',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Test student created');

        const professorRef = db.collection('users').doc('prof-123');
        await professorRef.set({
            fullName: 'Test Professor',
            role: 'PROFESSOR',
            email: 'prof@test.com',
            department: 'Computer Science',
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Test professor created');

        console.log('🌱 Seeding complete!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    }
}

if (require.main === module) seedTestData();
module.exports = { seedTestData };