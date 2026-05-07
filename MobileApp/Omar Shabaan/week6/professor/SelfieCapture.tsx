import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Alert, Image, Modal, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/const/colors';
import {
    captureSelfie,
    uploadSelfieToStorage,
    linkSelfieToAttendance,
} from './selfieService';

interface Props {
    studentId: string;
    sessionId: string;
    onDone: (selfieUrl: string | null) => void;
}

export default function SelfieCapture({ studentId, sessionId, onDone }: Props) {
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [uploading, setUploading]   = useState(false);

    const handleCapture = async () => {
        const uri = await captureSelfie();
        if (uri) setPreviewUri(uri);
    };

    const handleConfirm = async () => {
        if (!previewUri) return;
        setUploading(true);
        try {
            const url = await uploadSelfieToStorage(previewUri, studentId, sessionId);
            await linkSelfieToAttendance(studentId, sessionId, url);
            onDone(url);
        } catch {
            Alert.alert('خطأ', 'فشل رفع الصورة. يمكنك المتابعة بدونها.');
            onDone(null);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal visible animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <Icon name="face" size={26} color={colors.primary} />
                        <Text style={styles.title}>سيلفي الحضور</Text>
                    </View>
                    <Text style={styles.subtitle}>التقط صورة للتأكيد البصري لحضورك</Text>

                    {previewUri ? (
                        <Image source={{ uri: previewUri }} style={styles.preview} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Icon name="camera-alt" size={64} color={colors.text.muted} />
                            <Text style={styles.placeholderText}>اضغط للالتقاط</Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                        <Icon name="camera-alt" size={20} color="#fff" />
                        <Text style={styles.captureBtnText}>
                            {previewUri ? 'إعادة الالتقاط' : 'التقط صورة'}
                        </Text>
                    </TouchableOpacity>

                    {previewUri && (
                        <TouchableOpacity
                            style={[styles.confirmBtn, uploading && { opacity: 0.6 }]}
                            onPress={handleConfirm}
                            disabled={uploading}
                        >
                            {uploading
                                ? <ActivityIndicator size="small" color="#fff" />
                                : (
                                    <>
                                        <Icon name="check-circle" size={20} color="#fff" />
                                        <Text style={styles.confirmBtnText}>تأكيد ورفع</Text>
                                    </>
                                )
                            }
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.skipBtn} onPress={() => onDone(null)}>
                        <Text style={styles.skipBtnText}>تخطي</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet:           { backgroundColor: colors.background.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
    handle:          { width: 40, height: 4, backgroundColor: colors.border.primary, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    header:          { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    title:           { fontSize: 20, fontWeight: '800', color: colors.text.primary },
    subtitle:        { fontSize: 13, color: colors.text.muted, marginBottom: 20 },
    preview:         { width: '100%', aspectRatio: 1, borderRadius: 16, marginBottom: 16 },
    placeholder:     { width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: colors.background.secondary, justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 16, borderWidth: 1, borderColor: colors.border.primary },
    placeholderText: { fontSize: 14, color: colors.text.muted },
    captureBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, marginBottom: 10 },
    captureBtnText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
    confirmBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, marginBottom: 10 },
    confirmBtnText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
    skipBtn:         { alignItems: 'center', paddingVertical: 12 },
    skipBtnText:     { fontSize: 14, color: colors.text.muted, fontWeight: '600' },
});
