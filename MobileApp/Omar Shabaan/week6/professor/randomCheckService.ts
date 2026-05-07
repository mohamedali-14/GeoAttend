import { db } from '@/firebaseConfig';
import {
    doc, updateDoc, setDoc, collection,
    query, where, onSnapshot, Timestamp, getDocs,
} from 'firebase/firestore';
import { sendLocalNotification } from './notificationService';

export interface RandomCheck {
    active:    boolean;
    id:        string;        // unique per trigger
    deadline:  number;        // Unix ms — when the window closes
    sessionId: string;
}

export interface CheckResponse {
    studentId:   string;
    studentName: string;
    sessionId:   string;
    checkId:     string;
    respondedAt: Date;
    onTime:      boolean;
}

// ── Professor side ────────────────────────────────────────────────────────────

/**
 * Triggers a random check on the session.
 * Returns the generated checkId so the professor can track responses.
 */
export async function triggerRandomCheck(
    sessionId: string,
    deadlineSeconds = 120,
): Promise<string> {
    const checkId  = `check_${Date.now()}`;
    const deadline = Date.now() + deadlineSeconds * 1000;

    await updateDoc(doc(db, 'sessions', sessionId), {
        randomCheck: {
            active:    true,
            id:        checkId,
            deadline:  deadline,
            sessionId: sessionId,
        },
    });

    return checkId;
}

/** Cancels the active random check (e.g. after deadline expires on professor side). */
export async function cancelRandomCheck(sessionId: string): Promise<void> {
    await updateDoc(doc(db, 'sessions', sessionId), {
        'randomCheck.active': false,
    });
}

/**
 * After deadline: mark students who did NOT respond as absent.
 * Call this from a setTimeout on the professor's side.
 */
export async function finalizeRandomCheck(
    sessionId: string,
    checkId:   string,
    courseId:  string,
): Promise<{ confirmed: number; revoked: number }> {
    const respSnap = await getDocs(query(
        collection(db, 'randomCheckResponses'),
        where('sessionId', '==', sessionId),
        where('checkId',   '==', checkId),
    ));
    const respondedIds = new Set(respSnap.docs.map(d => d.data().studentId as string));

    const attSnap = await getDocs(query(
        collection(db, 'attendance'),
        where('sessionId', '==', sessionId),
        where('status',    '==', 'present'),
    ));

    let revoked = 0;
    for (const attDoc of attSnap.docs) {
        const studentId = attDoc.data().studentId as string;
        if (!respondedIds.has(studentId)) {
            await updateDoc(doc(db, 'attendance', attDoc.id), {
                status:      'absent',
                revokedAt:   Timestamp.now(),
                revokeReason: 'missed_random_check',
            });
            revoked++;
        }
    }

    await cancelRandomCheck(sessionId);

    return { confirmed: respondedIds.size, revoked };
}
export async function respondToCheck(
    sessionId:   string,
    checkId:     string,
    studentId:   string,
    studentName: string,
    deadline:    number,
): Promise<boolean> {
    const now    = Date.now();
    const onTime = now <= deadline;

    await setDoc(
        doc(db, 'randomCheckResponses', `${studentId}_${checkId}`),
        {
            studentId,
            studentName,
            sessionId,
            checkId,
            respondedAt: Timestamp.now(),
            onTime,
        },
        { merge: true },
    );

    return onTime;
}

export function subscribeToRandomCheck(
    sessionId: string,
    callback:  (check: RandomCheck | null) => void,
): () => void {
    return onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
        if (!snap.exists()) { callback(null); return; }
        const rc = snap.data().randomCheck;
        if (!rc || !rc.active) { callback(null); return; }

        callback({
            active:    rc.active    ?? false,
            id:        rc.id        ?? '',
            deadline:  rc.deadline  ?? 0,
            sessionId: rc.sessionId ?? sessionId,
        });
    });
}

export function subscribeToCheckResponses(
    sessionId: string,
    checkId:   string,
    callback:  (responses: CheckResponse[]) => void,
): () => void {
    const q = query(
        collection(db, 'randomCheckResponses'),
        where('sessionId', '==', sessionId),
        where('checkId',   '==', checkId),
    );
    return onSnapshot(q, (snap) => {
        callback(
            snap.docs.map(d => ({
                studentId:   d.data().studentId   || '',
                studentName: d.data().studentName || 'Unknown',
                sessionId:   d.data().sessionId   || '',
                checkId:     d.data().checkId      || '',
                respondedAt: d.data().respondedAt?.toDate?.() || new Date(),
                onTime:      d.data().onTime       ?? false,
            })),
        );
    });
}
