const { db } = require('../config/firebase');

/**
 * Save FCM token for a user
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @param {string} device - Device type (default: 'mobile')
 * @returns {Promise<Object>} Saved token info
 */
async function saveFCMToken(userId, token, device = 'mobile') {
  const tokenRef = await db.collection('users').doc(userId).collection('fcm_tokens').add({
    token,
    device,
    createdAt: new Date()
  });
  
  return {
    id: tokenRef.id,
    userId,
    token,
    device
  };
}

/**
 * Get all FCM tokens for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of token objects
 */
async function getUserTokens(userId) {
  const snapshot = await db.collection('users')
    .doc(userId)
    .collection('fcm_tokens')
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Delete an FCM token
 * @param {string} userId - User ID
 * @param {string} tokenId - Token document ID
 * @returns {Promise<void>}
 */
async function deleteToken(userId, tokenId) {
  await db.collection('users')
    .doc(userId)
    .collection('fcm_tokens')
    .doc(tokenId)
    .delete();
}

module.exports = {
  saveFCMToken,
  getUserTokens,
  deleteToken
};