import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    ScrollView, Platform, Alert, Share, Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/const/colors';
import { LectureSession, AttendanceRecord, StudentLocation } from './types';
import {
    subscribeToSession,
    subscribeToAttendance,
    subscribeToStudentLocations,
} from './professorService';
import { getDistanceMeters } from './geoService';
import {
    triggerRandomCheck,
    cancelRandomCheck,
    finalizeRandomCheck,
    subscribeToCheckResponses,
    CheckResponse,
} from './randomCheckService';

let QRCode: any = null;
try { QRCode = require('react-native-qrcode-svg').default; } catch (_) {}

interface Props {
    visible: boolean;
    onClose: () => void;
    session: LectureSession;
    courses?: any[];
}

export default function LectureDetailScreen({ visible, onClose, session, courses = [] }: Props) {
    const [liveSession, setLiveSession]       = useState<Partial<LectureSession>>(session);
    const [attendance,  setAttendance]        = useState<AttendanceRecord[]>([]);
    const [locations,   setLocations]         = useState<StudentLocation[]>([]);
    const [activeTab,   setActiveTab]         = useState<'qr' | 'list' | 'geo'>('qr');

    const [randomCheckActive, setRandomCheckActive]  = useState(false);
    const [currentCheckId,    setCurrentCheckId]     = useState<string>('');
    const [checkResponses,    setCheckResponses]     = useState<CheckResponse[]>([]);
    const [checkSecondsLeft,  setCheckSecondsLeft]   = useState(0);
    const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const checkUnsubRef = useRef<(() => void) | null>(null);

    const svgRef    = useRef<any>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const newJoinAnim = useRef(new Animated.Value(0)).current;
    const prevCountRef = useRef(0);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const flashNewJoin = useCallback(() => {
        newJoinAnim.setValue(1);
        Animated.timing(newJoinAnim, { toValue: 0, duration: 1200, useNativeDriver: false }).start();
    }, []);

    useEffect(() => {
        if (!visible) return;

        const unsubSession = subscribeToSession(session.id, courses, (updated) => {
            setLiveSession(prev => ({ ...prev, ...updated }));
        });

        const unsubAttendance = subscribeToAttendance(session.id, (records) => {
            const presentNow = records.filter(r => r.status === 'present').length;
            if (presentNow > prevCountRef.current) flashNewJoin();
            prevCountRef.current = presentNow;
            setAttendance(records);
        });

        const unsubLocations = session.geoEnabled
            ? subscribeToStudentLocations(session.id, (locs) => {
                const center = {
                    latitude:  (session.centerLat  ?? liveSession.centerLat)  as number,
                    longitude: (session.centerLng  ?? liveSession.centerLng)  as number,
                };
                const radius = session.radiusMeters ?? liveSession.radiusMeters ?? 50;
                const enriched = locs.map(l => ({
                    ...l,
                    distanceMeters: getDistanceMeters(
                        { latitude: l.latitude, longitude: l.longitude },
                        center,
                    ),
                    isOutside: getDistanceMeters(
                        { latitude: l.latitude, longitude: l.longitude },
                        center,
                    ) > radius,
                }));
                setLocations(enriched);
            })
            : null;

        return () => {
            unsubSession();
            unsubAttendance();
            if (unsubLocations) unsubLocations();
        };
    }, [visible, session.id]);

    const mergedSession   = { ...session, ...liveSession } as LectureSession;
    const presentCount    = attendance.filter(r => r.status === 'present').length;
    const lateCount       = attendance.filter(r => r.status === 'late').length;
    const totalStudents   = mergedSession.totalStudents || 0;
    const attendPercent   = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
    const outsideStudents = locations.filter(l => l.isOutside);

    const qrValue = JSON.stringify({
        sessionId: session.id,
        courseId:  session.courseId,
        type:      'attendance',
    });

    const formatTime = (d: Date | any) => {
        try {
            const date = d?.toDate ? d.toDate() : new Date(d);
            return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        } catch { return '—'; }
    };

    const handleShareText = async () => {
        try {
            await Share.share({
                message:
                    `📚 حضور جلسة: ${mergedSession.courseName}\n` +
                    `🏫 القاعة: ${mergedSession.room || '—'}\n` +
                    `⏰ من: ${formatTime(mergedSession.startTime)} إلى ${formatTime(mergedSession.endTime)}\n` +
                    `🔑 Session ID: ${session.id}\n\n` +
                    `افتح تطبيق GeoTrack وامسح QR الدكتور للتسجيل.`,
                title: `جلسة ${mergedSession.courseName}`,
            });
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        }
    };

    const handleTriggerRandomCheck = async () => {
        const DEADLINE_SECONDS = 120;
        const checkId = await triggerRandomCheck(session.id, DEADLINE_SECONDS);
        setCurrentCheckId(checkId);
        setCheckSecondsLeft(DEADLINE_SECONDS);
        setRandomCheckActive(true);
        setCheckResponses([]);

        checkUnsubRef.current = subscribeToCheckResponses(session.id, checkId, setCheckResponses);

        checkTimerRef.current = setInterval(async () => {
            setCheckSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(checkTimerRef.current!);
                    if (checkUnsubRef.current) checkUnsubRef.current();
                    finalizeRandomCheck(session.id, checkId, session.courseId)
                        .then(({ confirmed, revoked }) => {
                            Alert.alert('انتهى الاختبار العشوائي',
                                `✅ أكد ${confirmed} طالب\n❌ سُحب حضور ${revoked} طالب`);
                            setRandomCheckActive(false);
                        });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleCancelRandomCheck = () => {
        clearInterval(checkTimerRef.current!);
        if (checkUnsubRef.current) checkUnsubRef.current();
        cancelRandomCheck(session.id);
        setRandomCheckActive(false);
        setCheckResponses([]);
    };

    const statusColor = (s: string) =>
        s === 'present' ? '#10B981' : s === 'late' ? '#F59E0B' : '#EF4444';

    const renderQRTab = () => (
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
                        <Text style={styles.qrFallbackId} selectable>{session.id}</Text>
                        <Text style={styles.qrFallbackHint}>ثبّت react-native-qrcode-svg لعرض QR حقيقي</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShareText}>
                <Icon name="share" size={18} color={colors.primary} />
                <Text style={styles.shareBtnText}>مشاركة تفاصيل الجلسة</Text>
            </TouchableOpacity>

            {!randomCheckActive ? (
                <TouchableOpacity style={styles.randomCheckTriggerBtn} onPress={handleTriggerRandomCheck}>
                    <Icon name="shuffle" size={18} color="#8B5CF6" />
                    <Text style={styles.randomCheckTriggerText}>اختبار حضور عشوائي</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.activeCheckCard}>
                    <View style={styles.activeCheckRow}>
                        <Icon name="timer" size={16} color="#8B5CF6" />
                        <Text style={styles.activeCheckTimer}>{checkSecondsLeft}s</Text>
                        <Text style={styles.activeCheckCount}>— {checkResponses.length} أكدوا</Text>
                        <TouchableOpacity onPress={handleCancelRandomCheck} style={styles.cancelCheckBtn}>
                            <Text style={styles.cancelCheckText}>إلغاء</Text>
                        </TouchableOpacity>
                    </View>
                    {checkResponses.length > 0 && (
                        <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                            {checkResponses.map(r => (
                                <View key={r.studentId} style={styles.checkResponseRow}>
                                    <Icon name="check-circle" size={14} color="#10B981" />
                                    <Text style={styles.checkResponseName}>{r.studentName}</Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}

            <View style={styles.infoNote}>
                <Icon name="info-outline" size={14} color="#3B82F6" />
                <Text style={styles.infoNoteText}>الكود صالح طوال مدة الجلسة النشطة فقط</Text>
            </View>
        </View>
    );

    const renderListTab = () => (
        <View>
            {attendance.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="people-outline" size={50} color={colors.text.muted} />
                    <Text style={styles.emptyText}>لا يوجد حضور بعد</Text>
                    <Text style={styles.emptySubText}>سيظهر الطلاب هنا فور تسجيلهم</Text>
                </View>
            ) : (
                attendance.map((r) => (
                    <View key={r.studentId} style={styles.studentRow}>
                        <View style={[styles.studentAvatar, { backgroundColor: statusColor(r.status) + '22' }]}>
                            <Text style={[styles.studentAvatarText, { color: statusColor(r.status) }]}>
                                {r.studentName.charAt(0)}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>{r.studentName}</Text>
                            <Text style={styles.studentTime}>{formatTime(r.timestamp)}</Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: statusColor(r.status) + '22' }]}>
                            <Text style={[styles.statusPillText, { color: statusColor(r.status) }]}>
                                {r.status === 'present' ? 'حاضر' : r.status === 'late' ? 'متأخر' : 'غائب'}
                            </Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderGeoTab = () => {
        if (!mergedSession.geoEnabled) {
            return (
                <View style={styles.emptyState}>
                    <Icon name="location-off" size={50} color={colors.text.muted} />
                    <Text style={styles.emptyText}>تتبع GPS غير مفعّل</Text>
                    <Text style={styles.emptySubText}>فعّل GPS عند إنشاء الجلسة لرؤية هذه البيانات</Text>
                </View>
            );
        }
        return (
            <View>
                {outsideStudents.length > 0 && (
                    <View style={styles.alertBanner}>
                        <Icon name="warning" size={18} color="#EF4444" />
                        <Text style={styles.alertBannerText}>
                            {outsideStudents.length} طالب خارج النطاق ({mergedSession.radiusMeters ?? 50}م)
                        </Text>
                    </View>
                )}

                {locations.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="my-location" size={50} color={colors.text.muted} />
                        <Text style={styles.emptyText}>لا توجد بيانات موقع بعد</Text>
                        <Text style={styles.emptySubText}>تظهر البيانات فور إرسال الطلاب لموقعهم</Text>
                    </View>
                ) : (
                    locations
                        .sort((a, b) => (b.isOutside ? 1 : 0) - (a.isOutside ? 1 : 0))
                        .map((l) => (
                            <View key={l.studentId} style={[
                                styles.geoRow,
                                l.isOutside && styles.geoRowOutside,
                            ]}>
                                <View style={[
                                    styles.geoIcon,
                                    { backgroundColor: l.isOutside ? '#EF444422' : '#10B98122' },
                                ]}>
                                    <Icon
                                        name={l.isOutside ? 'location-off' : 'my-location'}
                                        size={18}
                                        color={l.isOutside ? '#EF4444' : '#10B981'}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.geoName}>{l.studentName}</Text>
                                    <Text style={styles.geoDistance}>
                                        {Math.round(l.distanceMeters ?? 0)} م من المركز
                                    </Text>
                                </View>
                                <View style={[
                                    styles.geoStatusDot,
                                    { backgroundColor: l.isOutside ? '#EF4444' : '#10B981' },
                                ]} />
                            </View>
                        ))
                )}
            </View>
        );
    };

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
                            <Text style={styles.headerTitle}>{mergedSession.courseName}</Text>
                            <Text style={styles.headerSub}>{mergedSession.courseCode}</Text>
                        </View>
                        {mergedSession.isActive ? (
                            <View style={styles.livePill}>
                                <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                        ) : (
                            <View style={[styles.livePill, styles.endedPill]}>
                                <Icon name="stop-circle" size={12} color={colors.text.muted} />
                                <Text style={[styles.liveText, { color: colors.text.muted }]}>ENDED</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoCard}>
                            <Icon name="room" size={20} color="#3B82F6" />
                            <Text style={styles.infoLabel}>القاعة</Text>
                            <Text style={styles.infoValue}>{mergedSession.room || '—'}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Icon name="access-time" size={20} color="#F59E0B" />
                            <Text style={styles.infoLabel}>البداية</Text>
                            <Text style={styles.infoValue}>{formatTime(mergedSession.startTime)}</Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Icon name="people" size={20} color="#10B981" />
                            <Text style={styles.infoLabel}>الحضور</Text>
                            <Animated.Text style={[styles.infoValue, {
                                color: newJoinAnim.interpolate({
                                    inputRange:  [0, 1],
                                    outputRange: [colors.text.primary, '#10B981'],
                                }),
                            }]}>
                                {presentCount}
                            </Animated.Text>
                        </View>
                        <View style={styles.infoCard}>
                            <Icon name="bar-chart" size={20} color="#8B5CF6" />
                            <Text style={styles.infoLabel}>النسبة</Text>
                            <Text style={styles.infoValue}>{attendPercent}%</Text>
                        </View>
                    </View>

                    <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${attendPercent}%` }]} />
                    </View>

                    {outsideStudents.length > 0 && (
                        <TouchableOpacity
                            style={styles.outsideAlert}
                            onPress={() => setActiveTab('geo')}
                        >
                            <Icon name="warning" size={15} color="#EF4444" />
                            <Text style={styles.outsideAlertText}>
                                {outsideStudents.length} طالب خارج النطاق — اضغط للتفاصيل
                            </Text>
                            <Icon name="chevron-right" size={15} color="#EF4444" />
                        </TouchableOpacity>
                    )}

                    <View style={styles.tabBar}>
                        {([
                            { key: 'qr',   icon: 'qr-code',     label: 'QR' },
                            { key: 'list', icon: 'people',       label: `الحضور (${attendance.length})` },
                            { key: 'geo',  icon: 'my-location',  label: 'GPS' },
                        ] as const).map(t => (
                            <TouchableOpacity
                                key={t.key}
                                style={[styles.tabItem, activeTab === t.key && styles.tabItemActive]}
                                onPress={() => setActiveTab(t.key)}
                            >
                                <Icon name={t.icon} size={16} color={activeTab === t.key ? colors.primary : colors.text.muted} />
                                <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>
                                    {t.label}
                                </Text>
                                {t.key === 'geo' && outsideStudents.length > 0 && (
                                    <View style={styles.tabBadge}>
                                        <Text style={styles.tabBadgeText}>{outsideStudents.length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                        {activeTab === 'qr'   && renderQRTab()}
                        {activeTab === 'list' && renderListTab()}
                        {activeTab === 'geo'  && renderGeoTab()}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.background.primary,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        maxHeight: '94%',
        minHeight: '75%',
    },
    handle: { width: 40, height: 4, backgroundColor: colors.border.primary, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
    headerSub:   { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EF444420', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    endedPill: { backgroundColor: colors.background.secondary },
    liveDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },
    liveText: { fontSize: 11, fontWeight: '800', color: '#EF4444' },

    infoGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    infoCard: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        borderRadius: 12, borderWidth: 1, borderColor: colors.border.primary,
        padding: 10, alignItems: 'center', gap: 4,
    },
    infoLabel: { fontSize: 10, color: colors.text.muted, fontWeight: '600' },
    infoValue: { fontSize: 15, fontWeight: '800', color: colors.text.primary },

    progressBg: { height: 5, backgroundColor: colors.border.primary, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
    progressFill: { height: 5, backgroundColor: '#10B981', borderRadius: 3 },

    outsideAlert: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#EF444412', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12,
        borderWidth: 1, borderColor: '#EF444430',
    },
    outsideAlertText: { flex: 1, fontSize: 12, color: '#EF4444', fontWeight: '600' },

    tabBar: { flexDirection: 'row', backgroundColor: colors.background.secondary, borderRadius: 12, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: colors.border.primary },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8 },
    tabItemActive: { backgroundColor: colors.background.primary, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3 },
    tabLabel: { fontSize: 11, color: colors.text.muted },
    tabLabelActive: { color: colors.primary, fontWeight: '700' },
    tabBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
    tabBadgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },

    qrSection: { alignItems: 'center' },
    qrSectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
    qrSectionSub:   { fontSize: 13, color: colors.text.muted, marginBottom: 20 },
    qrBox: { padding: 24, borderRadius: 20, backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: colors.border.primary, marginBottom: 20, alignItems: 'center' },
    qrFallback: { alignItems: 'center', gap: 10 },
    qrFallbackId:   { fontSize: 12, color: colors.primary, fontWeight: '700', textAlign: 'center' },
    qrFallbackHint: { fontSize: 11, color: colors.text.muted, textAlign: 'center' },
    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.primary, borderRadius: 12, paddingVertical: 12, width: '100%', marginBottom: 12 },
    shareBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },

    randomCheckTriggerBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1, borderColor: '#8B5CF6', borderRadius: 12,
        paddingVertical: 12, width: '100%', marginBottom: 12,
    },
    randomCheckTriggerText: { fontSize: 14, fontWeight: '600', color: '#8B5CF6' },

    activeCheckCard: {
        width: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#8B5CF640',
        backgroundColor: '#8B5CF610', padding: 14, marginBottom: 12,
    },
    activeCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    activeCheckTimer: { fontSize: 16, fontWeight: '800', color: '#8B5CF6' },
    activeCheckCount: { fontSize: 13, color: colors.text.muted, flex: 1 },
    cancelCheckBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#EF444460' },
    cancelCheckText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
    checkResponseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
    checkResponseName: { fontSize: 12, color: colors.text.secondary },

    infoNote: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#3B82F611', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, width: '100%' },
    infoNoteText: { fontSize: 12, color: colors.text.muted, flex: 1 },

    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
    emptyText: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    emptySubText: { fontSize: 13, color: colors.text.muted, textAlign: 'center' },
    studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.primary, gap: 10 },
    studentAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    studentAvatarText: { fontSize: 15, fontWeight: '700' },
    studentName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    studentTime: { fontSize: 11, color: colors.text.muted, marginTop: 2 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    statusPillText: { fontSize: 11, fontWeight: '700' },

    alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EF444412', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EF444430' },
    alertBannerText: { flex: 1, fontSize: 13, color: '#EF4444', fontWeight: '600' },
    geoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
    geoRowOutside: { backgroundColor: '#EF444408', borderRadius: 10, paddingHorizontal: 8 },
    geoIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    geoName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    geoDistance: { fontSize: 11, color: colors.text.muted, marginTop: 2 },
    geoStatusDot: { width: 10, height: 10, borderRadius: 5 },
});
