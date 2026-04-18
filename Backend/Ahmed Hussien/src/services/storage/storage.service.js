// src/services/storage.service.js
// COMPLETE VERSION - Full storage operations with buffer upload, file management, and utilities

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
        // Check if file exists
        if (!fs.existsSync(localPath)) {
            throw new Error(`File not found: ${localPath}`);
        }
        
        const options = {
            destination,
            metadata: {
                metadata: {
                    uploadedAt: new Date().toISOString()
                }
            }
        };
        
        await bucket.upload(localPath, options);
        const file = bucket.file(destination);
        const [url] = await file.getSignedUrl({ 
            action: 'read', 
            expires: '03-09-2500' 
        });
        
        console.log(`File uploaded successfully: ${destination}`);
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
        
        // Check if file exists in storage
        const [exists] = await file.exists();
        if (!exists) {
            throw new Error(`File not found in storage: ${source}`);
        }
        
        await file.download({ destination: localPath });
        console.log(`File downloaded successfully: ${source} -> ${localPath}`);
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
        const file = bucket.file(filePath);
        
        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
            console.log(`File not found, skipping delete: ${filePath}`);
            return;
        }
        
        await file.delete();
        console.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
        console.error('File deletion failed:', error);
        throw new Error('Failed to delete file');
    }
}

/**
 * Delete multiple files from Firebase Storage
 * @param {string[]} filePaths - Array of file paths
 * @returns {Promise<{success: number, failed: number}>}
 */
async function deleteMultipleFiles(filePaths) {
    let success = 0;
    let failed = 0;
    
    for (const filePath of filePaths) {
        try {
            await deleteFile(filePath);
            success++;
        } catch (error) {
            console.error(`Failed to delete ${filePath}:`, error);
            failed++;
        }
    }
    
    return { success, failed };
}

/**
 * Get signed URL for a file
 * @param {string} filePath - Path to file in storage
 * @param {number} expiresIn - Expiration time in milliseconds (default: 1 year)
 * @returns {Promise<string>} - Signed URL
 */
async function getFileUrl(filePath, expiresIn = 365 * 24 * 60 * 60 * 1000) {
    try {
        const file = bucket.file(filePath);
        
        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const [url] = await file.getSignedUrl({ 
            action: 'read', 
            expires: Date.now() + expiresIn 
        });
        
        return url;
    } catch (error) {
        console.error('Failed to get file URL:', error);
        throw new Error('Failed to get file URL');
    }
}

/**
 * Get file metadata
 * @param {string} filePath - Path to file in storage
 * @returns {Promise<Object>} - File metadata
 */
async function getFileMetadata(filePath) {
    try {
        const file = bucket.file(filePath);
        const [metadata] = await file.getMetadata();
        
        return {
            name: metadata.name,
            size: metadata.size,
            contentType: metadata.contentType,
            timeCreated: metadata.timeCreated,
            updated: metadata.updated,
            md5Hash: metadata.md5Hash,
            crc32c: metadata.crc32c
        };
    } catch (error) {
        console.error('Failed to get file metadata:', error);
        throw new Error('Failed to get file metadata');
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
        // Create temporary file
        const tempPath = path.join(os.tmpdir(), `upload-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        fs.writeFileSync(tempPath, buffer);
        
        // Upload file
        const options = { 
            destination, 
            metadata: { 
                contentType: contentType || 'application/octet-stream',
                metadata: {
                    uploadedAt: new Date().toISOString(),
                    originalSize: buffer.length
                }
            } 
        };
        
        await bucket.upload(tempPath, options);
        
        // Clean up temp file
        fs.unlinkSync(tempPath);
        
        // Get signed URL
        const file = bucket.file(destination);
        const [url] = await file.getSignedUrl({ 
            action: 'read', 
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000 
        });
        
        console.log(`Buffer uploaded successfully to: ${destination}, size: ${buffer.length} bytes`);
        return url;
    } catch (error) {
        console.error('Buffer upload failed:', error);
        throw new Error('Failed to upload buffer');
    }
}

/**
 * Upload a base64 string directly to Firebase Storage
 * @param {string} base64String - Base64 encoded string
 * @param {string} destination - Destination path in storage
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} - Signed URL
 */
async function uploadBase64(base64String, destination, contentType) {
    try {
        // Remove data URL prefix if present
        let base64Data = base64String;
        let mimeType = contentType;
        
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            mimeType = matches[1];
            base64Data = matches[2];
        }
        
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Upload buffer
        return await uploadBuffer(buffer, destination, mimeType);
    } catch (error) {
        console.error('Base64 upload failed:', error);
        throw new Error('Failed to upload base64 string');
    }
}

/**
 * List files in a directory
 * @param {string} prefix - Directory prefix (e.g., 'selfies/session123/')
 * @returns {Promise<Array>} - List of files
 */
async function listFiles(prefix) {
    try {
        const [files] = await bucket.getFiles({ prefix });
        
        return files.map(file => ({
            name: file.name,
            size: file.metadata.size,
            contentType: file.metadata.contentType,
            timeCreated: file.metadata.timeCreated,
            publicUrl: `https://storage.googleapis.com/${bucket.name}/${file.name}`
        }));
    } catch (error) {
        console.error('Failed to list files:', error);
        throw new Error('Failed to list files');
    }
}

