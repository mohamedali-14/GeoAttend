const { db, admin } = require("../config/firebase");

// CREATE a new course
async function createCourse(req, res) {
    try {
        const { name, code, professorId, department, creditHours, location, description } = req.body;

        const professorDoc = await db.collection("users").doc(professorId).get();
        if (!professorDoc.exists) {
            return res.status(400).json({ error: "Invalid professor" });
        }

        const professorData = professorDoc.data();

        const courseData = {
            name,
            code: code.toUpperCase(),
            professorId,
            professorName: professorData.fullName,
            department,
            creditHours: creditHours || 3,
            location: location || "",
            description: description || "",
            studentCount: 0,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const courseRef = await db.collection("courses").add(courseData);

        res.status(201).json({
            message: "Course created",
            course: {
                id: courseRef.id,
                ...courseData
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// GET all active courses
async function getCourses(req, res) {
    try {
        const snapshot = await db.collection("courses").where("isActive", "==", true).get();
        const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(courses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// UPDATE a course
async function updateCourse(req, res) {
    try {
        const { courseId } = req.params;

        await db.collection("courses").doc(courseId).update({
            ...req.body,
            updatedAt: new Date()
        });

        res.json({ message: "Course updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// SOFT DELETE a course
async function deleteCourse(req, res) {
    try {
        const { courseId } = req.params;

        await db.collection("courses").doc(courseId).update({
            isActive: false,
            updatedAt: new Date()
        });

        res.json({ message: "Course deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    createCourse,
    getCourses,
    updateCourse,
    deleteCourse
};