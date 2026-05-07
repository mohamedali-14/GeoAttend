import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '@/firebaseConfig';
import { doc, setDoc, collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';

export function setupNotificationHandler(): void {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge:  true,
            shouldShowBanner: true,
            shouldShowList:  true,
        }),
    });
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
    if (!Device.isDevice) return null;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('sessions', {
            name:             'Session Alerts',
            importance:       Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor:       '#10B981',
            sound:            'default',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        await setDoc(
            doc(db, 'users', userId),
            { expoPushToken: token, tokenUpdatedAt: Timestamp.now() },
            { merge: true },
        );
        return token;
    } catch (e) {
        console.error('[notificationService] getExpoPushTokenAsync error:', e);
        return null;
    }
}

export function subscribeToSessionStartAlerts(
    enrolledCourseIds: string[],
    notifiedRef: React.MutableRefObject<Set<string>>,
): () => void {
    if (!enrolledCourseIds.length) return () => {};

    const chunks: string[][] = [];
    for (let i = 0; i < enrolledCourseIds.length; i += 10) {
        chunks.push(enrolledCourseIds.slice(i, i + 10));
    }

    const unsubscribers: Array<() => void> = [];

    chunks.forEach((chunk) => {
        const q = query(
            collection(db, 'sessions'),
            where('courseId', 'in', chunk),
            where('isActive', '==', true),
        );

        const unsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type !== 'added') return;

                const sessionId = change.doc.id;
                if (notifiedRef.current.has(sessionId)) return;
                notifiedRef.current.add(sessionId);

                const data = change.doc.data();

                Notifications.scheduleNotificationAsync({
                    content: {
                        title:     'بدأت محاضرة جديدة!',
                        body:      `${data.courseName || 'المادة'} — القاعة: ${data.room || '—'}`,
                        data:      { sessionId, courseId: data.courseId },
                    },
                    trigger: { channelId: 'sessions' } as any,
                });
            });
        });

        unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach(fn => fn());
}

export async function sendLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>,
): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: { title, body, data },
        trigger: { channelId: 'sessions' } as any,
    });
}
