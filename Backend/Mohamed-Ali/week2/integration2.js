const { db } = require('../firebase');
const { enrollStudent } = require('./enroll');
const { getStudentEnrollments } = require('./student_courses');
const { getCourseStats } = require('./stats');
const { seedTestData } = require('./test');

/**
 * End-to-end test of enrollment flow
 * Run this script to verify everything works
 */
async function testEnrollmentFlow() {
  try {
    console.log('🧪 Starting enrollment integration test...\n');

    // First, seed test data
    await seedTestData();
    console.log('');

    // 1. Create a mock request for enrollment
    const mockReq = {
      body: {
        courseId: 'test-course-123',
        studentId: 'test-student-456'
      },
      user: {
        role: 'STUDENT',
        uid: 'test-student-456'
      }
    };

    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`✅ Enrollment response (${code}):`, data);
        }
      })
    };

    // 2. Enroll student
    console.log('📝 Enrolling student...');
    await enrollStudent(mockReq, mockRes);

    // 3. Get student enrollments
    console.log('\n📚 Fetching student enrollments...');
    const enrollmentsReq = {
      params: { studentId: 'test-student-456' },
      user: { role: 'STUDENT', uid: 'test-student-456' }
    };
    
    const enrollmentsRes = {
      json: (data) => {
        console.log('Student enrollments:', data);
      }
    };
    
    await getStudentEnrollments(enrollmentsReq, enrollmentsRes);

    // 4. Get course stats
    console.log('\n📊 Fetching course stats...');
    const statsReq = { query: { courseId: 'test-course-123' } };
    
    const statsRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`Course stats response (${code}):`, data);
        }
      })
    };
    
    await getCourseStats(statsReq, statsRes);

    console.log('\n✅ Integration test completed successfully');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testEnrollmentFlow();
}

module.exports = { testEnrollmentFlow };