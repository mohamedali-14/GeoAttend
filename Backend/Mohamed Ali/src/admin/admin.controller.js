const { db } = require("../../config/firebase");

// GET all users with optional role filter and pagination
async function getAllUsers(req, res) {
    try {
        const { role, limit = 20, startAfter } = req.query;

        let query = db.collection("users").orderBy("createdAt", "desc");

        if (role) {
            query = query.where("role", "==", role);
        }

        query = query.limit(parseInt(limit));

        if (startAfter) {
            const startDoc = await db.collection("users").doc(startAfter).get();
            if (startDoc.exists) {
                query = query.startAfter(startDoc);
            }
        }

        const snapshot = await query.get();

        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const lastDoc = snapshot.docs[snapshot.docs.length - 1];

        res.json({
            users,
            nextCursor: lastDoc ? lastDoc.id : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// UPDATE user info
async function editUser(req, res) {
    try {
        const { userId } = req.params;
        const { fullName, role } = req.body;

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }

        await userRef.update({
            fullName,
            role,
            updatedAt: new Date()
        });

        res.json({ message: "User updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// SOFT DELETE user (deactivate)
async function deleteUser(req, res) {
    try {
        const { userId } = req.params;
        const userRef = db.collection("users").doc(userId);

        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }

        await userRef.update({
            isActive: false,
            updatedAt: new Date()
        });

        res.json({ message: "User deactivated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Export all functions
module.exports = {
    getAllUsers,
    editUser,
    deleteUser
};