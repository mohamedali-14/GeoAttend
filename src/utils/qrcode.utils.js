const QRCode = require('qrcode');
const { storage } = require('../config/firebase');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Generate a QR code and upload it to Firebase Storage
 * @param {string} sessionId - Session ID to encode in the QR code
 * @returns {Promise<string>} Public URL of the uploaded QR code
 */
async function generateAndUploadQR(sessionId) {
  try {
    // Generate QR code as buffer
    const qrBuffer = await QRCode.toBuffer(sessionId);
    
    // Create temporary file
    const tempPath = path.join(os.tmpdir(), `qr-${sessionId}-${Date.now()}.png`);
    fs.writeFileSync(tempPath, qrBuffer);
    
    // Upload to Storage
    const bucket = storage.bucket();
    const destination = `qr_codes/${sessionId}.png`;
    await bucket.upload(tempPath, { destination });
    
    // Get signed URL (valid for long time)
    const file = bucket.file(destination);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2500' // Far future expiration
    });
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    
    return url;
  } catch (error) {
    console.error('QR generation failed:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate a QR code as a data URL (for embedding in HTML)
 * @param {string} data - Data to encode
 * @returns {Promise<string>} Data URL
 */
async function generateQRDataURL(data) {
  try {
    return await QRCode.toDataURL(data);
  } catch (error) {
    console.error('QR data URL generation failed:', error);
    throw new Error('Failed to generate QR data URL');
  }
}

module.exports = {
  generateAndUploadQR,
  generateQRDataURL
};