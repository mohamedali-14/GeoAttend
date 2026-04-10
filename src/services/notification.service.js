const { messaging, db, admin } = require('../config/firebase');

/**
 * Send push notification to a single device
 * @param {string} token - FCM device token
 * @param {object} notification - { title, body }
 * @param {object} data - Additional data payload
 */
async function sendToDevice(token, notification, data = {}) {
    try {
        const message = {
            notification,
            data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
            token
        };
        const response = await messaging.send(message);
        console.log('Notification sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
}

/**
 * Send push notification to multiple devices
 * @param {string[]} tokens - Array of FCM device tokens
 * @param {object} notification - { title, body }
 * @param {object} data - Additional data payload
 */
async function sendToMultipleDevices(tokens, notification, data = {}) {
    try {
        if (!tokens || tokens.length === 0) {
            console.log('No tokens to send notifications to');
            return;
        }
        
        const message = {
            notification,
            data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
            tokens
        };
        
        const response = await messaging.sendMulticast(message);
        console.log(`Notifications sent: ${response.successCount} successful, ${response.failureCount} failed`);
        
        // Handle failed tokens (optional: remove invalid tokens)
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Failed token: ${tokens[idx]}`, resp.error);
                }
            });
        }
        
        return response;
    } catch (error) {
        console.error('Error sending multicast notifications:', error);
        throw error;
    }
}

/**
 * Save FCM token for a user
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @param {string} deviceType - 'android', 'ios', 'web'
 */
async function saveUserToken(userId, token, deviceType = 'android') {
    try {
        // Check if token already exists
        const existingToken = await db.collection('users')
            .doc(userId)
            .collection('fcm_tokens')
            .where('token', '==', token)
            .limit(1)
            .get();
        
        if (!existingToken.empty) {
            // Update existing token
            const tokenDoc = existingToken.docs[0];
            await tokenDoc.ref.update({
                lastUsed: admin.firestore.FieldValue.serverTimestamp(),
                deviceType
            });
            console.log(`FCM token updated for user ${userId}`);
            return tokenDoc.id;
        }
        
        // Create new token
        const tokenRef = await db.collection('users')
            .doc(userId)
            .collection('fcm_tokens')
            .add({
                token,
                deviceType,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastUsed: admin.firestore.FieldValue.serverTimestamp()
            });
        
        // Also update the main user document with the latest token
        await db.collection('users').doc(userId).update({
            fcmToken: token,
            fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`FCM token saved for user ${userId}`);
        return tokenRef.id;
    } catch (error) {
        console.error('Error saving FCM token:', error);
        throw error;
    }
}

/**
 * Get all valid FCM tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} Array of tokens
 */
async function getUserTokens(userId) {
    try {
        const tokensSnapshot = await db.collection('users')
            .doc(userId)
            .collection('fcm_tokens')
            .orderBy('createdAt', 'desc')
            .get();
        
        return tokensSnapshot.docs.map(doc => doc.data().token);
    } catch (error) {
        console.error('Error getting user tokens:', error);
        return [];
    }
}

/**
 * Remove invalid FCM token
 * @param {string} userId - User ID
 * @param {string} token - Invalid token to remove
 */
async function removeInvalidToken(userId, token) {
    try {
        const tokensSnapshot = await db.collection('users')
            .doc(userId)
            .collection('fcm_tokens')
            .where('token', '==', token)
            .get();
        
        const batch = db.batch();
        tokensSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        console.log(`Removed invalid token for user ${userId}`);
    } catch (error) {
        console.error('Error removing invalid token:', error);
    }
}

/**
 * Send notification to students when session starts
 * @param {object} sessionData - Session data object
 */
async function notifyStudentsSessionStarted(sessionData) {
    try {
        // Get all enrolled students for this course
        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', sessionData.courseId)
            .where('status', '==', 'ACTIVE')
            .get();
        
        if (enrollmentsSnap.empty) {
            console.log('No enrolled students for this course');
            return;
        }
        
        const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);
        console.log(`Found ${studentIds.length} enrolled students`);
        
        // Get all FCM tokens for these students
        const tokens = [];
        for (const studentId of studentIds) {
            const userTokens = await getUserTokens(studentId);
            tokens.push(...userTokens);
        }
        
        if (tokens.length === 0) {
            console.log('No FCM tokens found for students');
            return;
        }
        
        console.log(`Sending notifications to ${tokens.length} devices`);
        
        const notification = {
            title: `📚 ${sessionData.courseName} - Lecture Started`,
            body: `Professor ${sessionData.professorName} has started the lecture. Tap to mark attendance.`
        };
        
        const data = {
            type: 'SESSION_STARTED',
            sessionId: sessionData.id,
            courseId: sessionData.courseId,
            courseName: sessionData.courseName,
            timestamp: new Date().toISOString()
        };
        
        const response = await sendToMultipleDevices(tokens, notification, data);
        
        // Log the notification
        await db.collection('notifications').add({
            type: 'SESSION_STARTED',
            sessionId: sessionData.id,
            courseId: sessionData.courseId,
            sentCount: response?.successCount || 0,
            failedCount: response?.failureCount || 0,
            totalTokens: tokens.length,
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return response;
    } catch (error) {
        console.error('Error in notifyStudentsSessionStarted:', error);
        throw error;
    }
}

/**
 * Send reminder notification before lecture
 * @param {object} sessionData - Session data object
 * @param {number} minutesBefore - Minutes before session start (default: 60)
 */
async function sendLectureReminder(sessionData, minutesBefore = 60) {
    try {
        // Get all enrolled students
        const enrollmentsSnap = await db.collection('enrollments')
            .where('courseId', '==', sessionData.courseId)
            .where('status', '==', 'ACTIVE')
            .get();
        
        if (enrollmentsSnap.empty) {
            console.log('No enrolled students for this course');
            return;
        }
        
        const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);
        
        // Get FCM tokens
        const tokens = [];
        for (const studentId of studentIds) {
            const userTokens = await getUserTokens(studentId);
            tokens.push(...userTokens);
        }
        
        if (tokens.length === 0) {
            console.log('No FCM tokens found for students');
            return;
        }
        
        const notification = {
            title: `⏰ Reminder: ${sessionData.courseName}`,
            body: `Your lecture starts in ${minutesBefore} minutes. Be ready!`
        };
        
        const data = {
            type: 'SESSION_REMINDER',
            sessionId: sessionData.id,
            courseId: sessionData.courseId,
            courseName: sessionData.courseName,
            minutesBefore: minutesBefore.toString()
        };
        
        const response = await sendToMultipleDevices(tokens, notification, data);
        
        // Log notification
        await db.collection('notifications').add({
            type: 'SESSION_REMINDER',
            sessionId: sessionData.id,
            courseId: sessionData.courseId,
            sentCount: response?.successCount || 0,
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return response;
    } catch (error) {
        console.error('Error sending lecture reminder:', error);
        throw error;
    }
}

/**
 * Send attendance marked confirmation to student
 */
async function sendAttendanceConfirmation(studentId, sessionData) {
    try {
        const tokens = await getUserTokens(studentId);
        
        if (tokens.length === 0) return;
        
        const notification = {
            title: `✅ Attendance Marked`,
            body: `Your attendance for ${sessionData.courseName} has been recorded.`
        };
        
        const data = {
            type: 'ATTENDANCE_MARKED',
            sessionId: sessionData.id,
            courseId: sessionData.courseId,
            courseName: sessionData.courseName
        };
        
        return await sendToMultipleDevices(tokens, notification, data);
    } catch (error) {
        console.error('Error sending attendance confirmation:', error);
    }
}

/**
 * Send notification to professor about low attendance
 */
async function notifyLowAttendance(sessionId, courseId, attendancePercentage) {
    try {
        const courseDoc = await db.collection('courses').doc(courseId).get();
        if (!courseDoc.exists) return;
        
        const course = courseDoc.data();
        const professorId = course.professorId;
        
        const tokens = await getUserTokens(professorId);
        
        if (tokens.length === 0) return;
        
        const notification = {
            title: `⚠️ Low Attendance Alert`,
            body: `Session attendance is only ${attendancePercentage}%. Consider sending reminders.`
        };
        
        const data = {
            type: 'LOW_ATTENDANCE',
            sessionId,
            courseId,
            courseName: course.name,
            attendancePercentage: attendancePercentage.toString()
        };
        
        return await sendToMultipleDevices(tokens, notification, data);
    } catch (error) {
        console.error('Error sending low attendance notification:', error);
    }
}

/**
 * Auto-send reminders for upcoming sessions (cron job)
 */
async function sendUpcomingSessionReminders() {
    try {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        // Find sessions starting in the next hour
        const sessionsSnap = await db.collection('sessions')
            .where('status', '==', 'SCHEDULED')
            .where('scheduledDate', '>=', now.toISOString().split('T')[0])
            .get();
        
        console.log(`Found ${sessionsSnap.size} scheduled sessions`);
        
        for (const doc of sessionsSnap.docs) {
            const session = { id: doc.id, ...doc.data() };
            
            // Check if session starts within the next hour
            const sessionStart = new Date(session.scheduledDate + 'T' + session.startTime);
            const timeDiff = sessionStart - now;
            const minutesUntilStart = Math.floor(timeDiff / (1000 * 60));
            
            if (minutesUntilStart <= 60 && minutesUntilStart > 0) {
                await sendLectureReminder(session, minutesUntilStart);
            }
        }
    } catch (error) {
        console.error('Error sending upcoming session reminders:', error);
    }
}

module.exports = {
    sendToDevice,
    sendToMultipleDevices,
    saveUserToken,
    getUserTokens,
    removeInvalidToken,
    notifyStudentsSessionStarted,
    sendLectureReminder,
    sendAttendanceConfirmation,
    notifyLowAttendance,
    sendUpcomingSessionReminders
};