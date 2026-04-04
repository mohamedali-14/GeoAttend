const { testAuth } = require('./auth.test');
const { testGetCourses, testCreateCourse, testEnrollStudent } = require('./courses.test');
const { createTestSession, startSession, testJoinSession, testGetSessionSummary } = require('./attendance.test');
const { testGenerateReport, testRandomCheck } = require('./notifications.test');

const API_URL = 'http://localhost:5000';

async function runFullIntegrationTest() {
    console.log('═══════════════════════════════════════════════════');
    console.log('🔄 COMPLETE INTEGRATION TEST - ALL FEATURES');
    console.log('═══════════════════════════════════════════════════\n');
    
    // Step 1: Authentication
    console.log('📌 STEP 1: Authentication');
    console.log('─────────────────────────');
    const professorToken = await testAuth();
    if (!professorToken) {
        console.log('❌ Integration test failed: Cannot authenticate');
        return;
    }
    
    // Step 2: Course Management
    console.log('\n📌 STEP 2: Course Management');
    console.log('─────────────────────────');
    const courses = await testGetCourses(professorToken);
    const newCourse = await testCreateCourse(professorToken);
    
    // Step 3: Enrollment
    console.log('\n📌 STEP 3: Enrollment');
    console.log('─────────────────────────');
    await testEnrollStudent(professorToken, 'test-course-123', 'test-student-456');
    
    // Step 4: Session Creation
    console.log('\n📌 STEP 4: Session Creation & Management');
    console.log('─────────────────────────');
    const session = await createTestSession(professorToken, 'test-course-123');
    if (!session) {
        console.log('❌ Integration test failed: Cannot create session');
        return;
    }
    
    await startSession(professorToken, session.id);
    
    // Step 5: GPS Attendance
    console.log('\n📌 STEP 5: GPS Attendance Marking');
    console.log('─────────────────────────');
    await testJoinSession(professorToken, session.id, 40.7128, -74.0060);
    
    // Step 6: Reports
    console.log('\n📌 STEP 6: Reports Generation');
    console.log('─────────────────────────');
    await testGenerateReport(professorToken, session.id);
    
    // Step 7: Session Summary
    console.log('\n📌 STEP 7: Session Summary');
    console.log('─────────────────────────');
    await testGetSessionSummary(professorToken, session.id);
    
    // Step 8: Random Check
    console.log('\n📌 STEP 8: Random Attendance Check');
    console.log('─────────────────────────');
    await testRandomCheck(professorToken, session.id);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✅ INTEGRATION TEST COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════\n');
}

if (require.main === module) {
    runFullIntegrationTest();
}

module.exports = { runFullIntegrationTest };