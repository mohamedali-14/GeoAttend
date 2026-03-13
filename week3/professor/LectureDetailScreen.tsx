import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    ScrollView, Platform, Alert, Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/const/colors';
import { LectureSession } from './types';

let QRCode: any = null;
try { QRCode = require('react-native-qrcode-svg').default; } catch (_) {}

interface Props {
    visible: boolean;
    onClose: () => void;
    session: LectureSession;
}

export default function LectureDetailScreen({ visible, onClose, session }: Props) {
    const [sharing, setSharing] = useState(false);
    const svgRef = useRef<any>(null);

    const qrValue = JSON.stringify({
        sessionId: session.id,
        courseId:  session.courseId,
        type:      'attendance',
    });

    const handleShareText = async () => {
        try {
            await Share.share({
                message:
                    `📚 حضور جلسة: ${session.courseName}\n` +
                    `🏫 القاعة: ${session.room || '—'}\n` +
                    `⏰ من: ${formatTime(session.startTime)} إلى ${formatTime(session.endTime)}\n` +
                    `🔑 Session ID: ${session.id}\n\n` +
                    `افتح تطبيق GeoTrack وامسح QR الدكتور للتسجيل.`,
                title: `جلسة ${session.courseName}`,
            });
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        }
    };

    const handleShareImage = async () => {
        if (!svgRef.current) {
            Alert.alert('تنبيه', 'المكتبة غير متاحة. استخدم مشاركة النص.');
            return;
        }
        try {
            setSharing(true);
            svgRef.current.toDataURL(async (data: string) => {
                const Sharing    = require('expo-sharing');
                const FileSystem = require('expo-file-system');
                const path = FileSystem.cacheDirectory + 'qr_attendance.png';
                await FileSystem.writeAsStringAsync(path, data, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                await Sharing.shareAsync(path, { mimeType: 'image/png' });
            });
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSharing(false);
        }
    };

    const formatTime = (d: Date | any) => {
        try {
            const date = d?.toDate ? d.toDate() : new Date(d);
            return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        } catch { return '—'; }
    };

    const attendPercent = session.totalStudents > 0
        ? Math.round((session.attendeeCount / session.totalStudents) * 100)
        : 0;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                            <Icon name="arrow-back" size={22} color={colors.text.primary} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle}>{session.courseName}</Text>
                            <Text style={styles.headerSub}>{session.courseCode}</Text>
                        </View>
                        <View style={styles.livePill}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>

                        <View style={styles.infoGrid}>
                            <View style={styles.infoCard}>
                                <Icon name="room" size={20} color="#3B82F6" />
                                <Text style={styles.infoLabel}>القاعة</Text>
                                <Text style={styles.infoValue}>{session.room || '—'}</Text>
                            </View>
                            <View style={styles.infoCard}>
                                <Icon name="access-time" size={20} color="#F59E0B" />
                                <Text style={styles.infoLabel}>البداية</Text>
                                <Text style={styles.infoValue}>{formatTime(session.startTime)}</Text>
                            </View>
                            <View style={styles.infoCard}>
                                <Icon name="people" size={20} color="#10B981" />
                                <Text style={styles.infoLabel}>الحضور</Text>
                                <Text style={styles.infoValue}>{session.attendeeCount}</Text>
                            </View>
                            <View style={styles.infoCard}>
                                <Icon name="bar-chart" size={20} color="#8B5CF6" />
                                <Text style={styles.infoLabel}>النسبة</Text>
                                <Text style={styles.infoValue}>{attendPercent}%</Text>
                            </View>
                        </View>

                        <View style={styles.progressSection}>
                            <View style={styles.progressBg}>
                                <View style={[styles.progressFill, { width: `${attendPercent}%` }]} />
                            </View>
                        </View>

                        {(session as any).geoEnabled && (
                            <View style={styles.geoBadge}>
                                <Icon name="my-location" size={16} color="#10B981" />
                                <Text style={styles.geoBadgeText}>
                                    تتبع GPS نشط — نطاق {(session as any).radiusMeters ?? 50}م
                                </Text>
                            </View>
                        )}

                        <View style={styles.qrSection}>
                            <Text style={styles.qrSectionTitle}>QR تسجيل الحضور</Text>
                            <Text style={styles.qrSectionSub}>اعرض هذا الكود للطلاب</Text>

                            <View style={styles.qrBox}>
                                {QRCode ? (
                                    <QRCode
                                        value={qrValue}
                                        size={200}
                                        color={colors.text.primary}
                                        backgroundColor="transparent"
                                        getRef={(ref: any) => { svgRef.current = ref; }}
                                    />
                                ) : (
                                    <View style={styles.qrFallback}>
                                        <Icon name="qr-code" size={100} color={colors.text.primary} />
                                        <Text style={styles.qrFallbackId} selectable>
                                            {session.id}
                                        </Text>
                                        <Text style={styles.qrFallbackHint}>
                                            ثبّت react-native-qrcode-svg لعرض QR حقيقي
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.shareRow}>
                                <TouchableOpacity
                                    style={styles.shareBtn}
                                    onPress={handleShareText}>
                                    <Icon name="share" size={18} color={colors.primary} />
                                    <Text style={styles.shareBtnText}>مشاركة تفاصيل الجلسة</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.infoNote}>
                                <Icon name="info-outline" size={14} color="#3B82F6" />
                                <Text style={styles.infoNoteText}>
                                    الكود صالح طوال مدة الجلسة النشطة فقط
                                </Text>
                            </View>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.background.primary,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        maxHeight: '92%',
    },
    handle: { width: 40, height: 4, backgroundColor: colors.border.primary, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
    headerSub:   { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EF444420', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
    liveText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },

    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    infoCard: {
        flex: 1, minWidth: '44%',
        backgroundColor: colors.background.secondary,
        borderRadius: 14, borderWidth: 1, borderColor: colors.border.primary,
        padding: 14, alignItems: 'center', gap: 6,
    },
    infoLabel: { fontSize: 11, color: colors.text.muted, fontWeight: '600' },
    infoValue: { fontSize: 16, fontWeight: '800', color: colors.text.primary },

    progressSection: { marginBottom: 16 },
    progressBg: { height: 6, backgroundColor: colors.border.primary, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, backgroundColor: '#10B981', borderRadius: 3 },

    geoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#10B98115', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 8, marginBottom: 16,
        borderWidth: 1, borderColor: '#10B98130',
    },
    geoBadgeText: { fontSize: 13, color: '#10B981', fontWeight: '600' },

    qrSection: { alignItems: 'center' },
    qrSectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
    qrSectionSub:   { fontSize: 13, color: colors.text.muted, marginBottom: 20 },
    qrBox: {
        padding: 24, borderRadius: 20,
        backgroundColor: colors.background.secondary,
        borderWidth: 1, borderColor: colors.border.primary,
        marginBottom: 20, alignItems: 'center',
    },
    qrFallback: { alignItems: 'center', gap: 10 },
    qrFallbackId:   { fontSize: 12, color: colors.primary, fontWeight: '700', textAlign: 'center' },
    qrFallbackHint: { fontSize: 11, color: colors.text.muted, textAlign: 'center' },

    shareRow: { width: '100%', gap: 10, marginBottom: 14 },
    shareBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1, borderColor: colors.primary, borderRadius: 12, paddingVertical: 12,
    },
    shareBtnSecondary: { borderColor: '#8B5CF6' },
    shareBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },

    infoNote: {
        flexDirection: 'row', gap: 6, alignItems: 'center',
        backgroundColor: '#3B82F611', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8, width: '100%',
    },
    infoNoteText: { fontSize: 12, color: colors.text.muted, flex: 1 },
});
