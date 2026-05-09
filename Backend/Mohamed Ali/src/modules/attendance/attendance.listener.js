const { db } = require('../config/firebase');
const { 
    notifyStudentsSessionStarted, 
    sendLectureReminder,
    notifyLowAttendance 
} = require('../services/notification.service');

/**
 * Set up real-time listener for session status changes
 * Listens for sessions changing from SCHEDULED to ACTIVE
 */
function listenToSessionChanges() {
    console.log('Setting up real-time listener for sessions...');
    
    return db.collection('sessions')
        .where('status', '==', 'SCHEDULED')
        .onSnapshot(async (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                // When a session status changes to ACTIVE
                if (change.type === 'modified' && change.doc.data().status === 'ACTIVE') {
                    const sessionData = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    console.log(`Session ${sessionData.id} is now ACTIVE, sending notifications...`);
                    await notifyStudentsSessionStarted(sessionData);
                }
            });
        }, (error) => {
            console.error('Error in session listener:', error);
        });
}

/**
 * Listen for upcoming sessions and send reminders
 * This runs on server startup and periodically checks
 */
function listenForUpcomingSessions() {
    console.log('Setting up listener for upcoming sessions...');
    
    // Initial check
    checkAndSendReminders();
    
    // Check every 15 minutes
    setInterval(checkAndSendReminders, 15 * 60 * 1000);
}

async function checkAndSendReminders() {
    try {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        const sessionsSnap = await db.collection('sessions')
            .where('status', '==', 'SCHEDULED')
            .get();
        
        for (const doc of sessionsSnap.docs) {
            const session = { id: doc.id, ...doc.data() };
            
            if (session.scheduledDate && session.startTime) {
                const sessionStart = new Date(`${session.scheduledDate}T${session.startTime}`);
                const minutesUntilStart = Math.floor((sessionStart - now) / (1000 * 60));
                
                // Send reminder 60 minutes before, 30 minutes before, and 15 minutes before
                if (minutesUntilStart === 60 || minutesUntilStart === 30 || minutesUntilStart === 15) {
                    if (!session.reminderSent || session.reminderSent < minutesUntilStart) {
                        await sendLectureReminder(session, minutesUntilStart);
                        
                        // Mark reminder as sent
                        await db.collection('sessions').doc(session.id).update({
                            [`reminderSent_${minutesUntilStart}`]: true,
                            updatedAt: new Date()
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error checking reminders:', error);
    }
}

/**
 * Listen for new attendance records in real-time
 * @param {string} sessionId - Session ID to listen to
 * @param {function} callback - Callback function when attendance changes
 */
function listenToAttendanceChanges(sessionId, callback) {
    console.log(`Setting up real-time listener for attendance in session ${sessionId}...`);
    
    return db.collection('attendance')
        .where('sessionId', '==', sessionId)
        .onSnapshot((snapshot) => {
            const attendance = [];
            
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    attendance.push({
                        id: change.doc.id,
                        ...change.doc.data(),
                        changeType: 'added'
                    });
                } else if (change.type === 'modified') {
                    attendance.push({
                        id: change.doc.id,
                        ...change.doc.data(),
                        changeType: 'modified'
                    });
                }
            });
            
            if (attendance.length > 0) {
                callback(attendance);
            }
        }, (error) => {
            console.error('Error in attendance listener:', error);
        });
}

/**
 * Get live attendance count for a session
 * @param {string} sessionId - Session ID
 * @param {function} callback - Callback with { sessionId, count, timestamp }
 */
function getLiveAttendanceCount(sessionId, callback) {
    console.log(`Setting up live attendance count for session ${sessionId}...`);
    
    let lastCount = 0;
    
    return db.collection('attendance')
        .where('sessionId', '==', sessionId)
        .onSnapshot((snapshot) => {
            const currentCount = snapshot.size;
            
            // Only trigger callback if count changed
            if (currentCount !== lastCount) {
                lastCount = currentCount;
                
                callback({
                    sessionId,
                    count: currentCount,
                    timestamp: new Date().toISOString()
                });
            }
        }, (error) => {
            console.error('Error in live attendance count:', error);
        });
}

/**
 * Listen for low attendance and send alerts
 * @param {string} sessionId - Session ID
 * @param {number} totalEnrolled - Total enrolled students
 * @param {function} callback - Callback when threshold is crossed
 */
function listenForLowAttendance(sessionId, totalEnrolled, callback) {
    console.log(`Setting up low attendance listener for session ${sessionId}...`);
    
    let lastPercentage = 0;
    const thresholds = [25, 50, 75]; // Alert at 25%, 50%, 75%
    
    return db.collection('attendance')
        .where('sessionId', '==', sessionId)
        .onSnapshot(async (snapshot) => {
            const currentCount = snapshot.size;
            const percentage = Math.round((currentCount / totalEnrolled) * 100);
            
            // Check if we crossed a threshold
            for (const threshold of thresholds) {
                if (percentage >= threshold && lastPercentage < threshold) {
                    callback({
                        sessionId,
                        attendanceCount: currentCount,
                        percentage,
                        threshold,
                        totalEnrolled
                    });
                    
                    // Send notification to professor
                    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
                    if (sessionDoc.exists) {
                        const session = sessionDoc.data();
                        await notifyLowAttendance(sessionId, session.courseId, percentage);
                    }
                }
            }
            
            lastPercentage = percentage;
        }, (error) => {
            console.error('Error in low attendance listener:', error);
        });
}

/**
 * Start all listeners
 */
function startAllListeners() {
    console.log('🚀 Starting all Firestore listeners...');
    
    listenToSessionChanges();
    listenForUpcomingSessions();
    
    console.log('✅ All listeners started successfully');
}

module.exports = {
    listenToSessionChanges,
    listenForUpcomingSessions,
    listenToAttendanceChanges,
    getLiveAttendanceCount,
    listenForLowAttendance,
    startAllListeners
};