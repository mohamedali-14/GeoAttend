const { db, admin } = require("../config/firebase");

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
            day: day?.toUpperCase(),
            startTime,
            endTime,
            room: room || "",
            location: location || null,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const scheduleRef = await db.collection("schedules").add(scheduleData);
        res.status(201).json({ message: "Schedule created", schedule: { id: scheduleRef.id, ...scheduleData } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getSchedules(req, res) {
    try {
        const { courseId, professorId, day } = req.query;
        let query = db.collection("schedules").where("isActive", "==", true);

        if (courseId) query = query.where("courseId", "==", courseId);
        if (professorId) query = query.where("professorId", "==", professorId);
        if (day) query = query.where("day", "==", day.toUpperCase());

        const snapshot = await query.orderBy("day").orderBy("startTime").get();
        const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteSchedule(req, res) {
    try {
        const { scheduleId } = req.params;
        const scheduleRef = db.collection("schedules").doc(scheduleId);
        
        const scheduleDoc = await scheduleRef.get();
        if (!scheduleDoc.exists) {
            return res.status(404).json({ error: "Schedule not found" });
        }

        await scheduleRef.update({ isActive: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.json({ message: "Schedule deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { createSchedule, getSchedules, deleteSchedule };