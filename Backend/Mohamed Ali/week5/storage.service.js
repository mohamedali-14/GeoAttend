// src/services/storage.service.js
const { storage } = require('../config/firebase');
const fs = require('fs');
const path = require('path');
const os = require('os');

const bucket = storage.bucket();

/**
 * Upload a file from local path to Firebase Storage
 * @param {string} localPath - Local file path
 * @param {string} destination - Destination path in storage
 * @returns {Promise<string>} - Signed URL
 */
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

/**
 * Download a file from Firebase Storage to local path
 * @param {string} source - Source path in storage
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
 * @param {string} filePath - Path to file in storage
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
 * Get signed URL for a file
 * @param {string} filePath - Path to file in storage
 * @returns {Promise<string>} - Signed URL
 */
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

/**
 * Upload a buffer directly to Firebase Storage
 * @param {Buffer} buffer - The buffer to upload
 * @param {string} destination - Destination path in storage
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} - Signed URL
 */
async function uploadBuffer(buffer, destination, contentType) {
  try {
    const tempPath = path.join(os.tmpdir(), `upload-${Date.now()}`);
    fs.writeFileSync(tempPath, buffer);
    const url = await uploadFile(tempPath, destination);
    fs.unlinkSync(tempPath);
    return url;
  } catch (error) {
    console.error('Buffer upload failed:', error);
    throw new Error('Failed to upload buffer');
  }
}

module.exports = { uploadFile, downloadFile, deleteFile, getFileUrl, uploadBuffer };