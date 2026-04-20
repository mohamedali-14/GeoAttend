import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Modal, FlatList, Platform, Animated, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/const/colors';
import { useAuth } from '@/context/AuthContext';
import ButtonNav from '@/components/ButtonNav';
import {
    fetchAttendanceSummary, markAttendance,
    fetchProfessorCourses, subscribeToAttendance,
} from './professorService';
import { db } from '@/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Course, LectureSession, StudentAttendanceSummary, AttendanceRecord } from './types';
import { exportSessionReport } from './reportService';

const AttendanceBar = ({ percentage, color }: { percentage: number; color: string }) => {
    const w = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(w, { toValue: percentage, duration: 800, useNativeDriver: false }).start();
    }, [percentage]);
    return (
        <View style={styles.attendanceBarBg}>
            <Animated.View style={[styles.attendanceBarFill, {
                width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                backgroundColor: color,
            }]} />
        </View>
    );
};

const LiveDot = () => {
    const scale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: 1.5, duration: 600, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1.0, duration: 600, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return <Animated.View style={[styles.liveDot, { transform: [{ scale }] }]} />;
};

export default function ProfessorAttendanceScreen() {
    const { userData, loading: authLoading } = useAuth();
    const professorId = userData?.uid;

    const [courses, setCourses]               = useState<Course[]>([]);
    const [loadingSummary, setLoadingSummary]  = useState(false);
    const [summary, setSummary]               = useState<StudentAttendanceSummary[]>([]);
    const [filter, setFilter]                 = useState<'all' | 'present' | 'absent'>('all');

    const [sessions, setSessions]             = useState<LectureSession[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [viewMode, setViewMode]             = useState<'students' | 'sessions'>('students');

    const [showModal, setShowModal]           = useState(false);
    const [selectedSession, setSelectedSession] = useState<LectureSession | null>(null);
    const [liveRecords, setLiveRecords]       = useState<AttendanceRecord[]>([]);
    const [liveLoading, setLiveLoading]       = useState(false);
    const [exporting, setExporting]           = useState(false);
    const [modalFilter, setModalFilter]       = useState<'all' | 'present' | 'absent' | 'late'>('all');

    const prevCountRef = useRef(0);
    const countAnim   = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!authLoading && professorId) loadData();
    }, [authLoading, professorId]);

    const loadData = async () => {
        try {
            setLoadingSummary(true);
            setLoadingSessions(true);
            const fetchedCourses = await fetchProfessorCourses(professorId!);
            setCourses(fetchedCourses);

            const summaryData = await fetchAttendanceSummary(professorId!, fetchedCourses);
            setSummary(summaryData);

            const sessSnap = await getDocs(
                query(collection(db, 'sessions'), where('professorId', '==', professorId))
            );
            const sessData: LectureSession[] = sessSnap.docs.map((d) => {
                const data = d.data();
                const course = fetchedCourses.find(c => c.id === data.courseId);
                return {
                    id:           d.id,
                    courseId:     data.courseId     || '',
                    courseName:   course?.name      || data.courseName || '',
                    courseCode:   course?.code      || data.courseCode || '',
                    professorId:  data.professorId  || '',
                    startTime:    data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime || Date.now()),
                    endTime:      data.endTime?.toDate   ? data.endTime.toDate()   : new Date(data.endTime   || Date.now()),
                    room:         data.room         || '',
                    location:     data.room         || '',
                    isActive:     data.isActive     ?? false,
                    attendeeCount: 0,
                    totalStudents: course?.studentCount || 0,
                    geoEnabled:   data.geoEnabled   ?? false,
                    centerLat:    data.centerLat    ?? null,
                    centerLng:    data.centerLng    ?? null,
                    radiusMeters: data.radiusMeters ?? 50,
                };
            }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

            setSessions(sessData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSummary(false);
            setLoadingSessions(false);
        }
    };

    useEffect(() => {
        if (!showModal || !selectedSession) return;

        setLiveLoading(true);
        setLiveRecords([]);
        prevCountRef.current = 0;

        const unsub = subscribeToAttendance(selectedSession.id, (records) => {
            setLiveLoading(false);
            const presentNow = records.filter(r => r.status === 'present').length;
            if (presentNow > prevCountRef.current) {
                Animated.sequence([
                    Animated.timing(countAnim, { toValue: 1.25, duration: 150, useNativeDriver: true }),
                    Animated.timing(countAnim, { toValue: 1.00, duration: 150, useNativeDriver: true }),
                ]).start();
            }
            prevCountRef.current = presentNow;
            setLiveRecords(records);
        });

        return () => { unsub(); setLiveRecords([]); setLiveLoading(false); };
    }, [showModal, selectedSession?.id]);

    const openSession = (s: LectureSession) => {
        setSelectedSession(s);
        setModalFilter('all');
        setShowModal(true);
    };

    const handleMarkAttendance = async (record: AttendanceRecord, newStatus: 'present' | 'absent' | 'late') => {
        if (!selectedSession) return;
        try {
            await markAttendance({
                sessionId:   selectedSession.id,
                courseId:    selectedSession.courseId,
                studentId:   record.studentId,
                studentName: record.studentName,
                status:      newStatus,
            });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
    };

    const handleExport = async (format: 'csv' | 'pdf') => {
        if (!selectedSession) return;
        try {
            setExporting(true);
            await exportSessionReport(format, liveRecords, selectedSession);
        } catch (e: any) {
            Alert.alert('خطأ في التصدير', e.message);
        } finally {
            setExporting(false);
        }
    };

    const filteredSummary = summary.filter(r => {
        if (filter === 'all')     return true;
        if (filter === 'present') return r.lastStatus === 'present';
        return r.lastStatus === 'absent' || r.lastStatus === 'late';
    });

    const filteredModalRecords = liveRecords.filter(r => {
        if (modalFilter === 'all')     return true;
        if (modalFilter === 'present') return r.status === 'present';
        if (modalFilter === 'late')    return r.status === 'late';
        return r.status === 'absent';
    });

    const presentCount     = summary.filter(r => r.lastStatus === 'present').length;
    const absentCount      = summary.filter(r => r.lastStatus === 'absent').length;
    const lateCount        = summary.filter(r => r.lastStatus === 'late').length;
    const livePresentCount = liveRecords.filter(r => r.status === 'present').length;

    const formatSessionDate = (d: Date | any) => {
        try {
            const date = d?.toDate ? d.toDate() : new Date(d);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' · ' +
                   date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch { return '—'; }
    };

    if (authLoading) return (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
    );

    return (
        <View style={styles.root}>
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>

                <View style={styles.attSummaryRow}>
                    {[
                        { label: 'Present', value: presentCount, color: '#10B981', icon: 'check-circle' },
                        { label: 'Absent',  value: absentCount,  color: '#EF4444', icon: 'cancel' },
                        { label: 'Late',    value: lateCount,    color: '#F59E0B', icon: 'schedule' },
                    ].map((s, i) => (
                        <View key={i} style={[styles.attSummaryCard, { borderColor: s.color + '44' }]}>
                            <Icon name={s.icon} size={22} color={s.color} />
                            <Text style={[styles.attSummaryVal, { color: s.color }]}>{s.value}</Text>
                            <Text style={styles.attSummaryLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.viewToggle}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'students' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('students')}>
                        <Icon name="people" size={15} color={viewMode === 'students' ? colors.primary : colors.text.muted} />
                        <Text style={[styles.toggleBtnText, viewMode === 'students' && styles.toggleBtnTextActive]}>الطلاب</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'sessions' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('sessions')}>
                        <Icon name="event-note" size={15} color={viewMode === 'sessions' ? colors.primary : colors.text.muted} />
                        <Text style={[styles.toggleBtnText, viewMode === 'sessions' && styles.toggleBtnTextActive]}>الجلسات والتصدير</Text>
                    </TouchableOpacity>
                </View>

                {viewMode === 'students' && (
                    <>
                        <View style={styles.filterRow}>
                            {(['all', 'present', 'absent'] as const).map(f => (
                                <TouchableOpacity key={f}
                                    style={[styles.filterChip, filter === f && styles.filterChipActive]}
                                    onPress={() => setFilter(f)}>
                                    <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                                        {f === 'all' ? 'الكل' : f === 'present' ? 'حاضر' : 'غائب'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {loadingSummary ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                        ) : filteredSummary.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="people" size={40} color={colors.text.muted} />
                                <Text style={styles.emptyText}>لا يوجد بيانات</Text>
                            </View>
                        ) : filteredSummary.map((r) => {
                            const bc = r.percentage >= 75 ? '#10B981' : r.percentage >= 50 ? '#F59E0B' : '#EF4444';
                            const sc = r.lastStatus === 'present' ? '#10B981' : r.lastStatus === 'late' ? '#F59E0B' : '#EF4444';
                            return (
                                <View key={r.studentId} style={styles.studentCard}>
                                    <View style={styles.studentTop}>
                                        <View style={styles.studentAvatar}>
                                            <Text style={styles.studentAvatarText}>{r.studentName.charAt(0)}</Text>
                                        </View>
                                        <View style={styles.studentInfo}>
                                            <Text style={styles.studentName}>{r.studentName}</Text>
                                            <Text style={styles.sessionCount}>{r.attendedSessions}/{r.totalSessions} sessions</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: sc + '22' }]}>
                                                <Text style={[styles.statusBadgeText, { color: sc }]}>
                                                    {r.lastStatus.charAt(0).toUpperCase() + r.lastStatus.slice(1)}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.studentPct, { color: bc }]}>{r.percentage}%</Text>
                                    </View>
                                    <AttendanceBar percentage={r.percentage} color={bc} />
                                </View>
                            );
                        })}
                    </>
                )}

                {viewMode === 'sessions' && (
                    <>
                        <View style={styles.exportHint}>
                            <Icon name="info-outline" size={14} color="#3B82F6" />
                            <Text style={styles.exportHintText}>اضغط على أي جلسة لعرض الحضور وتصديره PDF أو CSV</Text>
                        </View>

                        {loadingSessions ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                        ) : sessions.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="event-note" size={40} color={colors.text.muted} />
                                <Text style={styles.emptyText}>لا توجد جلسات</Text>
                            </View>
                        ) : sessions.map((s) => (
                            <TouchableOpacity key={s.id} style={styles.sessionCard} onPress={() => openSession(s)}>
                                <View style={[styles.sessionStatusDot, { backgroundColor: s.isActive ? '#10B981' : '#9CA3AF' }]} />
                                <View style={styles.sessionCardBody}>
                                    <View style={styles.sessionCardTop}>
                                        <Text style={styles.sessionCardCourse} numberOfLines={1}>{s.courseName}</Text>
                                        {s.isActive && (
                                            <View style={styles.liveChip}>
                                                <Text style={styles.liveChipText}>LIVE</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.sessionCardMeta}>{s.courseCode} · {s.room || '—'}</Text>
                                    <Text style={styles.sessionCardDate}>{formatSessionDate(s.startTime)}</Text>
                                </View>
                                <View style={styles.sessionCardRight}>
                                    <View style={styles.exportIconRow}>
                                        <Icon name="table-view" size={18} color={colors.primary} />
                                        <Icon name="picture-as-pdf" size={18} color="#EF4444" />
                                    </View>
                                    <Icon name="chevron-right" size={18} color={colors.text.muted} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { maxHeight: '92%' }]}>
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle} numberOfLines={1}>
                                    {selectedSession?.courseName || 'Attendance'}
                                </Text>
                                <View style={styles.liveRow}>
                                    {selectedSession?.isActive
                                        ? <><LiveDot /><Text style={styles.liveLabel}>تحديث لحظي</Text></>
                                        : <Text style={styles.closedLabel}>جلسة منتهية · {formatSessionDate(selectedSession?.startTime)}</Text>
                                    }
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.exportBtn, (exporting || liveRecords.length === 0) && { opacity: 0.4 }]}
                                onPress={() => handleExport('csv')}
                                disabled={exporting || liveRecords.length === 0}>
                                <Icon name="table-view" size={22} color={colors.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.exportBtn, (exporting || liveRecords.length === 0) && { opacity: 0.4 }]}
                                onPress={() => handleExport('pdf')}
                                disabled={exporting || liveRecords.length === 0}>
                                <Icon name="picture-as-pdf" size={22} color="#EF4444" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding: 4 }}>
                                <Icon name="close" size={24} color={colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        {exporting && (
                            <View style={styles.exportingBar}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={styles.exportingText}>جاري تصدير الملف...</Text>
                            </View>
                        )}

                        <View style={styles.liveAttSummary}>
                            <Animated.Text style={[styles.liveAttCount, { transform: [{ scale: countAnim }] }]}>
                                {livePresentCount}
                            </Animated.Text>
                            <Text style={styles.liveAttSlash}>/ {selectedSession?.totalStudents ?? liveRecords.length}</Text>
                            <Text style={styles.liveAttLabel}>checked in</Text>
                        </View>

                        <View style={styles.modalStatRow}>
                            {[
                                { label: 'حاضر', count: liveRecords.filter(r => r.status === 'present').length, color: '#10B981', key: 'present' as const },
                                { label: 'متأخر', count: liveRecords.filter(r => r.status === 'late').length,   color: '#F59E0B', key: 'late'    as const },
                                { label: 'غائب',  count: liveRecords.filter(r => r.status === 'absent').length, color: '#EF4444', key: 'absent'  as const },
                            ].map(s => (
                                <TouchableOpacity
                                    key={s.key}
                                    style={[styles.modalStatChip, modalFilter === s.key && { borderColor: s.color, backgroundColor: s.color + '15' }]}
                                    onPress={() => setModalFilter(prev => prev === s.key ? 'all' : s.key)}>
                                    <Text style={[styles.modalStatVal, { color: s.color }]}>{s.count}</Text>
                                    <Text style={styles.modalStatLabel}>{s.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {liveLoading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
                        ) : filteredModalRecords.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="people" size={40} color={colors.text.muted} />
                                <Text style={styles.emptyText}>
                                    {liveRecords.length === 0 ? 'لا يوجد سجلات بعد' : 'لا يوجد نتائج لهذا الفلتر'}
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredModalRecords}
                                keyExtractor={i => i.studentId}
                                style={{ flex: 1 }}
                                renderItem={({ item }) => {
                                    const c = item.status === 'present' ? '#10B981'
                                            : item.status === 'late'    ? '#F59E0B'
                                            : '#EF4444';
                                    return (
                                        <View style={styles.modalStudentRow}>
                                            <View style={[styles.modalAvatar, { backgroundColor: c + '22' }]}>
                                                <Text style={[styles.modalAvatarText, { color: c }]}>
                                                    {item.studentName.charAt(0)}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.modalStudentName}>{item.studentName}</Text>
                                                <Text style={styles.modalStudentTime}>
                                                    {item.timestamp
                                                        ? new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
                                                        : '—'}
                                                </Text>
                                            </View>
                                            {(item as any).selfieUrl && (
                                                <View style={styles.selfieIndicator}>
                                                    <Icon name="face" size={14} color="#10B981" />
                                                </View>
                                            )}
                                            <View style={styles.statusBtns}>
                                                {(['present', 'late', 'absent'] as const).map(s => (
                                                    <TouchableOpacity key={s}
                                                        style={[
                                                            styles.statusBtn,
                                                            item.status === s && { backgroundColor: c + '33', borderColor: c },
                                                        ]}
                                                        onPress={() => handleMarkAttendance(item, s)}>
                                                        <Text style={[styles.statusBtnText, item.status === s && { color: c }]}>
                                                            {s === 'present' ? 'P' : s === 'late' ? 'L' : 'A'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            <ButtonNav role="professor" />
        </View>
    );
}

const styles = StyleSheet.create({
    root:       { flex: 1, backgroundColor: colors.background.primary, paddingTop: 25 },
    loader:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary },
    tabContent: { flex: 1, paddingHorizontal: 16 },

    attSummaryRow:   { flexDirection: 'row', gap: 10, marginBottom: 14, marginTop: 8 },
    attSummaryCard:  { flex: 1, backgroundColor: colors.background.card, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1 },
    attSummaryVal:   { fontSize: 22, fontWeight: '800' },
    attSummaryLabel: { fontSize: 11, color: colors.text.muted },

    viewToggle:          { flexDirection: 'row', backgroundColor: colors.background.secondary, borderRadius: 12, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: colors.border.primary },
    toggleBtn:           { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 9 },
    toggleBtnActive:     { backgroundColor: colors.background.primary, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    toggleBtnText:       { fontSize: 13, color: colors.text.muted, fontWeight: '500' },
    toggleBtnTextActive: { color: colors.primary, fontWeight: '700' },

    filterRow:            { flexDirection: 'row', gap: 8, marginBottom: 14 },
    filterChip:           { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border.primary },
    filterChipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText:       { fontSize: 13, color: colors.text.muted, fontWeight: '500' },
    filterChipTextActive: { color: '#fff', fontWeight: '700' },

    exportHint:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3B82F611', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#3B82F630' },
    exportHintText: { fontSize: 12, color: '#3B82F6', flex: 1 },

    emptyState: { alignItems: 'center', marginTop: 40, gap: 10 },
    emptyText:  { fontSize: 15, fontWeight: '700', color: colors.text.primary },

    studentCard: { backgroundColor: colors.background.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border.primary },
    studentTop:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    studentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary + '22', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    studentAvatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
    studentInfo: { flex: 1 },
    studentName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    sessionCount: { fontSize: 11, color: colors.text.muted, marginTop: 1 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 3 },
    statusBadgeText: { fontSize: 11, fontWeight: '700' },
    studentPct:  { fontSize: 16, fontWeight: '800' },
    attendanceBarBg:   { height: 6, backgroundColor: colors.border.primary, borderRadius: 3, overflow: 'hidden' },
    attendanceBarFill: { height: 6, borderRadius: 3 },

    sessionCard:       { backgroundColor: colors.background.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border.primary, flexDirection: 'row', alignItems: 'center', gap: 12 },
    sessionStatusDot:  { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
    sessionCardBody:   { flex: 1 },
    sessionCardTop:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
    sessionCardCourse: { fontSize: 14, fontWeight: '700', color: colors.text.primary, flex: 1 },
    sessionCardMeta:   { fontSize: 12, color: colors.text.muted, marginBottom: 2 },
    sessionCardDate:   { fontSize: 11, color: colors.text.muted },
    sessionCardRight:  { alignItems: 'center', gap: 6 },
    exportIconRow:     { flexDirection: 'row', gap: 8 },
    liveChip:          { backgroundColor: '#EF444420', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    liveChipText:      { fontSize: 9, fontWeight: '800', color: '#EF4444' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet:   { backgroundColor: colors.background.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
    modalHandle:  { width: 40, height: 4, backgroundColor: colors.border.primary, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    modalHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 4 },
    modalTitle:   { fontSize: 17, fontWeight: '700', color: colors.text.primary },

    exportBtn:     { padding: 8 },
    exportingBar:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary + '15', borderRadius: 10, padding: 10, marginBottom: 10 },
    exportingText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

    liveRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    liveDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    liveLabel:   { fontSize: 12, color: '#10B981', fontWeight: '600' },
    closedLabel: { fontSize: 11, color: colors.text.muted },

    liveAttSummary: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 14 },
    liveAttCount:   { fontSize: 44, fontWeight: '800', color: colors.primary },
    liveAttSlash:   { fontSize: 24, fontWeight: '700', color: colors.text.muted },
    liveAttLabel:   { fontSize: 14, color: colors.text.muted, marginLeft: 4 },

    modalStatRow:   { flexDirection: 'row', gap: 8, marginBottom: 14 },
    modalStatChip:  { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.background.secondary },
    modalStatVal:   { fontSize: 20, fontWeight: '800' },
    modalStatLabel: { fontSize: 11, color: colors.text.muted, marginTop: 2 },

    modalStudentRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.primary, gap: 10 },
    modalAvatar:      { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    modalAvatarText:  { fontSize: 15, fontWeight: '700' },
    modalStudentName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    modalStudentTime: { fontSize: 11, color: colors.text.muted, marginTop: 2 },
    selfieIndicator:  { width: 24, height: 24, borderRadius: 12, backgroundColor: '#10B98120', justifyContent: 'center', alignItems: 'center', marginRight: 4 },

    statusBtns:    { flexDirection: 'row', gap: 6 },
    statusBtn:     { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
    statusBtnText: { fontSize: 11, fontWeight: '700', color: colors.text.muted },
});
