import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Modal, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../const/colors';
import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface Props {
    visible: boolean;
    onClose: () => void;
    studentId: string;
    studentName: string;
    onScanned: (sessionId: string, courseId: string) => void;  // تغيير الاسم هنا
    onSaveToHistory?: (code: string, name: string, courseId: string) => void;
}

type ScanState = 'scanning' | 'processing' | 'success' | 'error';

export default function StudentQRScanner({ visible, onClose, studentId, studentName, onScanned }: Props) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanState, setScanState] = useState<ScanState>('scanning');
    const [errorMsg, setErrorMsg] = useState('');
    const scannedRef = useRef(false); 

    useEffect(() => {
        if (visible) {
            setScanState('scanning');
            setErrorMsg('');
            scannedRef.current = false;
        }
    }, [visible]);

    const handleBarCodeScanned = async ({ data }: { data: string }) => {
        if (scannedRef.current) return;
        scannedRef.current = true;
        setScanState('processing');

        try {
            const parsed = JSON.parse(data);
            if (parsed.type !== 'attendance' || !parsed.sessionId || !parsed.courseId) {
                throw new Error('QR غير صالح. يرجى مسح كود الدكتور فقط.');
            }

            const { sessionId, courseId } = parsed;

            // التحقق من صلاحية الجلسة
            const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
            if (!sessionDoc.exists() || !sessionDoc.data().isActive) {
                throw new Error('انتهت الجلسة أو أُغلقت. تواصل مع الدكتور.');
            }

            // التحقق من تسجيل الطالب في المادة
            const enrollQ = query(collection(db, 'enrollments'),
                where('studentId', '==', studentId),
                where('courseId', '==', courseId));
            const enrollSnap = await getDocs(enrollQ);
            if (enrollSnap.empty) {
                throw new Error('أنت غير مسجل في هذه المادة.');
            }

            // التحقق من عدم تكرار الحضور (اختياري، يمكن تركه للشاشة التالية)
            const attQ = query(collection(db, 'attendance'),
                where('sessionId', '==', sessionId),
                where('studentId', '==', studentId));
            const attSnap = await getDocs(attQ);
            if (!attSnap.empty) {
                const existing = attSnap.docs[0].data();
                if (existing.status === 'present') {
                    throw new Error('تم تسجيل حضورك مسبقاً في هذه الجلسة.');
                }
            }

            // كل شيء صحيح، نمرر البيانات ونغلق الماسح
            setScanState('success');
            setTimeout(() => {
                onScanned(sessionId, courseId);  // استدعاء onScanned بدلاً من onSuccess
                onClose();
            }, 1000);

        } catch (e: any) {
            setErrorMsg(e.message || 'فشل في التحقق من الكود');
            setScanState('error');
        }
    };

    const handleRetry = () => {
        setScanState('scanning');
        setErrorMsg('');
        scannedRef.current = false;
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.root}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Icon name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>مسح QR للحضور</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Camera or state screens */}
                {!permission?.granted ? (
                    <View style={styles.permissionBox}>
                        <Icon name="camera-alt" size={60} color={colors.text.muted} />
                        <Text style={styles.permissionTitle}>إذن الكاميرا مطلوب</Text>
                        <Text style={styles.permissionText}>نحتاج الكاميرا لمسح QR الحضور</Text>
                        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                            <Text style={styles.permBtnText}>منح الإذن</Text>
                        </TouchableOpacity>
                    </View>
                ) : scanState === 'success' ? (
                    <View style={styles.stateBox}>
                        <View style={[styles.stateIcon, { backgroundColor: '#10B98120' }]}>
                            <Icon name="check-circle" size={72} color="#10B981" />
                        </View>
                        <Text style={[styles.stateTitle, { color: '#10B981' }]}>تم التحقق ✓</Text>
                        <Text style={styles.stateText}>جاري التوجيه...</Text>
                    </View>
                ) : scanState === 'error' ? (
                    <View style={styles.stateBox}>
                        <View style={[styles.stateIcon, { backgroundColor: '#EF444420' }]}>
                            <Icon name="cancel" size={72} color="#EF4444" />
                        </View>
                        <Text style={[styles.stateTitle, { color: '#EF4444' }]}>فشل المسح</Text>
                        <Text style={styles.stateText}>{errorMsg}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                            <Icon name="refresh" size={18} color="#fff" />
                            <Text style={styles.retryBtnText}>إعادة المحاولة</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.cameraWrap}>
                        <CameraView
                            style={styles.camera}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                            onBarcodeScanned={scanState === 'scanning' ? handleBarCodeScanned : undefined}
                        />
                        {/* Scanner overlay */}
                        <View style={styles.overlay} pointerEvents="none">
                            <View style={styles.scanFrame}>
                                <View style={[styles.corner, styles.tl]} />
                                <View style={[styles.corner, styles.tr]} />
                                <View style={[styles.corner, styles.bl]} />
                                <View style={[styles.corner, styles.br]} />
                                {scanState === 'processing' && (
                                    <ActivityIndicator size="large" color="#fff" />
                                )}
                            </View>
                            <Text style={styles.scanHint}>
                                {scanState === 'processing' ? 'جاري التحقق...' : 'وجّه الكاميرا نحو QR الدكتور'}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const CORNER = 24;
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 16, paddingHorizontal: 20,
        backgroundColor: '#000',
    },
    closeBtn: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

    permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 },
    permissionTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    permissionText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
    permBtn: {
        backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14,
        borderRadius: 14, marginTop: 8,
    },
    permBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    cameraWrap: { flex: 1 },
    camera: { flex: 1 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center',
    },
    scanFrame: {
        width: 240, height: 240,
        alignItems: 'center', justifyContent: 'center',
    },
    corner: {
        position: 'absolute', width: CORNER, height: CORNER,
        borderColor: '#fff', borderWidth: 3,
    },
    tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
    tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
    bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
    br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
    scanHint: {
        marginTop: 28, fontSize: 15, color: '#fff', fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
    },

    stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40 },
    stateIcon: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    stateTitle: { fontSize: 22, fontWeight: '800' },
    stateText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
    retryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#EF4444', paddingHorizontal: 24, paddingVertical: 12,
        borderRadius: 14, marginTop: 8,
    },
    retryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});