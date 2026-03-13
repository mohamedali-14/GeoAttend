const { db } = require('../../config/firebase');

async function getLiveAttendance(req, res) {

    try {

        const { sessionId } = req.params;

        const attendanceSnap = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .get();

        const students = attendanceSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(students);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
}

async function getAttendanceReport(req, res) {

    try {

        const { sessionId } = req.params;

        const attendanceSnap = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .get();

        const report = attendanceSnap.docs.map(doc => doc.data());

        res.json(report);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
}

async function randomCheck(req, res) {

    try {

        const { sessionId } = req.params;

        await db.collection('sessions')
            .doc(sessionId)
            .update({

                randomCheck: true,
                randomCheckTime: new Date()

            });

        res.json({
            message: "Random attendance check triggered"
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
}

module.exports = {

    getLiveAttendance,
    getAttendanceReport,
    randomCheck

};