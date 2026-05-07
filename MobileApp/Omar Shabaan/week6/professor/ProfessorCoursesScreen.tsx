import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { colors } from '@/const/colors';
import { db } from '@/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import ButtonNav from '@/components/ButtonNav';

const COURSE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

const SectionHeader = ({ title, onAction }: { title: string; onAction: () => void }) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onAction}>
            <Text style={styles.sectionAction}>Refresh</Text>
        </TouchableOpacity>
    </View>
);

export default function ProfessorCoursesScreen() {
    const router = useRouter();
    const { userData, loading: authLoading } = useAuth();
    const professorId = userData?.uid;

    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && professorId) fetchCourses();
    }, [authLoading, professorId]);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const coursesSnap = await getDocs(query(
                collection(db, 'courses'),
                where('professorId', '==', professorId)
            ));

            const coursesList: any[] = [];
            for (let i = 0; i < coursesSnap.docs.length; i++) {
                const doc = coursesSnap.docs[i];
                const data = doc.data();
                const enrollmentsSnap = await getDocs(query(
                    collection(db, 'enrollments'),
                    where('courseId', '==', doc.id)
                ));
                coursesList.push({
                    id: doc.id,
                    name: data.name || 'Unnamed',
                    code: data.code || '---',
                    department: data.department || '',
                    studentCount: enrollmentsSnap.size,
                    color: COURSE_COLORS[i % COURSE_COLORS.length],
                    creditHours: data.creditHours || 0,
                });
            }
            setCourses(coursesList);
        } catch (error) {
            console.error('Error fetching courses:', error);
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
                <SectionHeader title="My Courses" onAction={fetchCourses} />

                {courses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="menu-book" size={60} color={colors.text.muted} />
                        <Text style={styles.emptyTitle}>No courses found</Text>
                        <Text style={styles.emptySub}>Courses assigned to you will appear here</Text>
                    </View>
                ) : (
                    courses.map((c) => (
                        <View key={c.id} style={styles.courseCard}>
                            <View style={[styles.courseStrip, { backgroundColor: c.color }]} />
                            <View style={styles.courseBody}>
                                <View style={styles.courseTop}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.courseCode}>{c.code}</Text>
                                        <Text style={styles.courseName}>{c.name}</Text>
                                        <Text style={styles.courseDept}>{c.department}</Text>
                                    </View>
                                    <View style={[styles.studentBadge, { backgroundColor: c.color + '22' }]}>
                                        <Icon name="people" size={14} color={c.color} />
                                        <Text style={[styles.studentBadgeText, { color: c.color }]}>
                                            {c.studentCount}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.creditRow}>
                                    <Icon name="school" size={13} color={colors.text.muted} />
                                    <Text style={styles.creditText}>{c.creditHours} credit hours</Text>
                                </View>
                                <View style={styles.courseActions}>
                                    <TouchableOpacity
                                        style={[styles.actionPrimary, { borderColor: c.color }]}
                                        onPress={() => router.push('/professor/ProfessorPanel' as any)}
                                    >
                                        <Icon name="play-circle-filled" size={16} color={c.color} />
                                        <Text style={[styles.actionPrimaryText, { color: c.color }]}>Start Session</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionSecondary}
                                        onPress={() => router.push('/professor/ProfessorAttendanceScreen' as any)}
                                    >
                                        <Icon name="bar-chart" size={16} color={colors.text.muted} />
                                        <Text style={styles.actionSecondaryText}>Attendance</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
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
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    emptySub: { fontSize: 14, color: colors.text.muted, textAlign: 'center' },

    courseCard: { backgroundColor: colors.background.card, borderRadius: 16, marginBottom: 14, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: colors.border.primary },
    courseStrip: { width: 6 },
    courseBody: { flex: 1, padding: 16 },
    courseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    courseCode: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 2, letterSpacing: 1 },
    courseName: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    courseDept: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    studentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    studentBadgeText: { fontSize: 14, fontWeight: '700' },
    creditRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
    creditText: { fontSize: 12, color: colors.text.muted },
    courseActions: { flexDirection: 'row', gap: 10 },
    actionPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    actionPrimaryText: { fontSize: 13, fontWeight: '600' },
    actionSecondary: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border.primary },
    actionSecondaryText: { fontSize: 13, color: colors.text.muted },
});
