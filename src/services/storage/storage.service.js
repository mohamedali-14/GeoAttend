const { storage } = require('../../config/firebase');
const fs = require('fs');
const path = require('path');
const os = require('os');

const bucket = storage.bucket();

async function uploadFile(localPath, destination) {
    try {
        await bucket.upload(localPath, { destination });
        
        const file = bucket.file(destination);
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2500' });
        
        return url;
    } catch (error) {
        console.error('File upload failed:', error);
        throw new Error('Failed to upload file');
    }
}

async function downloadFile(source, localPath) {
    try {
        const file = bucket.file(source);
        await file.download({ destination: localPath });
    } catch (error) {
        console.error('File download failed:', error);
        throw new Error('Failed to download file');
    }
}

async function deleteFile(filePath) {
    try {
        await bucket.file(filePath).delete();
    } catch (error) {
        console.error('File deletion failed:', error);
        throw new Error('Failed to delete file');
    }
}

async function getFileUrl(filePath) {
    try {
        const file = bucket.file(filePath);
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2500' });
        return url;
    } catch (error) {
        console.error('Failed to get file URL:', error);
        throw new Error('Failed to get file URL');
    }
}

async function uploadBuffer(buffer, destination, contentType) {
    try {
        const tempPath = path.join(os.tmpdir(), `upload-${Date.now()}`);
        fs.writeFileSync(tempPath, buffer);
        
        const options = { destination, metadata: { contentType } };
        await bucket.upload(tempPath, options);
        fs.unlinkSync(tempPath);
        
        const file = bucket.file(destination);
        const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2500' });
        
        return url;
    } catch (error) {
        console.error('Buffer upload failed:', error);
        throw new Error('Failed to upload buffer');
    }
}

module.exports = { uploadFile, downloadFile, deleteFile, getFileUrl, uploadBuffer };