/**
 * Copy a file within storage
 * @param {string} sourcePath - Source file path
 * @param {string} destinationPath - Destination file path
 * @returns {Promise<string>} - Signed URL of copied file
 */
async function copyFile(sourcePath, destinationPath) {
    try {
        const sourceFile = bucket.file(sourcePath);
        const destinationFile = bucket.file(destinationPath);
        
        await sourceFile.copy(destinationFile);
        
        const [url] = await destinationFile.getSignedUrl({ 
            action: 'read', 
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000 
        });
        
        console.log(`File copied: ${sourcePath} -> ${destinationPath}`);
        return url;
    } catch (error) {
        console.error('File copy failed:', error);
        throw new Error('Failed to copy file');
    }
}

/**
 * Move a file within storage (copy + delete)
 * @param {string} sourcePath - Source file path
 * @param {string} destinationPath - Destination file path
 * @returns {Promise<string>} - Signed URL of moved file
 */
async function moveFile(sourcePath, destinationPath) {
    try {
        const url = await copyFile(sourcePath, destinationPath);
        await deleteFile(sourcePath);
        
        console.log(`File moved: ${sourcePath} -> ${destinationPath}`);
        return url;
    } catch (error) {
        console.error('File move failed:', error);
        throw new Error('Failed to move file');
    }
}

/**
 * Get public URL for a file (no authentication required)
 * @param {string} filePath - Path to file in storage
 * @returns {string} - Public URL
 */
function getPublicUrl(filePath) {
    return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}

/**
 * Make a file publicly readable
 * @param {string} filePath - Path to file in storage
 * @returns {Promise<void>}
 */
async function makePublic(filePath) {
    try {
        const file = bucket.file(filePath);
        await file.makePublic();
        console.log(`File made public: ${filePath}`);
    } catch (error) {
        console.error('Failed to make file public:', error);
        throw new Error('Failed to make file public');
    }
}

/**
 * Get storage usage statistics
 * @returns {Promise<Object>} - Storage statistics
 */
async function getStorageStats() {
    try {
        const [files] = await bucket.getFiles();
        
        let totalSize = 0;
        let fileCount = 0;
        const fileTypes = {};
        
        for (const file of files) {
            const size = parseInt(file.metadata.size) || 0;
            totalSize += size;
            fileCount++;
            
            const contentType = file.metadata.contentType || 'unknown';
            const type = contentType.split('/')[0];
            fileTypes[type] = (fileTypes[type] || 0) + 1;
        }
        
        return {
            totalFiles: fileCount,
            totalSizeBytes: totalSize,
            totalSizeMB: Math.round(totalSize / (1024 * 1024)),
            totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2),
            fileTypes,
            bucketName: bucket.name
        };
    } catch (error) {
        console.error('Failed to get storage stats:', error);
        throw new Error('Failed to get storage stats');
    }
}

module.exports = { 
    uploadFile, 
    downloadFile, 
    deleteFile,
    deleteMultipleFiles,
    getFileUrl,
    getFileMetadata,
    uploadBuffer,
    uploadBase64,
    listFiles,
    copyFile,
    moveFile,
    getPublicUrl,
    makePublic,
    getStorageStats
};