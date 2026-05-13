const { db } = require('../firebase');

async function saveToken(userId, token) {
  await db.collection('users').doc(userId).collection('fcm_tokens').add({
    token,
    createdAt: new Date()
  });
  console.log('Token saved for user', userId);
}

saveToken('student123', 'sample_fcm_token_xyz');