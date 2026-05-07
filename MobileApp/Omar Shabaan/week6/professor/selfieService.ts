import * as ImagePicker from 'expo-image-picker';
import { db } from '@/firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export async function captureSelfie(): Promise<string | null> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
        throw new Error('camera_permission_denied');
    }
    const result = await ImagePicker.launchCameraAsync({
        cameraType:    ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect:        [1, 1],
        quality:       0.6,
        base64:        false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return null;
    return result.assets[0].uri;
}

export async function uploadSelfieToStorage(
    localUri:  string,
    studentId: string,
    sessionId: string,
): Promise<string> {
    const filename    = `${studentId}_${Date.now()}.jpg`;
    const storagePath = `attendance-selfies/${sessionId}/${filename}`;

    const response = await fetch(localUri);
    if (!response.ok) throw new Error('fetch_local_uri_failed');
    const blob = await response.blob();
    if (!blob || blob.size === 0) throw new Error('blob_empty_after_fetch');

    const storage    = getStorage();
    const storageRef = ref(storage, storagePath);

    await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, blob, { contentType: 'image/jpeg' });
        task.on('state_changed', null, reject, resolve);
    });

    return getDownloadURL(storageRef);
}

export async function linkSelfieToAttendance(
    studentId: string,
    sessionId: string,
    selfieUrl: string,
): Promise<void> {
    const snap = await getDocs(
        query(collection(db, 'attendance'), where('studentId', '==', studentId), where('sessionId', '==', sessionId))
    );
    if (snap.empty) { console.warn('[selfieService] attendance doc not found'); return; }
    await updateDoc(doc(db, 'attendance', snap.docs[0].id), {
        selfieUrl,
        selfieUploadedAt: Timestamp.now(),
    });
}

export async function captureSelfieAndUpload(
    studentId: string,
    sessionId: string,
): Promise<string | null> {
    try {
        const uri = await captureSelfie();
        if (!uri) return null;
        const url = await uploadSelfieToStorage(uri, studentId, sessionId);
        await linkSelfieToAttendance(studentId, sessionId, url);
        return url;
    } catch (e) {
        console.error('[selfieService]', e);
        throw e;
    }
}
