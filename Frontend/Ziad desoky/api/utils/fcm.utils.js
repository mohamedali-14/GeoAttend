const { db } = require('../config/firebase');

async function saveFCMToken(userId, token, device = 'mobile') {
    const tokenRef = await db.collection('users').doc(userId).collection('fcm_tokens').add({
        token,
        device,
        createdAt: new Date()
    });
    
    return { id: tokenRef.id, userId, token, device };
}

async function getUserTokens(userId) {
    const snapshot = await db.collection('users').doc(userId).collection('fcm_tokens')
        .orderBy('createdAt', 'desc')
        .get();
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function deleteToken(userId, tokenId) {
    await db.collection('users').doc(userId).collection('fcm_tokens').doc(tokenId).delete();
}

module.exports = { saveFCMToken, getUserTokens, deleteToken };