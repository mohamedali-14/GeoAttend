import { db } from '@/firebaseConfig';
import { doc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

export async function confirmAttendance(
    sessionId: string,
    studentId: string,
    studentName: string,
    courseId: string,
    method: 'qr' | 'qr+gps' | 'manual' = 'qr',
): Promise<void> {
    await setDoc(
        doc(db, 'attendance', `${studentId}_${sessionId}`),
        {
            sessionId,
            studentId,
            studentName,
            courseId,
            status: 'present',
            method,
            timestamp: Timestamp.now(),
        },
        { merge: true },
    );
}

export async function updateStudentLocation(
    sessionId: string,
    studentId: string,
    studentName: string,
    latitude: number,
    longitude: number,
): Promise<void> {
    await setDoc(
        doc(db, 'studentLocations', `${studentId}_${sessionId}`),
        {
            sessionId,
            studentId,
            studentName,
            latitude,
            longitude,
            updatedAt: Timestamp.now(),
        },
        { merge: true },
    );
}

export async function revokeAttendance(
    attendanceDocId: string,
): Promise<void> {
    await updateDoc(doc(db, 'attendance', attendanceDocId), {
        status: 'absent',
        revokedAt: Timestamp.now(),
        revokeReason: 'left_zone',
    });
}
