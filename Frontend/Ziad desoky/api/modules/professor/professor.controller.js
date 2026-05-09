const { db } = require('../../config/firebase');

function getDayName() {
    const days = [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY"
    ];
    return days[new Date().getDay()];
}

async function getDashboard(req, res) {

    try {

        const professorId = req.user.uid;

        const coursesSnap = await db.collection('courses')
            .where('professorId', '==', professorId)
            .where('isActive', '==', true)
            .get();

        const courses = coursesSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const today = getDayName();

        const scheduleSnap = await db.collection('schedules')
            .where('professorId', '==', professorId)
            .where('day', '==', today)
            .orderBy('startTime')
            .get();

        const todaySchedule = scheduleSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const activeSessionsSnap = await db.collection('sessions')
            .where('professorId', '==', professorId)
            .where('status', 'in', ['SCHEDULED', 'ACTIVE'])
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        const activeSessions = activeSessionsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            courses,
            todaySchedule,
            activeSessions
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
}

module.exports = {
    getDashboard
};