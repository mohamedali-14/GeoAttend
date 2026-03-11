const { db, storage } = require('../firebase');
const geofire = require('geofire-common');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function run() {
  // 1. Create a session with geohash
  const sessionData = {
    professorId: 'prof123',
    courseId: 'course456',
    lat: 40.7128,
    lng: -74.0060,
    geohash: geofire.geohashForLocation([40.7128, -74.0060]),
    startTime: new Date()
  };
  const sessionRef = await db.collection('sessions').add(sessionData);
  console.log('Session created:', sessionRef.id);

  // 2. Generate QR code and upload to Storage
  const qrBuffer = await QRCode.toBuffer(sessionRef.id);
  const tempPath = path.join(__dirname, 'qr.png');
  fs.writeFileSync(tempPath, qrBuffer);
  await storage.bucket().upload(tempPath, { destination: `qr_codes/${sessionRef.id}.png` });
  console.log('QR uploaded');
  fs.unlinkSync(tempPath);

  // 3. Student marks attendance
  await db.collection('attendance').add({
    sessionId: sessionRef.id,
    studentId: 'student789',
    timestamp: new Date()
  });
  console.log('Attendance recorded');

  // 4. Verify attendance count
  const attendanceSnap = await db.collection('attendance').where('sessionId', '==', sessionRef.id).get();
  console.log('Attendance count:', attendanceSnap.size);
}

run().catch(console.error);