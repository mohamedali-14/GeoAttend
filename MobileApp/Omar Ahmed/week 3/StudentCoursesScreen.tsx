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
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../const/colors';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';

interface Course {
    id: string;
    name: string;
    code: string;
    department: string;
    creditHours: number;
    professorName: string;
    professorId: string;
    enrolled: boolean;
    enrollmentId?: string;
}

export default function StudentCoursesScreen() {
    const router = useRouter();
    const { userData, user } = useAuth();

    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');
    const [departments, setDepartments] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'available' | 'enrolled'>('available');

    useEffect(() => {
        if (user?.uid) {
            fetchCourses();
        }
    }, [user]);

    const fetchCourses = async () => {
        try {
            setLoading(true);

            const coursesSnapshot = await getDocs(collection(db, 'courses'));

            const enrollmentsQuery = query(
                collection(db, 'enrollments'),
                where('studentId', '==', user?.uid)
            );
            const enrollmentsSnap = await getDocs(enrollmentsQuery);

            const enrolledCourseIds = enrollmentsSnap.docs.map(doc => ({
                courseId: doc.data().courseId,
                enrollmentId: doc.id
            }));

            const deptSet = new Set<string>();
            const coursesList: Course[] = [];

            for (const courseDoc of coursesSnapshot.docs) {
                const data = courseDoc.data();
                deptSet.add(data.department || 'General');

                let professorName = 'غير معين';
                if (data.professorId) {
                    const professorDoc = await getDoc(doc(db, 'users', data.professorId));
                    if (professorDoc.exists()) {
                        professorName = professorDoc.data().fullName || 'دكتور';
                    }
                }

                const enrolled = enrolledCourseIds.find(e => e.courseId === courseDoc.id);

                coursesList.push({
                    id: courseDoc.id,
                    name: data.name || 'Unnamed',
                    code: data.code || '---',
                    department: data.department || 'General',
                    creditHours: data.creditHours || 3,
                    professorName: professorName,
                    professorId: data.professorId || '',
                    enrolled: !!enrolled,
                    enrollmentId: enrolled?.enrollmentId
                });
            }

            setAllCourses(coursesList);
            setEnrolledCourses(coursesList.filter(c => c.enrolled));
            setAvailableCourses(coursesList.filter(c => !c.enrolled));
            setDepartments(Array.from(deptSet));

        } catch (error) {
            console.error('Error fetching courses:', error);
            Alert.alert('خطأ', 'فشل في تحميل المواد');
        } finally {
            setLoading(false);
        }
    };

    const handleEnroll = async (course: Course) => {
        try {
            const enrollmentRef = await addDoc(collection(db, 'enrollments'), {
                studentId: user?.uid,
                studentName: userData?.fullName,
                courseId: course.id,
                courseName: course.name,
                courseCode: course.code,
                enrolledAt: new Date().toISOString(),
                status: 'active'
            });

            const courseRef = doc(db, 'courses', course.id);
            const courseDoc = await getDoc(courseRef);
            const currentCount = courseDoc.data()?.studentCount || 0;
            await updateDoc(courseRef, {
                studentCount: currentCount + 1
            });

            const updatedCourse = { ...course, enrolled: true, enrollmentId: enrollmentRef.id };

            setAvailableCourses(prev => prev.filter(c => c.id !== course.id));
            setEnrolledCourses(prev => [...prev, updatedCourse]);

            Alert.alert('✅ تم', `تم تسجيلك في مادة ${course.name} بنجاح`);

        } catch (error) {
            Alert.alert('خطأ', 'فشل في تسجيل المادة');
        }
    };

    const handleUnenroll = async (course: Course) => {
        Alert.alert(
            'تأكيد',
            `هل أنت متأكد من حذف مادة ${course.name}؟`,
            [
                { text: 'إلغاء', style: 'cancel' },
                {
                    text: 'حذف',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (course.enrollmentId) {
                                await deleteDoc(doc(db, 'enrollments', course.enrollmentId));
                            }

                            const courseRef = doc(db, 'courses', course.id);
                            const courseDoc = await getDoc(courseRef);
                            const currentCount = courseDoc.data()?.studentCount || 1;
                            await updateDoc(courseRef, {
                                studentCount: Math.max(0, currentCount - 1)
                            });

                            const updatedCourse = { ...course, enrolled: false, enrollmentId: undefined };

                            setEnrolledCourses(prev => prev.filter(c => c.id !== course.id));
                            setAvailableCourses(prev => [...prev, updatedCourse]);

                            Alert.alert('✅ تم', `تم حذف مادة ${course.name} بنجاح`);

                        } catch (error) {
                            Alert.alert('خطأ', 'فشل في حذف المادة');
                        }
                    }
                }
            ]
        );
    };

    const filterCourses = (courses: Course[]) => {
        let filtered = courses;

        if (searchText) {
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(searchText.toLowerCase()) ||
                c.code.toLowerCase().includes(searchText.toLowerCase()) ||
                c.professorName.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        if (selectedDepartment !== 'all') {
            filtered = filtered.filter(c => c.department === selectedDepartment);
        }

        return filtered;
    };

    const getDepartmentColor = (dept: string) => {
        const colors = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];
        const index = departments.indexOf(dept) % colors.length;
        return colors[index];
    };

    const renderCourseCard = (course: Course, isEnrolled: boolean) => (
        <View key={course.id} style={styles.courseCard}>
            <View style={[styles.colorBar, { backgroundColor: getDepartmentColor(course.department) }]} />
            <View style={styles.courseContent}>
                <View style={styles.courseHeader}>
                    <View>
                        <Text style={styles.courseCode}>{course.code}</Text>
                        <Text style={styles.courseName}>{course.name}</Text>
                    </View>
                    <View style={[styles.creditBadge, { backgroundColor: getDepartmentColor(course.department) + '20' }]}>
                        <Text style={[styles.creditText, { color: getDepartmentColor(course.department) }]}>
                            {course.creditHours} س
                        </Text>
                    </View>
                </View>

                <View style={styles.courseDetails}>
                    <View style={styles.detailRow}>
                        <Icon name="person" size={16} color={colors.text.muted} />
                        <Text style={styles.detailText}>{course.professorName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Icon name="business" size={16} color={colors.text.muted} />
                        <Text style={styles.detailText}>{course.department}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        isEnrolled ? styles.deleteButton : styles.enrollButton
                    ]}
                    onPress={() => isEnrolled ? handleUnenroll(course) : handleEnroll(course)}
                >
                    <Text style={[
                        styles.actionButtonText,
                        isEnrolled ? styles.deleteButtonText : styles.enrollButtonText
                    ]}>
                        {isEnrolled ? '✅ مسجل' : 'تسجيل المادة'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>جاري التحميل...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const filteredAvailable = filterCourses(availableCourses);
    const filteredEnrolled = filterCourses(enrolledCourses);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>المواد الدراسية</Text>
                    <TouchableOpacity onPress={fetchCourses} style={styles.refreshButton}>
                        <Icon name="refresh" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <Icon name="search" size={20} color={colors.text.muted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="بحث عن مادة..."
                        placeholderTextColor={colors.text.muted}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.departmentsContainer}>
                    <TouchableOpacity
                        style={[styles.deptChip, selectedDepartment === 'all' && styles.deptChipActive]}
                        onPress={() => setSelectedDepartment('all')}
                    >
                        <Text style={[styles.deptChipText, selectedDepartment === 'all' && styles.deptChipTextActive]}>
                            الكل
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

                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'available' && styles.activeTab]}
                        onPress={() => setActiveTab('available')}
                    >
                        <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
                            المواد المتاحة ({filteredAvailable.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'enrolled' && styles.activeTab]}
                        onPress={() => setActiveTab('enrolled')}
                    >
                        <Text style={[styles.tabText, activeTab === 'enrolled' && styles.activeTabText]}>
                            المواد المسجلة ({filteredEnrolled.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'available' && (
                    filteredAvailable.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Icon name="menu-book" size={60} color={colors.text.muted} />
                            <Text style={styles.emptyTitle}>لا توجد مواد متاحة</Text>
                            <Text style={styles.emptyText}>جميع المواد مسجلة أو لا توجد مواد في هذا القسم</Text>
                        </View>
                    ) : (
                        filteredAvailable.map(course => renderCourseCard(course, false))
                    )
                )}

                {activeTab === 'enrolled' && (
                    filteredEnrolled.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Icon name="bookmark" size={60} color={colors.text.muted} />
                            <Text style={styles.emptyTitle}>لم تسجل أي مواد بعد</Text>
                            <Text style={styles.emptyText}>سجل في المواد من قسم المواد المتاحة</Text>
                        </View>
                    ) : (
                        filteredEnrolled.map(course => renderCourseCard(course, true))
                    )
                )}
                <View style={{ height: 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
        paddingTop: 25,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 20,
        paddingBottom: 10,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text.primary,
    },
    refreshButton: {
        padding: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background.primary,
    },
    loadingText: {
        fontSize: 16,
        color: colors.text.muted,
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
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 8,
        color: colors.text.primary,
        fontSize: 16,
    },
    departmentsContainer: {
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
        fontSize: 14,
        color: colors.text.muted,
    },
    deptChipTextActive: {
        color: colors.white,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: colors.background.secondary,
        borderRadius: 10,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 14,
        color: colors.text.muted,
    },
    activeTabText: {
        color: colors.white,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
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
        paddingHorizontal: 20,
    },
    courseCard: {
        backgroundColor: colors.background.secondary,
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: 'row',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    colorBar: {
        width: 6,
        height: '100%',
    },
    courseContent: {
        flex: 1,
        padding: 16,
    },
    courseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    courseCode: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 2,
    },
    courseName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
    },
    creditBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    creditText: {
        fontSize: 12,
        fontWeight: '600',
    },
    courseDetails: {
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    detailText: {
        fontSize: 14,
        color: colors.text.secondary,
    },
    actionButton: {
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    enrollButton: {
        backgroundColor: colors.primary,
    },
    deleteButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.error,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    enrollButtonText: {
        color: colors.white,
    },
    deleteButtonText: {
        color: colors.error,
    },
});