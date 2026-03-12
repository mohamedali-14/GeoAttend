import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { db } from '@/firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { colors } from '@/const/colors';
import { useAuth } from '../../context/AuthContext';
import ButtonNav from '@/components/ButtonNav';

interface MenuItem {
    title: string;
    icon: string;
    route: string;
    description: string;
    color: string;
}

export default function AdminPanel() {
    const router = useRouter();
    const { userData } = useAuth();
    const [stats, setStats] = useState({
        students: 0,
        professors: 0,
        courses: 0,
        schedules: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);

            const usersRef = collection(db, 'users');
            const studentsQuery = query(usersRef, where('role', '==', 'student'));
            const professorsQuery = query(usersRef, where('role', '==', 'professor'));

            const [studentsSnap, professorsSnap, coursesSnap, schedulesSnap] = await Promise.all([
                getDocs(studentsQuery),
                getDocs(professorsQuery),
                getDocs(collection(db, 'courses')),
                getDocs(collection(db, 'schedules')),
            ]);

            setStats({
                students: studentsSnap.size,
                professors: professorsSnap.size,
                courses: coursesSnap.size,
                schedules: schedulesSnap.size,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const menuItems: MenuItem[] = [
        {
            title: 'User Management',
            icon: 'people',
            route: '/admin/AdminUsersScreen',
            description: 'Manage students, professors and admins',
            color: '#10B981',
        },
        {
            title: 'Course Management',
            icon: 'book',
            route: '/admin/AdminCoursesScreen',
            description: 'Create and manage courses',
            color: '#3B82F6',
        },
        {
            title: 'Schedule Management',
            icon: 'calendar-today',
            route: '/admin/AdminScheduleScreen',
            description: 'Manage class schedules',
            color: '#F59E0B',
        },
    ];

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Admin Panel</Text>
                    <TouchableOpacity onPress={fetchStats} style={styles.refreshButton}>
                        <Icon name="refresh" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content}>
                    <View style={styles.welcomeCard}>
                        <Icon name="admin-panel-settings" size={40} color={colors.primary} />
                        <Text style={styles.welcomeTitle}>Welcome, {userData?.fullName || 'Admin'}</Text>
                        <Text style={styles.welcomeText}>
                            Manage your university system from here
                        </Text>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{stats.students}</Text>
                            <Text style={styles.statLabel}>Students</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{stats.professors}</Text>
                            <Text style={styles.statLabel}>Professors</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{stats.courses}</Text>
                            <Text style={styles.statLabel}>Courses</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{stats.schedules}</Text>
                            <Text style={styles.statLabel}>Schedules</Text>
                        </View>
                    </View>

                    <View style={styles.menuContainer}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.menuCard}
                                onPress={() => router.push(item.route as any)}
                            >
                                <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                                    <Icon name={item.icon} size={28} color={item.color} />
                                </View>
                                <View style={styles.menuContent}>
                                    <Text style={styles.menuTitle}>{item.title}</Text>
                                    <Text style={styles.menuDescription}>{item.description}</Text>
                                </View>
                                <Icon name="chevron-right" size={24} color={colors.text.muted} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
            <ButtonNav role="Admin" />
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
    refreshButton: {
        padding: 8,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background.primary,
    },
    welcomeCard: {
        backgroundColor: colors.background.card,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginVertical: 20,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text.primary,
        marginTop: 12,
        marginBottom: 4,
    },
    welcomeText: {
        fontSize: 14,
        color: colors.text.muted,
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 8,
    },
    statCard: {
        width: '48%',
        backgroundColor: colors.background.card,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: colors.text.muted,
    },
    menuContainer: {
        gap: 12,
        marginBottom: 24,
    },
    menuCard: {
        backgroundColor: colors.background.card,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    menuIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 4,
    },
    menuDescription: {
        fontSize: 13,
        color: colors.text.muted,
    },
});