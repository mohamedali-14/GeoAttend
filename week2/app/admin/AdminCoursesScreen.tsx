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
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { db } from '@/firebaseConfig';
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { colors } from '@/const/colors';

interface Course {
    id: string;
    name: string;
    code: string;
    professorId: string;
    professorName?: string;
    department: string;
    creditHours: number;
    location: string;
}

interface Professor {
    id: string;
    fullName: string;
    email: string;
}

export default function AdminCoursesScreen() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        professorId: '',
        department: '',
        creditHours: '3',
        location: '',
    });

    useEffect(() => {
        fetchCourses();
        fetchProfessors();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const coursesCollection = collection(db, 'courses');
            const coursesSnapshot = await getDocs(coursesCollection);
            const coursesList = await Promise.all(
                coursesSnapshot.docs.map(async (courseDoc) => {
                    const data = courseDoc.data();
                    let professorName = '';
                    if (data.professorId) {
                        const professorDoc = await getDoc(doc(db, 'users', data.professorId));
                        if (professorDoc.exists()) {
                            professorName = (professorDoc.data() as Professor).fullName;
                        }
                    }
                    return {
                        id: courseDoc.id,
                        ...data,
                        professorName,
                    } as Course;
                })
            );
            setCourses(coursesList);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch courses');
        } finally {
            setLoading(false);
        }
    };

    const fetchProfessors = async () => {
        try {
            const usersCollection = collection(db, 'users');
            const q = query(usersCollection, where('role', '==', 'professor'));
            const professorsSnapshot = await getDocs(q);
            const professorsList = professorsSnapshot.docs.map(doc => ({
                id: doc.id,
                fullName: doc.data().fullName,
                email: doc.data().email,
            }));
            setProfessors(professorsList);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch professors');
        }
    };

    const handleAddCourse = () => {
        setEditingCourse(null);
        setFormData({
            name: '',
            code: '',
            professorId: '',
            department: '',
            creditHours: '3',
            location: '',
        });
        setModalVisible(true);
    };

    const handleEditCourse = (course: Course) => {
        setEditingCourse(course);
        setFormData({
            name: course.name,
            code: course.code,
            professorId: course.professorId,
            department: course.department,
            creditHours: course.creditHours.toString(),
            location: course.location,
        });
        setModalVisible(true);
    };

    const handleDeleteCourse = (courseId: string, courseName: string) => {
        Alert.alert(
            "Delete Course",
            `Are you sure you want to delete ${courseName}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteCourse(courseId)
                }
            ]
        );
    };

    const deleteCourse = async (courseId: string) => {
        try {
            await deleteDoc(doc(db, 'courses', courseId));
            setCourses(courses.filter(c => c.id !== courseId));
            Alert.alert('Success', 'Course deleted successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to delete course');
        }
    };

    const saveCourse = async () => {
        if (!formData.name || !formData.code || !formData.professorId) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        try {
            const courseData = {
                name: formData.name,
                code: formData.code,
                professorId: formData.professorId,
                department: formData.department,
                creditHours: parseInt(formData.creditHours),
                location: formData.location,
                updatedAt: new Date().toISOString(),
            };

            if (editingCourse) {
                await updateDoc(doc(db, 'courses', editingCourse.id), courseData);
                Alert.alert('Success', 'Course updated successfully');
            } else {
                await addDoc(collection(db, 'courses'), {
                    ...courseData,
                    createdAt: new Date().toISOString(),
                });
                Alert.alert('Success', 'Course added successfully');
            }

            setModalVisible(false);
            fetchCourses();
        } catch (error) {
            Alert.alert('Error', 'Failed to save course');
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Course Management</Text>
                    <TouchableOpacity onPress={handleAddCourse} style={styles.addButton}>
                        <Icon name="add" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    {loading ? (
                        <Text style={styles.loadingText}>Loading courses...</Text>
                    ) : courses.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Icon name="book" size={60} color={colors.text.muted} />
                            <Text style={styles.emptyTitle}>No Courses Yet</Text>
                            <Text style={styles.emptyText}>Tap the + button to add your first course</Text>
                        </View>
                    ) : (
                        courses.map((course) => (
                            <View key={course.id} style={styles.courseCard}>
                                <View style={styles.courseHeader}>
                                    <View style={styles.courseInfo}>
                                        <Text style={styles.courseName}>{course.name}</Text>
                                        <Text style={styles.courseCode}>{course.code}</Text>
                                    </View>
                                    <View style={styles.courseActions}>
                                        <TouchableOpacity
                                            style={[styles.courseActions, { borderColor: colors.primary }]}
                                            onPress={() => router.push({
                                                pathname: '/admin/AdminCourseStudentsScreen',
                                                params: { courseId: course.id, courseName: course.name }
                                            })}
                                        >
                                            <Icon name="people" size={16} color={colors.primary} />
                                            <Text style={[styles.courseDetails, { color: colors.primary }]}>Manage Students</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleEditCourse(course)}>
                                            <Icon name="edit" size={20} color={colors.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteCourse(course.id, course.name)}>
                                            <Icon name="delete" size={20} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.courseDetails}>
                                    <View style={styles.detailRow}>
                                        <Icon name="person" size={16} color={colors.text.muted} />
                                        <Text style={styles.detailText}>
                                            Professor: {course.professorName || 'Not assigned'}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Icon name="business" size={16} color={colors.text.muted} />
                                        <Text style={styles.detailText}>Department: {course.department}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Icon name="access-time" size={16} color={colors.text.muted} />
                                        <Text style={styles.detailText}>Credit Hours: {course.creditHours}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Icon name="location-on" size={16} color={colors.text.muted} />
                                        <Text style={styles.detailText}>Location: {course.location}</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </SafeAreaView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView contentContainerStyle={styles.modalScroll}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                {editingCourse ? 'Edit Course' : 'Add New Course'}
                            </Text>

                            <Text style={styles.modalLabel}>Course Name *</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={formData.name}
                                onChangeText={(text) => setFormData({ ...formData, name: text })}
                                placeholder="e.g. Software Engineering"
                                placeholderTextColor={colors.text.muted}
                            />

                            <Text style={styles.modalLabel}>Course Code *</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={formData.code}
                                onChangeText={(text) => setFormData({ ...formData, code: text })}
                                placeholder="e.g. SWE303"
                                placeholderTextColor={colors.text.muted}
                            />

                            <Text style={styles.modalLabel}>Professor *</Text>
                            <View style={styles.pickerContainer}>
                                {professors.map((prof) => (
                                    <TouchableOpacity
                                        key={prof.id}
                                        style={[
                                            styles.professorOption,
                                            formData.professorId === prof.id && styles.professorOptionSelected
                                        ]}
                                        onPress={() => setFormData({ ...formData, professorId: prof.id })}
                                    >
                                        <Text style={[
                                            styles.professorOptionText,
                                            formData.professorId === prof.id && styles.professorOptionTextSelected
                                        ]}>
                                            {prof.fullName}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.modalLabel}>Department</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={formData.department}
                                onChangeText={(text) => setFormData({ ...formData, department: text })}
                                placeholder="e.g. Computer Science"
                                placeholderTextColor={colors.text.muted}
                            />

                            <Text style={styles.modalLabel}>Credit Hours</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={formData.creditHours}
                                onChangeText={(text) => setFormData({ ...formData, creditHours: text })}
                                keyboardType="numeric"
                                placeholder="3"
                                placeholderTextColor={colors.text.muted}
                            />

                            <Text style={styles.modalLabel}>Location</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={formData.location}
                                onChangeText={(text) => setFormData({ ...formData, location: text })}
                                placeholder="e.g. Hall 201"
                                placeholderTextColor={colors.text.muted}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton]}
                                    onPress={saveCourse}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {editingCourse ? 'Update' : 'Save'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
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
        justifyContent: 'space-between',
        paddingHorizontal: 20,
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
    addButton: {
        padding: 8,
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
        justifyContent: 'center',
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
    courseCard: {
        backgroundColor: colors.background.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    courseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    courseInfo: {
        flex: 1,
    },
    courseName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 4,
    },
    courseCode: {
        fontSize: 14,
        color: colors.primary,
    },
    courseActions: {
        flexDirection: 'row',
        gap: 16,
    },
    courseDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: colors.text.secondary,
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScroll: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.background.card,
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        color: colors.text.muted,
        marginBottom: 4,
    },
    modalInput: {
        backgroundColor: colors.background.secondary,
        borderRadius: 8,
        padding: 12,
        color: colors.text.secondary,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    pickerContainer: {
        marginBottom: 16,
    },
    professorOption: {
        backgroundColor: colors.background.secondary,
        padding: 12,
        borderRadius: 8,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    professorOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    professorOptionText: {
        color: colors.text.secondary,
    },
    professorOptionTextSelected: {
        color: colors.primary,
        fontWeight: '500',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    saveButton: {
        backgroundColor: colors.primary,
    },
    cancelButtonText: {
        color: colors.text.muted,
        fontSize: 16,
        fontWeight: '500',
    },
    saveButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '500',
    },
});