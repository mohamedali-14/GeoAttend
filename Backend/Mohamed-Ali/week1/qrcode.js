const QRCode = require('qrcode');
const { storage } = require('../firebase');
const fs = require('fs');
const path = require('path');

async function generateQR(sessionId) {
  const qrBuffer = await QRCode.toBuffer(sessionId);
  const tempPath = path.join(__dirname, `qr-${sessionId}.png`);
  fs.writeFileSync(tempPath, qrBuffer);
  const bucket = storage.bucket();
  await bucket.upload(tempPath, { destination: `qr_codes/${sessionId}.png` });
  console.log('QR code uploaded for session', sessionId);
  fs.unlinkSync(tempPath);
}

generateQR('Distributed Systems Lecture 1');