const QRCode = require('qrcode');
const { storage } = require('../config/firebase');
const fs = require('fs');
const path = require('path');
const os = require('os');

const bucket = storage.bucket();

async function generateAndUploadQR(sessionId) {
    try {
        const qrBuffer = await QRCode.toBuffer(sessionId);
        
        const tempPath = path.join(os.tmpdir(), `qr-${sessionId}-${Date.now()}.png`);
        fs.writeFileSync(tempPath, qrBuffer);
        
        const destination = `qr_codes/${sessionId}.png`;
        await bucket.upload(tempPath, { destination });
        
        const file = bucket.file(destination);
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2500' });
        
        fs.unlinkSync(tempPath);
        return url;
    } catch (error) {
        console.error('QR generation failed:', error);
        throw new Error('Failed to generate QR code');
    }
}

async function generateQRDataURL(data) {
    try {
        return await QRCode.toDataURL(data);
    } catch (error) {
        console.error('QR data URL generation failed:', error);
        throw new Error('Failed to generate QR data URL');
    }
}

async function generateQRBuffer(data) {
    try {
        return await QRCode.toBuffer(data);
    } catch (error) {
        console.error('QR buffer generation failed:', error);
        throw new Error('Failed to generate QR buffer');
    }
}

module.exports = { generateAndUploadQR, generateQRDataURL, generateQRBuffer };