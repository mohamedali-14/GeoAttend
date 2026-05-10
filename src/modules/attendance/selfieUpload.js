// src/modules/attendance/selfieUpload.js
// COMPLETE VERSION - Full selfie upload, verification, rejection, and management

const { storage, db, admin } = require('../../config/firebase');
const { v4: uuidv4 } = require('uuid');

const bucket = storage.bucket();

/**
 * Upload a selfie for attendance verification
 * @param {string} sessionId - The session ID
 * @param {string} studentId - The student ID
 * @param {Buffer} imageBuffer - The image data
 * @param {string} mimeType - The image MIME type
 * @returns {Promise<{id: string, url: string}>}
 */
async function uploadAttendanceSelfie(sessionId, studentId, imageBuffer, mimeType) {
    try {
        // Check if selfie is required for this session
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) {
            throw new Error('Session not found');
        }
        
        const session = sessionDoc.data();
        const requireSelfie = session.verificationSettings?.requireSelfie || false;
        
        if (!requireSelfie) {
            throw new Error('Selfie verification is not required for this session');
        }
        
        // Check if student already submitted a selfie for this session
        const existingSelfie = await db.collection('attendanceSelfies')
            .where('sessionId', '==', sessionId)
            .where('studentId', '==', studentId)
            .limit(1)
            .get();
        
        if (!existingSelfie.empty) {
            const existingData = existingSelfie.docs[0].data();
            const allowRetakes = session.verificationSettings?.selfieOptions?.allowRetakes || false;
            
            if (!allowRetakes && existingData.verificationStatus === 'PENDING') {
                throw new Error('You have already submitted a selfie for this session. Retakes are not allowed.');
            }
            
            // If retakes allowed, delete old selfie
            if (allowRetakes) {
                const oldSelfieId = existingSelfie.docs[0].id;
                const oldStoragePath = existingData.storagePath;
                
                // Delete old file from storage
                if (oldStoragePath) {
                    const oldFile = bucket.file(oldStoragePath);
                    await oldFile.delete().catch(e => console.log('Old file not found:', e));
                }
                
                // Delete old record
                await db.collection('attendanceSelfies').doc(oldSelfieId).delete();
                console.log(`Old selfie deleted for student ${studentId}`);
            }
        }
        
        // Generate unique filename
        const fileName = `selfies/${sessionId}/${studentId}_${uuidv4()}.jpg`;
        const file = bucket.file(fileName);
        
        // Save image to storage
        await file.save(imageBuffer, {
            metadata: {
                contentType: mimeType || 'image/jpeg',
                metadata: { 
                    sessionId, 
                    studentId, 
                    uploadedAt: new Date().toISOString() 
                }
            }
        });
        
        // Generate signed URL (valid for 1 year)
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 365 * 24 * 60 * 60 * 1000
        });
        
        // Get submission timeout from session settings
        const submissionTimeoutMinutes = session.verificationSettings?.selfieOptions?.submissionTimeoutMinutes || 2;
        const expiresAt = new Date(Date.now() + submissionTimeoutMinutes * 60 * 1000);
        
        // Save selfie record to Firestore
        const selfieRef = await db.collection('attendanceSelfies').add({
            sessionId,
            studentId,
            storagePath: fileName,
            publicUrl: signedUrl,
            uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
            verificationStatus: 'PENDING',
            rejectionReason: null,
            retakeCount: 0,
            metadata: {
                mimeType: mimeType || 'image/jpeg',
                fileSize: imageBuffer.length
            }
        });
        
        // Update attendance record with selfie reference if exists
        const existingAttendance = await db.collection('attendance')
            .where('sessionId', '==', sessionId)
            .where('studentId', '==', studentId)
            .limit(1)
            .get();
        
        if (!existingAttendance.empty) {
            await db.collection('attendance').doc(existingAttendance.docs[0].id).update({
                selfieId: selfieRef.id,
                selfieStatus: 'PENDING',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        console.log(`Selfie uploaded for student ${studentId} in session ${sessionId}`);
        return { id: selfieRef.id, url: signedUrl };
    } catch (error) {
        console.error('Error uploading selfie:', error);
        throw error;
    }
}

/**
 * Verify a selfie (approve attendance)
 * @param {string} selfieId - The selfie ID
 * @param {string} professorId - The professor verifying
 * @returns {Promise<{success: boolean, attendanceId?: string}>}
 */
async function verifySelfie(selfieId, professorId) {
    try {
        // Get selfie record
        const selfieDoc = await db.collection('attendanceSelfies').doc(selfieId).get();
        if (!selfieDoc.exists) throw new Error('Selfie not found');
        
        const selfie = selfieDoc.data();
        
        // Verify professor has permission for this session
        const sessionDoc = await db.collection('sessions').doc(selfie.sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        
        if (sessionDoc.data().professorId !== professorId) {
            throw new Error('You do not have permission to verify this selfie');
        }
        
        // Check if already verified
        if (selfie.verificationStatus === 'VERIFIED') {
            throw new Error('Selfie already verified');
        }
        
        // Update selfie status
        await db.collection('attendanceSelfies').doc(selfieId).update({
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            verificationStatus: 'VERIFIED',
            verifiedBy: professorId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Check if attendance already exists to avoid duplicates
        const existingAttendance = await db.collection('attendance')
            .where('sessionId', '==', selfie.sessionId)
            .where('studentId', '==', selfie.studentId)
            .limit(1)
            .get();
        
        let attendanceId;
        if (existingAttendance.empty) {
            // Create new attendance record
            const attendanceRef = await db.collection('attendance').add({
                sessionId: selfie.sessionId,
                studentId: selfie.studentId,
                verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                verificationMethod: 'SELFIE',
                selfieId: selfieId,
                status: 'PRESENT',
                markedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            attendanceId = attendanceRef.id;
            
            // Update session student count
            await db.collection('sessions').doc(selfie.sessionId).update({
                studentsPresent: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            attendanceId = existingAttendance.docs[0].id;
            await db.collection('attendance').doc(attendanceId).update({
                verificationMethod: 'SELFIE',
                selfieId: selfieId,
                status: 'PRESENT',
                verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Log verification activity
        await db.collection('verificationLogs').add({
            selfieId,
            sessionId: selfie.sessionId,
            studentId: selfie.studentId,
            professorId,
            action: 'VERIFY',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Selfie ${selfieId} verified by professor ${professorId}`);
        return { success: true, attendanceId };
    } catch (error) {
        console.error('Error verifying selfie:', error);
        throw error;
    }
}

/**
 * Reject a selfie (deny attendance)
 * @param {string} selfieId - The selfie ID
 * @param {string} professorId - The professor rejecting
 * @param {string} reason - Reason for rejection
 * @returns {Promise<{success: boolean}>}
 */
async function rejectSelfie(selfieId, professorId, reason) {
    try {
        // Get selfie record
        const selfieDoc = await db.collection('attendanceSelfies').doc(selfieId).get();
        if (!selfieDoc.exists) throw new Error('Selfie not found');
        
        const selfie = selfieDoc.data();
        
        // Verify professor has permission
        const sessionDoc = await db.collection('sessions').doc(selfie.sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        
        if (sessionDoc.data().professorId !== professorId) {
            throw new Error('You do not have permission to reject this selfie');
        }
        
        // Update selfie status
        await db.collection('attendanceSelfies').doc(selfieId).update({
            rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            verificationStatus: 'REJECTED',
            rejectionReason: reason,
            rejectedBy: professorId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Update attendance record if exists
        const existingAttendance = await db.collection('attendance')
            .where('sessionId', '==', selfie.sessionId)
            .where('studentId', '==', selfie.studentId)
            .limit(1)
            .get();
        
        if (!existingAttendance.empty) {
            await db.collection('attendance').doc(existingAttendance.docs[0].id).update({
                status: 'REJECTED',
                rejectionReason: reason,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Log rejection activity
        await db.collection('verificationLogs').add({
            selfieId,
            sessionId: selfie.sessionId,
            studentId: selfie.studentId,
            professorId,
            action: 'REJECT',
            reason,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Selfie ${selfieId} rejected by professor ${professorId}: ${reason}`);
        return { success: true };
    } catch (error) {
        console.error('Error rejecting selfie:', error);
        throw error;
    }
}

/**
 * Get selfie by session and student
 * @param {string} sessionId - The session ID
 * @param {string} studentId - The student ID
 * @returns {Promise<Object|null>}
 */
async function getSelfieBySessionAndStudent(sessionId, studentId) {
    try {
        const snapshot = await db.collection('attendanceSelfies')
            .where('sessionId', '==', sessionId)
            .where('studentId', '==', studentId)
            .orderBy('uploadedAt', 'desc')
            .limit(1)
            .get();
        
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        // Convert Firestore timestamps to JS dates
        return { 
            id: doc.id, 
            ...data,
            uploadedAt: data.uploadedAt?.toDate?.() || data.uploadedAt,
            expiresAt: data.expiresAt?.toDate?.() || data.expiresAt,
            verifiedAt: data.verifiedAt?.toDate?.() || data.verifiedAt,
            rejectedAt: data.rejectedAt?.toDate?.() || data.rejectedAt
        };
    } catch (error) {
        console.error('Error getting selfie:', error);
        throw error;
    }
}

/**
 * Get all pending selfies for a session (for professor review)
 * @param {string} sessionId - The session ID
 * @param {string} professorId - The professor ID (for authorization)
 * @returns {Promise<Array>}
 */
async function getPendingSelfiesForSession(sessionId, professorId) {
    try {
        // Verify professor owns this session
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        if (sessionDoc.data().professorId !== professorId) {
            throw new Error('You do not have permission to view selfies for this session');
        }
        
        // Get all pending selfies
        const snapshot = await db.collection('attendanceSelfies')
            .where('sessionId', '==', sessionId)
            .where('verificationStatus', '==', 'PENDING')
            .orderBy('uploadedAt', 'asc')
            .get();
        
        const selfies = [];
        for (const doc of snapshot.docs) {
            const selfieData = doc.data();
            
            // Get student info
            const studentDoc = await db.collection('users').doc(selfieData.studentId).get();
            const student = studentDoc.exists ? studentDoc.data() : {};
            
            // Check if expired
            const isExpired = selfieData.expiresAt && selfieData.expiresAt.toDate() < new Date();
            
            selfies.push({
                id: doc.id,
                studentId: selfieData.studentId,
                studentName: student.fullName || 'Unknown',
                studentEmail: student.email || 'N/A',
                studentStudentId: student.studentId || 'N/A',
                studentDepartment: student.department || 'N/A',
                photoUrl: selfieData.publicUrl,
                uploadedAt: selfieData.uploadedAt?.toDate?.() || selfieData.uploadedAt,
                expiresAt: selfieData.expiresAt?.toDate?.() || selfieData.expiresAt,
                isExpired,
                storagePath: selfieData.storagePath,
                retakeCount: selfieData.retakeCount || 0,
                fileSize: selfieData.metadata?.fileSize || 0
            });
        }
        
        return selfies;
    } catch (error) {
        console.error('Error getting pending selfies:', error);
        throw error;
    }
}

/**
 * Get all selfies for a session (professor view all)
 * @param {string} sessionId - The session ID
 * @param {string} professorId - The professor ID (for authorization)
 * @param {string} status - Filter by status (PENDING, VERIFIED, REJECTED, ALL)
 * @returns {Promise<Array>}
 */
async function getAllSelfiesForSession(sessionId, professorId, status = 'ALL') {
    try {
        // Verify professor owns this session
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        if (sessionDoc.data().professorId !== professorId) {
            throw new Error('You do not have permission to view selfies for this session');
        }
        
        // Build query
        let query = db.collection('attendanceSelfies')
            .where('sessionId', '==', sessionId);
        
        if (status !== 'ALL') {
            query = query.where('verificationStatus', '==', status);
        }
        
        const snapshot = await query.orderBy('uploadedAt', 'desc').get();
        
        const selfies = [];
        for (const doc of snapshot.docs) {
            const selfieData = doc.data();
            
            // Get student info
            const studentDoc = await db.collection('users').doc(selfieData.studentId).get();
            const student = studentDoc.exists ? studentDoc.data() : {};
            
            selfies.push({
                id: doc.id,
                studentId: selfieData.studentId,
                studentName: student.fullName || 'Unknown',
                studentEmail: student.email || 'N/A',
                studentStudentId: student.studentId || 'N/A',
                photoUrl: selfieData.publicUrl,
                verificationStatus: selfieData.verificationStatus,
                uploadedAt: selfieData.uploadedAt?.toDate?.() || selfieData.uploadedAt,
                verifiedAt: selfieData.verifiedAt?.toDate?.() || selfieData.verifiedAt,
                rejectedAt: selfieData.rejectedAt?.toDate?.() || selfieData.rejectedAt,
                rejectionReason: selfieData.rejectionReason,
                verifiedBy: selfieData.verifiedBy,
                rejectedBy: selfieData.rejectedBy
            });
        }
        
        return selfies;
    } catch (error) {
        console.error('Error getting all selfies:', error);
        throw error;
    }
}

/**
 * Check if selfie is required for a session
 * @param {string} sessionId - The session ID
 * @returns {Promise<boolean>}
 */
async function isSelfieRequiredForSession(sessionId) {
    try {
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) return false;
        
        const session = sessionDoc.data();
        return session.verificationSettings?.requireSelfie || false;
    } catch (error) {
        console.error('Error checking selfie requirement:', error);
        return false;
    }
}

/**
 * Get selfie statistics for a session
 * @param {string} sessionId - The session ID
 * @param {string} professorId - The professor ID (for authorization)
 * @returns {Promise<Object>}
 */
async function getSelfieStats(sessionId, professorId) {
    try {
        // Verify professor owns this session
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) throw new Error('Session not found');
        if (sessionDoc.data().professorId !== professorId) {
            throw new Error('You do not have permission to view stats for this session');
        }
        
        const snapshot = await db.collection('attendanceSelfies')
            .where('sessionId', '==', sessionId)
            .get();
        
        const stats = {
            total: snapshot.size,
            pending: 0,
            verified: 0,
            rejected: 0,
            expired: 0
        };
        
        const now = new Date();
        for (const doc of snapshot.docs) {
            const data = doc.data();
            switch (data.verificationStatus) {
                case 'PENDING':
                    stats.pending++;
                    if (data.expiresAt && data.expiresAt.toDate() < now) {
                        stats.expired++;
                    }
                    break;
                case 'VERIFIED':
                    stats.verified++;
                    break;
                case 'REJECTED':
                    stats.rejected++;
                    break;
            }
        }
        
        return stats;
    } catch (error) {
        console.error('Error getting selfie stats:', error);
        throw error;
    }
}

/**
 * Auto-expire old pending selfies
 * @returns {Promise<number>} - Number of expired selfies
 */
async function autoExpirePendingSelfies() {
    try {
        const now = new Date();
        
        const expiredSelfies = await db.collection('attendanceSelfies')
            .where('verificationStatus', '==', 'PENDING')
            .where('expiresAt', '<=', now)
            .get();
        
        let expiredCount = 0;
        const batch = db.batch();
        
        for (const doc of expiredSelfies.docs) {
            batch.update(doc.ref, {
                verificationStatus: 'EXPIRED',
                expiredAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            expiredCount++;
        }
        
        if (expiredCount > 0) {
            await batch.commit();
            console.log(`Auto-expired ${expiredCount} pending selfies`);
        }
        
        return expiredCount;
    } catch (error) {
        console.error('Error auto-expiring selfies:', error);
        return 0;
    }
}

/**
 * Delete selfie (admin only)
 * @param {string} selfieId - The selfie ID
 * @param {string} adminId - The admin ID (for authorization)
 * @returns {Promise<{success: boolean}>}
 */
async function deleteSelfie(selfieId, adminId) {
    try {
        // Verify admin role
        const adminDoc = await db.collection('users').doc(adminId).get();
        if (!adminDoc.exists || adminDoc.data().role !== 'ADMIN') {
            throw new Error('Only admins can delete selfies');
        }
        
        const selfieDoc = await db.collection('attendanceSelfies').doc(selfieId).get();
        if (!selfieDoc.exists) throw new Error('Selfie not found');
        
        const selfie = selfieDoc.data();
        
        // Delete file from storage
        if (selfie.storagePath) {
            const file = bucket.file(selfie.storagePath);
            await file.delete().catch(e => console.log('File not found:', e));
        }
        
        // Delete record from Firestore
        await db.collection('attendanceSelfies').doc(selfieId).delete();
        
        console.log(`Selfie ${selfieId} deleted by admin ${adminId}`);
        return { success: true };
    } catch (error) {
        console.error('Error deleting selfie:', error);
        throw error;
    }
}

module.exports = { 
    uploadAttendanceSelfie, 
    verifySelfie, 
    rejectSelfie,
    getSelfieBySessionAndStudent,
    getPendingSelfiesForSession,
    getAllSelfiesForSession,
    isSelfieRequiredForSession,
    getSelfieStats,
    autoExpirePendingSelfies,
    deleteSelfie
};