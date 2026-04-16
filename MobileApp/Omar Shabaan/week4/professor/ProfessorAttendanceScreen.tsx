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
import { Course, LectureSession, StudentAttendanceSummary, AttendanceRecord } from './types';

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
    return (
        <Animated.View style={[styles.liveDot, { transform: [{ scale }] }]} />
    );
};

export default function ProfessorAttendanceScreen() {
    const { userData, loading: authLoading } = useAuth();
    const professorId = userData?.uid;

    const [courses, setCourses]               = useState<Course[]>([]);
    const [loadingSummary, setLoadingSummary]  = useState(false);
    const [summary, setSummary]               = useState<StudentAttendanceSummary[]>([]);
    const [filter, setFilter]                 = useState<'all' | 'present' | 'absent'>('all');
    const [showModal, setShowModal]           = useState(false);
    const [selectedSession, setSelectedSession] = useState<LectureSession | null>(null);

    const [liveRecords, setLiveRecords]       = useState<AttendanceRecord[]>([]);
    const [liveLoading, setLiveLoading]       = useState(false);
    const prevCountRef = useRef(0);
    const countAnim   = useRef(new Animated.Value(1)).current;

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

        return () => {
            unsub();
            setLiveRecords([]);
            setLiveLoading(false);
        };
    }, [showModal, selectedSession?.id]);

    useEffect(() => {
        if (!authLoading && professorId) loadData();
    }, [authLoading, professorId]);

    const loadData = async () => {
        try {
            setLoadingSummary(true);
            const fetchedCourses = await fetchProfessorCourses(professorId!);
            setCourses(fetchedCourses);
            const data = await fetchAttendanceSummary(professorId!, fetchedCourses);
            setSummary(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleMarkAttendance = async (
        record: AttendanceRecord,
        newStatus: 'present' | 'absent' | 'late',
    ) => {
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

    const filteredSummary = summary.filter(r => {
        if (filter === 'all')     return true;
        if (filter === 'present') return r.lastStatus === 'present';
        return r.lastStatus === 'absent' || r.lastStatus === 'late';
    });

    const presentCount = summary.filter(r => r.lastStatus === 'present').length;
    const absentCount  = summary.filter(r => r.lastStatus === 'absent').length;
    const lateCount    = summary.filter(r => r.lastStatus === 'late').length;

    const livePresentCount = liveRecords.filter(r => r.status === 'present').length;

    if (authLoading) return (
        <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );

    return (
        <View style={styles.root}>
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
                {/* Summary cards */}
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
                ) : (
                    filteredSummary.map((r) => {
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
                    })
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalSheet, { maxHeight: '88%' }]}>
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>
                                    {selectedSession?.courseName || 'Attendance'}
                                </Text>
                                <View style={styles.liveRow}>
                                    <LiveDot />
                                    <Text style={styles.liveLabel}>تحديث لحظي</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Icon name="close" size={24} color={colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.liveAttSummary}>
                            <Animated.Text style={[styles.liveAttCount, { transform: [{ scale: countAnim }] }]}>
                                {livePresentCount}
                            </Animated.Text>
                            <Text style={styles.liveAttSlash}>/ {selectedSession?.totalStudents ?? 0}</Text>
                            <Text style={styles.liveAttLabel}>checked in</Text>
                        </View>

                        <View style={styles.modalFilterRow}>
                            {([
                                { key: 'all',     label: `الكل (${liveRecords.length})` },
                                { key: 'present', label: `حاضر (${liveRecords.filter(r => r.status === 'present').length})` },
                                { key: 'absent',  label: `غائب (${liveRecords.filter(r => r.status !== 'present').length})` },
                            ] as const).map(f => (
                                <TouchableOpacity
                                    key={f.key}
                                    style={[styles.modalFilterChip]}
                                    onPress={() => {}}
                                >
                                    <Text style={styles.modalFilterText}>{f.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {liveLoading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
                        ) : liveRecords.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Icon name="people" size={40} color={colors.text.muted} />
                                <Text style={styles.emptyText}>لا يوجد سجلات بعد</Text>
                                <Text style={styles.emptySubText}>سيظهر الطلاب هنا فور تسجيلهم</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={liveRecords}
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
    root:        { flex: 1, backgroundColor: colors.background.primary, paddingTop: 25 },
    loader:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary },
    tabContent:  { flex: 1, paddingHorizontal: 16 },

    attSummaryRow:  { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 8 },
    attSummaryCard: { flex: 1, backgroundColor: colors.background.card, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1 },
    attSummaryVal:  { fontSize: 22, fontWeight: '800' },
    attSummaryLabel: { fontSize: 11, color: colors.text.muted },

    filterRow:          { flexDirection: 'row', gap: 8, marginBottom: 16 },
    filterChip:         { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border.primary },
    filterChipActive:   { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText:     { fontSize: 13, color: colors.text.muted, fontWeight: '500' },
    filterChipTextActive: { color: '#fff', fontWeight: '700' },

    emptyState:   { alignItems: 'center', marginTop: 40, gap: 10 },
    emptyText:    { fontSize: 15, fontWeight: '700', color: colors.text.primary },
    emptySubText: { fontSize: 13, color: colors.text.muted },

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

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet:   { backgroundColor: colors.background.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
    modalHandle:  { width: 40, height: 4, backgroundColor: colors.border.primary, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    modalTitle:   { fontSize: 18, fontWeight: '700', color: colors.text.primary },

    liveRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    liveDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    liveLabel: { fontSize: 12, color: '#10B981', fontWeight: '600' },

    liveAttSummary: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 16 },
    liveAttCount:   { fontSize: 44, fontWeight: '800', color: colors.primary },
    liveAttSlash:   { fontSize: 24, fontWeight: '700', color: colors.text.muted },
    liveAttLabel:   { fontSize: 14, color: colors.text.muted, marginLeft: 4 },

    modalFilterRow:  { flexDirection: 'row', gap: 8, marginBottom: 14 },
    modalFilterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: colors.border.primary },
    modalFilterText: { fontSize: 12, color: colors.text.muted },

    modalStudentRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.primary, gap: 10 },
    modalAvatar:      { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    modalAvatarText:  { fontSize: 15, fontWeight: '700' },
    modalStudentName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    modalStudentTime: { fontSize: 11, color: colors.text.muted, marginTop: 2 },

    statusBtns: { flexDirection: 'row', gap: 6 },
    statusBtn:  { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
    statusBtnText: { fontSize: 11, fontWeight: '700', color: colors.text.muted },
});
