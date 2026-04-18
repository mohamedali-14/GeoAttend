import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import Colors from '../constants/Colors';

// مكون شريط التقدم البسيط
const ProgressBar = ({ percentage, color }: { percentage: number; color: string }) => (
    <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
    </View>
);

export default function HomeScreen() {
    const router = useRouter();
    const { userData } = useAuth();

    // بيانات الطالب من Context
    const studentName = userData?.fullName || 'محمد علي';
    const studentDepartment = userData?.department || 'هندسة البرمجيات';

    // بيانات وهمية للمحاضرة النشطة (يجب جلبها من Firebase)
    const [activeSession, setActiveSession] = useState<null | {
        courseName: string;
        startTime: string;
        endTime: string;
        timeRemaining: string;
    }>({
        courseName: 'هندسة البرمجيات',
        startTime: '10:00',
        endTime: '11:30',
        timeRemaining: '15:00', // دقيقة:ثانية
    });

    // بيانات وهمية لنسب الحضور
    const attendanceStats = [
        { course: 'هندسة البرمجيات', percentage: 85, color: Colors.primary },
        { course: 'قواعد البيانات', percentage: 92, color: '#4CAF50' },
        { course: 'شبكات الحاسوب', percentage: 78, color: '#FF9800' },
    ];

    // بيانات وهمية لجدول اليوم
    const todaySchedule = [
        { time: '10:00', course: 'هندسة البرمجيات', location: 'قاعة 201' },
        { time: '12:00', course: 'قواعد البيانات', location: 'قاعة 105' },
        { time: '14:00', course: 'شبكات الحاسوب', location: 'معمل 3' },
    ];

    // عد تنازلي للوقت المتبقي (محاكاة)
    useEffect(() => {
        if (!activeSession) return;
        const interval = setInterval(() => {
            setActiveSession(prev => {
                if (!prev) return null;
                const [mins, secs] = prev.timeRemaining.split(':').map(Number);
                let totalSecs = mins * 60 + secs - 1;
                if (totalSecs < 0) {
                    clearInterval(interval);
                    return { ...prev, timeRemaining: '00:00' };
                }
                const newMins = Math.floor(totalSecs / 60);
                const newSecs = totalSecs % 60;
                return {
                    ...prev,
                    timeRemaining: `${newMins.toString().padStart(2, '0')}:${newSecs.toString().padStart(2, '0')}`,
                };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleAttendance = () => {
        // التحقق من الموقع والوقت (يتم لاحقاً)
        Alert.alert('تسجيل الحضور', 'تم تسجيل حضورك بنجاح ✅');
        // بعد التسجيل يمكن إخفاء الجلسة النشطة أو تعطيل الزر
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* الهيدر */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>مرحباً 👋</Text>
                        <Text style={styles.userName}>{studentName}</Text>
                        <Text style={styles.userDepartment}>{studentDepartment}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/ProfileScreen')}>
                        <Icon name="account-circle" size={50} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* بطاقة المحاضرة النشطة (تظهر فقط إذا كان هناك session نشطة) */}
                {activeSession && (
                    <View style={styles.activeSessionCard}>
                        <View style={styles.sessionHeader}>
                            <Icon name="notifications-active" size={24} color={Colors.primary} />
                            <Text style={styles.sessionTitle}>محاضرة نشطة الآن</Text>
                        </View>
                        <View style={styles.sessionDetails}>
                            <Text style={styles.sessionCourse}>{activeSession.courseName}</Text>
                            <Text style={styles.sessionTime}>{activeSession.startTime} - {activeSession.endTime}</Text>
                            <View style={styles.timerContainer}>
                                <Icon name="timer" size={20} color={Colors.danger} />
                                <Text style={styles.timerText}>الوقت المتبقي: {activeSession.timeRemaining}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.attendButton} onPress={handleAttendance}>
                            <Text style={styles.attendButtonText}>✅ سجل حضوري</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* نسب الحضور */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📊 نسب الحضور</Text>
                    {attendanceStats.map((item, index) => (
                        <View key={index} style={styles.statItem}>
                            <View style={styles.statRow}>
                                <Text style={styles.statCourse}>{item.course}</Text>
                                <Text style={styles.statPercentage}>{item.percentage}%</Text>
                            </View>
                            <ProgressBar percentage={item.percentage} color={item.color} />
                        </View>
                    ))}
                </View>

                {/* جدول اليوم */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📅 جدول اليوم</Text>
                    {todaySchedule.map((item, index) => (
                        <View key={index} style={styles.scheduleItem}>
                            <View style={styles.scheduleTimeContainer}>
                                <Icon name="access-time" size={18} color={Colors.primary} />
                                <Text style={styles.scheduleTime}>{item.time}</Text>
                            </View>
                            <View style={styles.scheduleInfo}>
                                <Text style={styles.scheduleCourse}>{item.course}</Text>
                                <Text style={styles.scheduleLocation}>{item.location}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* روابط سريعة */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Icon name="qr-code-scanner" size={28} color={Colors.primary} />
                        <Text style={styles.actionText}>مسح QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Icon name="history" size={28} color={Colors.primary} />
                        <Text style={styles.actionText}>سجل الحضور</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Icon name="note-add" size={28} color={Colors.primary} />
                        <Text style={styles.actionText}>تقديم عذر</Text>
                    </TouchableOpacity>
                </View>

                {/* إشعارات (اختياري) */}
                <View style={[styles.sectionCard, styles.notificationCard]}>
                    <Icon name="info" size={20} color={Colors.primary} />
                    <Text style={styles.notificationText}>غداً محاضرة هندسة برمجيات الساعة 10:00</Text>
                </View>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem}>
                    <Icon name="home" size={24} color={Colors.primary} />
                    <Text style={[styles.navText, styles.navTextActive]}>الرئيسية</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/ProfileScreen')}>
                    <Icon name="location-on" size={24} color={Colors.textMuted} />
                    <Text style={styles.navText}>الحضور</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => router.push('/ProfileScreen')}>
                    <Icon name="person" size={24} color={Colors.textMuted} />
                    <Text style={styles.navText}>الملف الشخصي</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <Icon name="settings" size={24} color={Colors.textMuted} />
                    <Text style={styles.navText}>الإعدادات</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingBottom: 100,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 24,
    },
    greeting: {
        fontSize: 16,
        color: Colors.textMuted,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.text,
    },
    userDepartment: {
        fontSize: 14,
        color: Colors.primary,
        marginTop: 4,
    },
    activeSessionCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: Colors.primary + '40',
    },
    sessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sessionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary,
    },
    sessionDetails: {
        marginBottom: 16,
    },
    sessionCourse: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.text,
    },
    sessionTime: {
        fontSize: 14,
        color: Colors.textMuted,
        marginTop: 4,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    timerText: {
        fontSize: 16,
        color: Colors.danger,
        fontWeight: '600',
    },
    attendButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    attendButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 16,
    },
    statItem: {
        marginBottom: 16,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    statCourse: {
        fontSize: 16,
        color: Colors.text,
    },
    statPercentage: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: Colors.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    scheduleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    scheduleTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 80,
        gap: 4,
    },
    scheduleTime: {
        fontSize: 15,
        color: Colors.primary,
        fontWeight: '500',
    },
    scheduleInfo: {
        flex: 1,
        marginLeft: 12,
    },
    scheduleCourse: {
        fontSize: 16,
        color: Colors.text,
    },
    scheduleLocation: {
        fontSize: 14,
        color: Colors.textMuted,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 24,
    },
    actionButton: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: 16,
        borderRadius: 16,
        width: '30%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionText: {
        fontSize: 13,
        color: Colors.text,
        marginTop: 8,
        textAlign: 'center',
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface2,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 10,
    },
    notificationText: {
        fontSize: 14,
        color: Colors.text,
        flex: 1,
    },
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    navText: {
        fontSize: 11,
        color: Colors.textMuted,
        marginTop: 2,
    },
    navTextActive: {
        color: Colors.primary,
    },
});