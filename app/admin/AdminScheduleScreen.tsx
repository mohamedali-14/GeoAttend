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
import { collection, getDocs, doc, deleteDoc, addDoc, updateDoc, getDoc, where, query } from 'firebase/firestore';
import { colors } from '@/const/colors';

interface Schedule {
    id: string;
    courseId: string;
    courseName?: string;
    day: string;
    startTime: string;
    endTime: string;
    location: string;
    professorId: string;
    professorName?: string;
}

interface Course {
    id: string;
    name: string;
    code: string;
    professorId: string;
    professorName?: string;
}

const days = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export default function AdminScheduleScreen() {
    const router = useRouter();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [selectedDay, setSelectedDay] = useState('Saturday');
    const [professors, setProfessors] = useState<Professor[]>([]);

    interface Professor {
        id: string;
        fullName: string;
    }

    const [formData, setFormData] = useState({
        courseId: '',
        day: 'Saturday',
        startTime: '',
        endTime: '',
        location: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchCourses(), fetchSchedules() , fetchProfessors()]);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourses = async () => {
        try {
            const coursesCollection = collection(db, 'courses');
            const coursesSnapshot = await getDocs(coursesCollection);
            const coursesList = await Promise.all(
                coursesSnapshot.docs.map(async (courseDoc) => {
                    const data = courseDoc.data();
                    let professorName = '';
                    if (data.professorId) {
                        const professorDoc = await getDoc(doc(db, 'users', data.professorId));
                        if (professorDoc.exists()) {
                            professorName = (professorDoc.data() as { fullName: string }).fullName;
                        }
                    }
                    return {
                        id: courseDoc.id,
                        name: data.name,
                        code: data.code,
                        professorId: data.professorId,
                        professorName,
                    };
                })
            );
            setCourses(coursesList);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch courses');
        }
    };

    const fetchSchedules = async () => {
        try {
            const schedulesCollection = collection(db, 'schedules');
            const schedulesSnapshot = await getDocs(schedulesCollection);
            const schedulesList = await Promise.all(
                schedulesSnapshot.docs.map(async (doc) => {
                    const data = doc.data();
                    const course = courses.find(c => c.id === data.courseId);
                    const professor = course ? professors.find(p => p.id === data.professorId) : null ;
                    return {
                        id: doc.id,
                        ...data,
                        courseName: course?.name,
                        professorName: professor?.fullName || course?.professorName,
                    } as Schedule;
                })
            );
            setSchedules(schedulesList);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch schedules');
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
            }));
            setProfessors(professorsList);
        } catch (error) {
            console.error('Error fetching professors:', error);
        }
    };
    const getProfessorName = (schedule: Schedule) => {
        if (schedule.professorName) return schedule.professorName;
        const course = courses.find(c => c.id === schedule.courseId);
        return course?.professorName || 'Not assigned';
    };

    const getCourseCode = (schedule: Schedule) => {
        const course = courses.find(c => c.id === schedule.courseId);
        return course ? `${course.code}` : '';
    };


    const handleAddSchedule = () => {
        setEditingSchedule(null);
        setFormData({
            courseId: '',
            day: selectedDay,
            startTime: '',
            endTime: '',
            location: '',
        });
        setModalVisible(true);
    };

    const handleEditSchedule = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            courseId: schedule.courseId,
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            location: schedule.location,
        });
        setModalVisible(true);
    };

    const handleDeleteSchedule = (scheduleId: string) => {
        Alert.alert(
            "Delete Schedule",
            "Are you sure you want to delete this schedule?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteSchedule(scheduleId)
                }
            ]
        );
    };

    const deleteSchedule = async (scheduleId: string) => {
        try {
            await deleteDoc(doc(db, 'schedules', scheduleId));
            setSchedules(schedules.filter(s => s.id !== scheduleId));
            Alert.alert('Success', 'Schedule deleted successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to delete schedule');
        }
    };

    const saveSchedule = async () => {
        if (!formData.courseId || !formData.startTime || !formData.endTime) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        try {
            const selectedCourse = courses.find(c => c.id === formData.courseId);

            const scheduleData = {
                courseId: formData.courseId,
                day: formData.day,
                startTime: formData.startTime,
                endTime: formData.endTime,
                location: formData.location,
                professorId: selectedCourse?.professorId,
                updatedAt: new Date().toISOString(),
            };

            if (editingSchedule) {
                await updateDoc(doc(db, 'schedules', editingSchedule.id), scheduleData);
                Alert.alert('Success', 'Schedule updated successfully');
            } else {
                await addDoc(collection(db, 'schedules'), {
                    ...scheduleData,
                    createdAt: new Date().toISOString(),
                });
                Alert.alert('Success', 'Schedule added successfully');
            }

            setModalVisible(false);
            fetchSchedules();
        } catch (error) {
            Alert.alert('Error', 'Failed to save schedule');
        }
    };

    const getSchedulesByDay = (day: string) => {
        return schedules.filter(s => s.day === day).sort((a, b) => {
            if (a.startTime < b.startTime) return -1;
            if (a.startTime > b.startTime) return 1;
            return 0;
        });
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.push('/admin/AdminPanel')} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Schedule Management</Text>
                    <TouchableOpacity onPress={handleAddSchedule} style={styles.addButton}>
                        <Icon name="add" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.dayTabs}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {days.map((day) => (
                            <TouchableOpacity
                                key={day}
                                style={[
                                    styles.dayTab,
                                    selectedDay === day && styles.dayTabActive
                                ]}
                                onPress={() => setSelectedDay(day)}
                            >
                                <Text style={[
                                    styles.dayTabText,
                                    selectedDay === day && styles.dayTabTextActive
                                ]}>
                                    {day}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <ScrollView style={styles.content}>
                    {loading ? (
                        <Text style={styles.loadingText}>Loading schedules...</Text>
                    ) : (
                        <>
                            {getSchedulesByDay(selectedDay).length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Icon name="calendar-today" size={60} color={colors.text.muted} />
                                    <Text style={styles.emptyTitle}>No Schedules</Text>
                                    <Text style={styles.emptyText}>
                                        No classes scheduled for {selectedDay}
                                    </Text>
                                </View>
                            ) : (
                                getSchedulesByDay(selectedDay).map((schedule) => (
                                    <View key={schedule.id} style={styles.scheduleCard}>
                                        <View style={styles.scheduleHeader}>
                                            <View style={styles.scheduleTime}>
                                                <Text style={styles.timeText}>
                                                    {schedule.startTime} - {schedule.endTime}
                                                </Text>
                                            </View>
                                            <View style={styles.scheduleActions}>
                                                <TouchableOpacity onPress={() => handleEditSchedule(schedule)}>
                                                    <Icon name="edit" size={20} color={colors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleDeleteSchedule(schedule.id)}>
                                                    <Icon name="delete" size={20} color={colors.error} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        <Text style={styles.courseName}>{getCourseCode(schedule)}</Text>

                                        <View style={styles.scheduleDetails}>
                                            <View style={styles.detailRow}>
                                                <Icon name="person" size={16} color={colors.text.muted} />
                                                <Text style={styles.detailText}>
                                                    Prof. {getProfessorName(schedule)}
                                                </Text>
                                            </View>
                                            <View style={styles.detailRow}>
                                                <Icon name="location-on" size={16} color={colors.text.muted} />
                                                <Text style={styles.detailText}>
                                                    {schedule.location || 'Location not set'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                        </>
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
                                {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
                            </Text>

                            <Text style={styles.modalLabel}>Course *</Text>
                            <View style={styles.pickerContainer}>
                                {courses.map((course) => (
                                    <TouchableOpacity
                                        key={course.id}
                                        style={[
                                            styles.courseOption,
                                            formData.courseId === course.id && styles.courseOptionSelected
                                        ]}
                                        onPress={() => setFormData({ ...formData, courseId: course.id })}
                                    >
                                        <Text style={[
                                            styles.courseOptionText,
                                            formData.courseId === course.id && styles.courseOptionTextSelected
                                        ]}>
                                            {course.name} ({course.code} - Prof. {course.professorName || 'Not assigned'})
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.modalLabel}>Day *</Text>
                            <View style={styles.dayPicker}>
                                {days.map((day) => (
                                    <TouchableOpacity
                                        key={day}
                                        style={[
                                            styles.dayOption,
                                            formData.day === day && styles.dayOptionSelected
                                        ]}
                                        onPress={() => setFormData({ ...formData, day })}
                                    >
                                        <Text style={[
                                            styles.dayOptionText,
                                            formData.day === day && styles.dayOptionTextSelected
                                        ]}>
                                            {day.substring(0, 3)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.modalLabel}>Start Time *</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={formData.startTime}
                                onChangeText={(text) => setFormData({ ...formData, startTime: text })}
                                placeholder="e.g. 10:00"
                                placeholderTextColor={colors.text.muted}
                            />

                            <Text style={styles.modalLabel}>End Time *</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={formData.endTime}
                                onChangeText={(text) => setFormData({ ...formData, endTime: text })}
                                placeholder="e.g. 11:30"
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
                                    onPress={saveSchedule}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {editingSchedule ? 'Update' : 'Save'}
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
    dayTabs: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    dayTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background.secondary,
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    dayTabActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    dayTabText: {
        color: colors.text.muted,
        fontSize: 14,
    },
    dayTabTextActive: {
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
    scheduleCard: {
        backgroundColor: colors.background.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    scheduleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    scheduleTime: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    timeText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    scheduleActions: {
        flexDirection: 'row',
        gap: 16,
    },
    courseName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 8,
    },
    scheduleDetails: {
        gap: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: colors.text.secondary,
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
        minWidth: '100%',
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
    courseOption: {
        backgroundColor: colors.background.secondary,
        padding: 12,
        borderRadius: 8,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    courseOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    courseOptionText: {
        color: colors.text.secondary,
    },
    courseOptionTextSelected: {
        color: colors.primary,
        fontWeight: '500',
    },
    dayPicker: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dayOption: {
        flex: 1,
        padding: 10,
        backgroundColor: colors.background.secondary,
        borderRadius: 8,
        marginHorizontal: 2,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    dayOptionSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    dayOptionText: {
        color: colors.text.muted,
        fontSize: 12,
    },
    dayOptionTextSelected: {
        color: colors.white,
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