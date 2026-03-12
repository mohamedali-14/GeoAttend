const { storage } = require('../../config/firebase');
const fs = require('fs');
const path = require('path');
const os = require('os');

const bucket = storage.bucket();

/**
 * Upload a file to Firebase Storage
 * @param {string} localPath - Path to local file
 * @param {string} destination - Storage destination path
 * @returns {Promise<string>} Public URL of the uploaded file
 */
async function uploadFile(localPath, destination) {
  try {
    await bucket.upload(localPath, { destination });
    
    // Get signed URL
    const file = bucket.file(destination);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2500'
    });
    
    return url;
  } catch (error) {
    console.error('File upload failed:', error);
    throw new Error('Failed to upload file');
  }
}

/**
 * Download a file from Firebase Storage
 * @param {string} source - Storage source path
 * @param {string} localPath - Local destination path
 * @returns {Promise<void>}
 */
async function downloadFile(source, localPath) {
  try {
    const file = bucket.file(source);
    await file.download({ destination: localPath });
  } catch (error) {
    console.error('File download failed:', error);
    throw new Error('Failed to download file');
  }
}

/**
 * Delete a file from Firebase Storage
 * @param {string} filePath - Storage path of the file to delete
 * @returns {Promise<void>}
 */
async function deleteFile(filePath) {
  try {
    await bucket.file(filePath).delete();
  } catch (error) {
    console.error('File deletion failed:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Get a signed URL for a file
 * @param {string} filePath - Storage path of the file
 * @returns {Promise<string>} Signed URL
 */
async function getFileUrl(filePath) {
  try {
    const file = bucket.file(filePath);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2500'
    });
    return url;
  } catch (error) {
    console.error('Failed to get file URL:', error);
    throw new Error('Failed to get file URL');
  }
}

/**
 * Upload a buffer directly to Storage
 * @param {Buffer} buffer - File buffer
 * @param {string} destination - Storage destination path
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} Public URL
 */
async function uploadBuffer(buffer, destination, contentType) {
  try {
    // Create temporary file
    const tempPath = path.join(os.tmpdir(), `upload-${Date.now()}`);
    fs.writeFileSync(tempPath, buffer);
    
    // Upload options
    const options = {
      destination,
      metadata: {
        contentType
      }
    };
    
    await bucket.upload(tempPath, options);
    fs.unlinkSync(tempPath);
    
    // Get signed URL
    const file = bucket.file(destination);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2500'
    });
    
    return url;
  } catch (error) {
    console.error('Buffer upload failed:', error);
    throw new Error('Failed to upload buffer');
  }
}

module.exports = {
  uploadFile,
  downloadFile,
  deleteFile,
  getFileUrl,
  uploadBuffer
};