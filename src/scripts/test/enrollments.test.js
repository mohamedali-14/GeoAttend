const { enrollStudent, getStudentEnrollments, getCourseStats } = require('../../modules/enrollments/enrollments.controller');
const { seedTestData } = require('../seeds/seed.data');

async function testEnrollmentFlow() {
    try {
        console.log('🧪 Starting enrollment integration test...\n');
        await seedTestData();
        console.log('');

        const mockReq = {
            body: { courseId: 'test-course-123', studentId: 'test-student-456' },
            user: { role: 'STUDENT', uid: 'test-student-456', fullName: 'Test Student' }
        };

        const mockRes = {
            status: (code) => ({ json: (data) => console.log(`✅ Enrollment response (${code}):`, data) })
        };

        console.log('📝 Enrolling student...');
        await enrollStudent(mockReq, mockRes);

        console.log('\n📚 Fetching student enrollments...');
        const enrollmentsReq = {
            params: { studentId: 'test-student-456' },
            user: { role: 'STUDENT', uid: 'test-student-456' }
        };
        
        const enrollmentsRes = { json: (data) => console.log('Student enrollments:', data) };
        await getStudentEnrollments(enrollmentsReq, enrollmentsRes);

        console.log('\n📊 Fetching course stats...');
        const statsReq = { query: { courseId: 'test-course-123' } };
        
        const statsRes = {
            status: (code) => ({ json: (data) => console.log(`Course stats response (${code}):`, data) })
        };
        
        await getCourseStats(statsReq, statsRes);

        console.log('\n✅ Integration test completed successfully');
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

if (require.main === module) testEnrollmentFlow();
module.exports = { testEnrollmentFlow };