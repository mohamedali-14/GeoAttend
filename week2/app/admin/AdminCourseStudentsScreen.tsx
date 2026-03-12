import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { db } from '@/firebaseConfig';
import { collection, getDocs, addDoc, deleteDoc, query, where, getDoc, doc } from 'firebase/firestore';
import { colors } from '@/const/colors';

interface Student {
    id: string;
    fullName: string;
    email: string;
    studentId: string;
    department: string;
    enrolled: boolean;
}

interface Course {
    id: string;
    name: string;
    code: string;
}

export default function AdminCourseStudentsScreen() {
    const router = useRouter();
    const { courseId, courseName } = useLocalSearchParams();

    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [course, setCourse] = useState<Course>({ id: courseId as string, name: courseName as string, code: '' });
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, [courseId]);

    useEffect(() => {
        filterStudents();
    }, [searchText, selectedDepartment, students]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const courseRef = doc(db, 'courses', courseId as string);
            const courseSnap = await getDoc(courseRef);

            if (courseSnap.exists()) {
                const data = courseSnap.data();
                setCourse({
                    id: courseId as string,
                    name: data.name || '',
                    code: data.code || '',
                });
            } else {
                console.log('No course found with id:', courseId);
            }

            const studentsQuery = query(
                collection(db, 'users'),
                where('role', '==', 'student')
            );
            const studentsSnap = await getDocs(studentsQuery);

            const enrollmentsQuery = query(
                collection(db, 'enrollments'),
                where('courseId', '==', courseId)
            );
            const enrollmentsSnap = await getDocs(enrollmentsQuery);
            const enrolledIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);

            const deptSet = new Set<string>();

            const studentsList = studentsSnap.docs.map(doc => {
                const data = doc.data();
                if (data.department) deptSet.add(data.department);
                return {
                    id: doc.id,
                    fullName: data.fullName || '',
                    email: data.email || '',
                    studentId: data.studentId || '',
                    department: data.department || '',
                    enrolled: enrolledIds.includes(doc.id),
                };
            });

            setStudents(studentsList);
            setDepartments(Array.from(deptSet));
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const filterStudents = () => {
        let filtered = students;

        if (searchText) {
            filtered = filtered.filter(s =>
                s.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
                s.email.toLowerCase().includes(searchText.toLowerCase()) ||
                s.studentId.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        if (selectedDepartment !== 'all') {
            filtered = filtered.filter(s => s.department === selectedDepartment);
        }

        setFilteredStudents(filtered);
    };

    const toggleEnrollment = async (student: Student) => {
        try {
            if (student.enrolled) {
                const enrollmentQuery = query(
                    collection(db, 'enrollments'),
                    where('courseId', '==', courseId),
                    where('studentId', '==', student.id)
                );
                const enrollmentSnap = await getDocs(enrollmentQuery);

                enrollmentSnap.forEach(async (doc) => {
                    await deleteDoc(doc.ref);
                });

            } else {
                await addDoc(collection(db, 'enrollments'), {
                    courseId: courseId,
                    studentId: student.id,
                    studentName: student.fullName,
                    studentEmail: student.email,
                    enrolledAt: new Date().toISOString(),
                });
            }

            setStudents(students.map(s =>
                s.id === student.id ? { ...s, enrolled: !s.enrolled } : s
            ));

            Alert.alert(
                'Success',
                `${student.fullName} ${student.enrolled ? 'removed from' : 'added to'} ${course.name}`
            );

        } catch (error) {
            Alert.alert('Error', 'Failed to update enrollment');
        }
    };

    const getDepartmentColor = (dept: string) => {
        const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];
        const index = departments.indexOf(dept) % colors.length;
        return colors[index];
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Manage Students</Text>
                        <Text style={styles.headerSubtitle}>{course.name} ({course.code})</Text>
                    </View>
                    <TouchableOpacity onPress={fetchData} style={styles.refreshButton}>
                        <Icon name="refresh" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <Icon name="search" size={20} color={colors.text.muted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, email or ID..."
                        placeholderTextColor={colors.text.muted}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deptFilter}>
                    <TouchableOpacity
                        style={[styles.deptChip, selectedDepartment === 'all' && styles.deptChipActive]}
                        onPress={() => setSelectedDepartment('all')}
                    >
                        <Text style={[styles.deptChipText, selectedDepartment === 'all' && styles.deptChipTextActive]}>
                            All
                        </Text>
                    </TouchableOpacity>
                    {departments.map(dept => (
                        <TouchableOpacity
                            key={dept}
                            style={[
                                styles.deptChip,
                                selectedDepartment === dept && styles.deptChipActive,
                                { borderColor: getDepartmentColor(dept) }
                            ]}
                            onPress={() => setSelectedDepartment(dept)}
                        >
                            <Text style={[
                                styles.deptChipText,
                                selectedDepartment === dept && styles.deptChipTextActive
                            ]}>
                                {dept}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <ScrollView style={styles.content}>
                    {loading ? (
                        <Text style={styles.loadingText}>Loading students...</Text>
                    ) : filteredStudents.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Icon name="people-outline" size={60} color={colors.text.muted} />
                            <Text style={styles.emptyTitle}>No Students Found</Text>
                            <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.statsBar}>
                                <Text style={styles.statsText}>
                                    Total: {students.length} | Enrolled: {students.filter(s => s.enrolled).length}
                                </Text>
                            </View>

                            {filteredStudents.map((student) => (
                                <View key={student.id} style={styles.studentCard}>
                                    <View style={styles.studentInfo}>
                                        <View style={[styles.avatar, { backgroundColor: getDepartmentColor(student.department) + '20' }]}>
                                            <Text style={[styles.avatarText, { color: getDepartmentColor(student.department) }]}>
                                                {student.fullName.charAt(0)}
                                            </Text>
                                        </View>
                                        <View style={styles.studentDetails}>
                                            <Text style={styles.studentName}>{student.fullName}</Text>
                                            <Text style={styles.studentEmail}>{student.email}</Text>
                                            <View style={styles.studentMeta}>
                                                <Text style={styles.studentId}>ID: {student.studentId}</Text>
                                                <View style={[styles.deptBadge, { backgroundColor: getDepartmentColor(student.department) + '20' }]}>
                                                    <Text style={[styles.deptBadgeText, { color: getDepartmentColor(student.department) }]}>
                                                        {student.department}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.enrollButton,
                                            student.enrolled ? styles.enrolledButton : styles.notEnrolledButton
                                        ]}
                                        onPress={() => toggleEnrollment(student)}
                                    >
                                        <Text style={[
                                            styles.enrolledButtonText,
                                            student.enrolled ? styles.enrolledButtonText : styles.notEnrolledButtonText
                                        ]}>
                                            {student.enrolled ? 'Enrolled' : 'Enroll'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
        paddingTop: 25,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    backButton: {
        padding: 8,
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.primary,
        marginTop: 2,
    },
    refreshButton: {
        padding: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.secondary,
        marginHorizontal: 20,
        marginVertical: 10,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        color: colors.text.secondary,
        fontSize: 16,
    },
    deptFilter: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    deptChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background.secondary,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    deptChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    deptChipText: {
        color: colors.text.muted,
        fontSize: 14,
    },
    deptChipTextActive: {
        color: colors.white,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    loadingText: {
        textAlign: 'center',
        color: colors.text.muted,
        marginTop: 20,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.primary,
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: colors.text.muted,
        textAlign: 'center',
        marginTop: 8,
    },
    statsBar: {
        backgroundColor: colors.background.card,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    statsText: {
        fontSize: 14,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    studentCard: {
        backgroundColor: colors.background.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    studentInfo: {
        flexDirection: 'row',
        flex: 1,
        marginRight: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
    },
    studentDetails: {
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    studentEmail: {
        fontSize: 12,
        color: colors.text.muted,
        marginBottom: 4,
    },
    studentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    studentId: {
        fontSize: 12,
        color: colors.text.muted,
    },
    deptBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    deptBadgeText: {
        fontSize: 10,
        fontWeight: '500',
    },
    enrollButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        minWidth: 80,
        alignItems: 'center',
    },
    enrolledButton: {
        backgroundColor: 'transparent',
        borderColor: colors.primary,
    },
    notEnrolledButton: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    enrolledButtonText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    notEnrolledButtonText: {
        color: colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
});