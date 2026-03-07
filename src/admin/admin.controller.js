const { db } = require("../../config/firebase");

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

        res.status(500).json({
            error: error.message
        });

    }

}

module.exports = {
    getAllUsers
};