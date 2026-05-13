const { db, admin } = require("../config/firebase");

async function createCourse(req, res) {
    try {
        const { name, code, professorId, department, creditHours, location, description, schedule } = req.body;

        const professorDoc = await db.collection("users").doc(professorId).get();
        if (!professorDoc.exists) {
            return res.status(400).json({ error: "Invalid professor" });
        }

        const professorData = professorDoc.data();
        const courseData = {
            name,
            code: code?.toUpperCase() || "",
            professorId,
            professorName: professorData.fullName,
            department: department || "",
            creditHours: creditHours || 3,
            location: location || "",
            description: description || "",
            schedule: schedule || null,
            prerequisites: [],
            studentCount: 0,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const courseRef = await db.collection("courses").add(courseData);
        res.status(201).json({ message: "Course created", course: { id: courseRef.id, ...courseData } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getCourses(req, res) {
    try {
        const { professorId } = req.query;
        let query = db.collection("courses").where("isActive", "==", true);
        
        if (professorId) {
            query = query.where("professorId", "==", professorId);
        }
        
        const snapshot = await query.orderBy("createdAt", "desc").get();
        const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(courses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getCourse(req, res) {
    try {
        const { courseId } = req.params;
        const courseDoc = await db.collection("courses").doc(courseId).get();
        
        if (!courseDoc.exists) {
            return res.status(404).json({ error: "Course not found" });
        }
        
        res.json({ id: courseDoc.id, ...courseDoc.data() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateCourse(req, res) {
    try {
        const { courseId } = req.params;
        const courseRef = db.collection("courses").doc(courseId);
        
        const courseDoc = await courseRef.get();
        if (!courseDoc.exists) {
            return res.status(404).json({ error: "Course not found" });
        }

        await courseRef.update({ ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.json({ message: "Course updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteCourse(req, res) {
    try {
        const { courseId } = req.params;
        const courseRef = db.collection("courses").doc(courseId);
        
        const courseDoc = await courseRef.get();
        if (!courseDoc.exists) {
            return res.status(404).json({ error: "Course not found" });
        }

        await courseRef.update({ isActive: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        res.json({ message: "Course deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { createCourse, getCourses, getCourse, updateCourse, deleteCourse };