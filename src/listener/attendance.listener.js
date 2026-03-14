const { db } = require('../config/firebase');
const { notifyStudentsSessionStarted } = require('../services/storage/notification.service');

function listenToSessionChanges() {
    console.log('Setting up real-time listener for sessions...');
    
    return db.collection('sessions')
        .where('status', '==', 'SCHEDULED')
        .onSnapshot(async (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'modified' && change.doc.data().status === 'ACTIVE') {
                    const sessionData = { id: change.doc.id, ...change.doc.data() };
                    console.log(`Session ${sessionData.id} is now ACTIVE, sending notifications...`);
                    await notifyStudentsSessionStarted(sessionData);
                }
            });
        }, (error) => {
            console.error('Error in session listener:', error);
        });
}

function listenToAttendanceChanges(sessionId, callback) {
    return db.collection('attendance')
        .where('sessionId', '==', sessionId)
        .onSnapshot((snapshot) => {
            const attendance = [];
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' || change.type === 'modified') {
                    attendance.push({ id: change.doc.id, ...change.doc.data(), changeType: change.type });
                }
            });
            if (attendance.length > 0) callback(attendance);
        }, (error) => {
            console.error('Error in attendance listener:', error);
        });
}

function getLiveAttendanceCount(sessionId, callback) {
    return db.collection('attendance')
        .where('sessionId', '==', sessionId)
        .onSnapshot((snapshot) => {
            callback({ sessionId, count: snapshot.size, timestamp: new Date().toISOString() });
        });
}

module.exports = { listenToSessionChanges, listenToAttendanceChanges, getLiveAttendanceCount };