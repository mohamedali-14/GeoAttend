const { db, admin } = require("../config/firebase");

// CREATE a new schedule
async function createSchedule(req, res) {
    try {
        const { courseId, day, startTime, endTime, room, location } = req.body;

        const courseDoc = await db.collection("courses").doc(courseId).get();
        if (!courseDoc.exists) {
            return res.status(404).json({ error: "Course not found" });
        }

        const scheduleData = {
            courseId,
            courseName: courseDoc.data().name,
            professorId: courseDoc.data().professorId,
            day,
            startTime,
            endTime,
            room: room || "",
            location: location || null,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const scheduleRef = await db.collection("schedules").add(scheduleData);

        res.status(201).json({
            message: "Schedule created",
            schedule: {
                id: scheduleRef.id,
                ...scheduleData
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET schedules with optional filters: courseId, professorId, day
async function getSchedules(req, res) {
    try {
        const { courseId, professorId, day } = req.query;

        let query = db.collection("schedules");

        if (courseId) query = query.where("courseId", "==", courseId);
        if (professorId) query = query.where("professorId", "==", professorId);
        if (day) query = query.where("day", "==", day);

        const snapshot = await query.get();

        const schedules = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json(schedules);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    createSchedule,
    getSchedules
};