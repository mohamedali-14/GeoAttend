const { db, admin } = require("../../config/firebase");

async function createCourse(req, res) {

    try {

        const {
            name,
            code,
            professorId,
            department,
            creditHours,
            location,
            description
        } = req.body;

        const professorDoc = await db.collection("users").doc(professorId).get();

        if (!professorDoc.exists || professorDoc.data().role !== "PROFESSOR") {

            return res.status(400).json({
                error: "Invalid professor ID"
            });

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
            isActive: true,
            studentCount: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()

        };

        const courseRef = await db.collection("courses").add(courseData);

        res.status(201).json({

            message: "Course created successfully",
            course: {
                id: courseRef.id,
                ...courseData
            }

        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

}

module.exports = {
    createCourse
};