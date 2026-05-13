const { db } = require("../../config/firebase");

async function getAllUsers() {

    const snapshot = await db.collection("users").get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

}

async function getUserById(id) {

    const doc = await db
        .collection("users")
        .doc(id)
        .get();

    if (!doc.exists) {
        throw new Error("User not found");
    }

    return doc.data();

}

module.exports = {
    getAllUsers,
    getUserById
};