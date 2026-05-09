const { messaging, db, admin } = require('../../config/firebase');

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
        
        return response;
    } catch (error) {
        console.error('Error sending multicast notifications:', error);
        throw error;
    }
}

async function saveUserToken(userId, token, deviceType = 'android') {
    try {
        const tokenRef = await db.collection('users').doc(userId).collection('fcm_tokens').add({
            token,
            deviceType,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUsed: admin.firestore.FieldValue.serverTimestamp()
        });
        
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

async function getUserTokens(userId) {
    try {
        const tokensSnapshot = await db.collection('users').doc(userId).collection('fcm_tokens')
            .orderBy('createdAt', 'desc')
            .get();
        
        return tokensSnapshot.docs.map(doc => doc.data().token);
    } catch (error) {
        console.error('Error getting user tokens:', error);
        return [];
    }
}

async function notifyStudentsSessionStarted(sessionData) {
    try {
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
            courseName: sessionData.courseName
        };
        
        const response = await sendToMultipleDevices(tokens, notification, data);
        
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

async function sendLectureReminders() {
    try {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        
        const currentTime = formatTime(now);
        const laterTime = formatTime(oneHourLater);
        
        const sessionsSnap = await db.collection('sessions')
            .where('status', '==', 'SCHEDULED')
            .where('startTime', '>=', currentTime)
            .where('startTime', '<=', laterTime)
            .get();
        
        console.log(`Found ${sessionsSnap.size} sessions starting soon`);
        
        for (const doc of sessionsSnap.docs) {
            const session = { id: doc.id, ...doc.data() };
            
            const enrollmentsSnap = await db.collection('enrollments')
                .where('courseId', '==', session.courseId)
                .where('status', '==', 'ACTIVE')
                .get();
            
            const studentIds = enrollmentsSnap.docs.map(d => d.data().studentId);
            
            const tokens = [];
            for (const studentId of studentIds) {
                const userTokens = await getUserTokens(studentId);
                tokens.push(...userTokens);
            }
            
            if (tokens.length > 0) {
                const notification = {
                    title: `⏰ Reminder: ${session.courseName}`,
                    body: `Your lecture starts in about 1 hour. Be ready!`
                };
                
                const data = {
                    type: 'SESSION_REMINDER',
                    sessionId: session.id,
                    courseId: session.courseId
                };
                
                const response = await sendToMultipleDevices(tokens, notification, data);
                
                await db.collection('notifications').add({
                    type: 'SESSION_REMINDER',
                    sessionId: session.id,
                    courseId: session.courseId,
                    sentCount: response?.successCount || 0,
                    sentAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    } catch (error) {
        console.error('Error sending lecture reminders:', error);
    }
}

function formatTime(date) {
    return date.toTimeString().slice(0, 5);
}

module.exports = {
    sendToDevice,
    sendToMultipleDevices,
    saveUserToken,
    getUserTokens,
    notifyStudentsSessionStarted,
    sendLectureReminders
};