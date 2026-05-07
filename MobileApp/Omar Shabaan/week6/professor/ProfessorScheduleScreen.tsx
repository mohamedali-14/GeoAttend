import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/const/colors';
import { useAuth } from '@/context/AuthContext';
import ButtonNav from '@/components/ButtonNav';
import { fetchProfessorSchedule, fetchProfessorCourses } from './professorService';
import { Schedule } from './types';

export default function ProfessorScheduleScreen() {
    const { userData, loading: authLoading } = useAuth();
    const professorId = userData?.uid;

    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && professorId) loadSchedule();
    }, [authLoading, professorId]);

    const loadSchedule = async () => {
        try {
            setLoading(true);
            const courses = await fetchProfessorCourses(professorId!);
            const data = await fetchProfessorSchedule(professorId!, courses);
            setSchedules(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) return (
        <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );

    return (
        <View style={styles.root}>
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Schedule</Text>
                    <Text style={styles.sectionAction}
                        onPress={() => Alert.alert('Request Change', 'Schedule change request will be sent to Admin.')}>
                        Request Change
                    </Text>
                </View>

                {schedules.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="calendar-today" size={50} color={colors.text.muted} />
                        <Text style={styles.emptyText}>No schedule found</Text>
                    </View>
                ) : (
                    schedules.map(s => (
                        <View key={s.id} style={styles.schedCard}>
                            <View style={[styles.schedAccent, { backgroundColor: s.color }]} />
                            <View style={styles.schedInfo}>
                                <Text style={styles.schedCourseName}>{s.courseName}</Text>
                                <Text style={styles.schedMeta}>{s.courseCode}</Text>
                                {!!s.location && (
                                    <View style={styles.locationRow}>
                                        <Icon name="location-on" size={13} color={colors.text.muted} />
                                        <Text style={styles.locationText}>{s.location}</Text>
                                    </View>
                                )}
                            </View>
                            <Icon name="chevron-right" size={20} color={colors.text.muted} />
                        </View>
                    ))
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            <ButtonNav role="professor" />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background.primary, paddingTop: 25 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary },
    tabContent: { flex: 1, paddingHorizontal: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    sectionAction: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 14, color: colors.text.muted },
    schedCard: { backgroundColor: colors.background.card, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.border.primary },
    schedAccent: { width: 4, height: 50, borderRadius: 2, marginRight: 12 },
    schedInfo: { flex: 1 },
    schedCourseName: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
    schedMeta: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    locationText: { fontSize: 12, color: colors.text.muted },
});
