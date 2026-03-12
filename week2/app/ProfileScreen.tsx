import React, { useEffect } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { colors } from '@/const/colors';
import ButtonNav from '@/components/ButtonNav';

export default function ProfileScreen() {
    const router = useRouter();
    const { userData, logout, loading } = useAuth();

    useEffect(() => {
        if (userData?.role === 'admin' && !loading) {
            router.replace('/admin/AdminPanel');
        }
    }, [userData, loading]);

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/RoleSelectionScreen');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const professorMenuItems = [
        {
            icon: 'edit',
            title: 'Edit Profile',
            onPress: () => console.log('Edit Profile'),
        },
        {
            icon: 'people',
            title: 'Student Management',
            onPress: () => console.log('Student Management'),
        },
        {
            icon: 'bar-chart',
            title: 'Attendance Statistics',
            onPress: () => console.log('Attendance Statistics'),
        },
        {
            icon: 'class',
            title: 'Course Management',
            onPress: () => console.log('Course Management'),
        },
        {
            icon: 'notifications',
            title: 'Notification Settings',
            onPress: () => console.log('Notification Settings'),
        },
    ];

    const studentMenuItems = [
        {
            icon: 'edit',
            title: 'Edit Profile',
            onPress: () => console.log('Edit Profile'),
        },
        {
            icon: 'menu-book',
            title: 'My Courses',
            onPress: () => console.log('My Courses'),
        },
        {
            icon: 'event-available',
            title: 'Attendance',
            onPress: () => console.log('Attendance'),
        },
        {
            icon: 'note-add',
            title: 'Submit Absence Excuse',
            onPress: () => console.log('Submit Absence Excuse'),
        },
        {
            icon: 'notifications',
            title: 'Notification Settings',
            onPress: () => console.log('Notification Settings'),
        },
    ];

    const AdminMenuItems = [
        {
            icon: 'edit',
            title: 'Edit Profile',
            onPress: () => console.log('Edit Profile'),
        },
        {
            icon: 'people',
            title: 'User Management',
            onPress: () => console.log('User Management'),
        },
        {
            icon: 'settings',
            title: 'System Settings',
            onPress: () => console.log('System Settings'),
        },
        {
            icon: 'report',
            title: 'Generate Reports',
            onPress: () => console.log('Generate Reports'),
        },
        {
            icon: 'security',
            title: 'Security Settings',
            onPress: () => console.log('Security Settings'),
        }
    ]

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    const displayName = userData?.fullName || 'User Name';
    const displayDepartment = userData?.department || 'Department';
    const displayId = userData?.studentId || '------';
    const displayRole = userData?.role || 'student';
    const isAdmin = userData?.role === 'Admin';
    const menuItems = displayRole === 'professor' ? professorMenuItems : studentMenuItems;



    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.profileSection}>
                        <View style={styles.avatarContainer}>
                            {!isAdmin && (
                                <Icon
                                    name={displayRole === 'student' ? 'school' : 'person'}
                                    size={60}
                                    color={colors.primary}
                                />
                            )}
                            {isAdmin && (
                                <Icon
                                    name="admin-panel-settings"
                                    size={60}
                                    color={colors.primary}
                                />
                            )}
                        </View>
                        {!isAdmin && (
                            <Text style={styles.userName}>
                                {displayRole === 'professor' ? 'Dr: ' : ''}{displayName}
                            </Text>
                        )}
                        {isAdmin && (
                            <Text style={styles.userName}>
                                Admin: {displayName}
                            </Text>
                        )}
                        {!isAdmin && (
                            <Text style={styles.userDepartment}>
                                Department: {displayDepartment}
                            </Text>
                        )}

                        {displayRole === 'student' && (
                            <Text style={styles.userId}>ID: {displayId}</Text>
                        )}
                    </View>

                    {!isAdmin && (
                        <View style={styles.menuSection}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.menuItem}
                                    onPress={item.onPress}
                                >
                                    <View style={styles.menuItemLeft}>
                                        <Icon name={item.icon} size={24} color={colors.primary} />
                                        <Text style={styles.menuItemText}>{item.title}</Text>
                                    </View>
                                    <Icon name="chevron-right" size={24} color={colors.icon.secondary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {isAdmin && (
                        <View style={styles.menuSection}>
                            {AdminMenuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.menuItem}
                                    onPress={item.onPress}
                                >
                                    <View style={styles.menuItemLeft}>
                                        <Icon name={item.icon} size={24} color={colors.primary} />
                                        <Text style={styles.menuItemText}>{item.title}</Text>
                                    </View>
                                    <Icon name="chevron-right" size={24} color={colors.icon.secondary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}


                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Icon name="logout" size={24} color={colors.primary} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </ScrollView>
                <ButtonNav role={displayRole} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
        paddingTop: 20,
    },
    gradientBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background.primary,
    },
    scrollContent: {
        paddingBottom: 80,
    },
    profileSection: {
        backgroundColor: colors.background.secondary,
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border.primary,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 3,
        borderColor: colors.primary,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text.primary,
        marginBottom: 4,
    },
    userDepartment: {
        fontSize: 16,
        color: colors.text.secondary,
        marginBottom: 4,
    },
    userId: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '500',
    },
    menuSection: {
        backgroundColor: colors.background.secondary,
        marginTop: 8,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border.primary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.primary,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.primary,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuItemText: {
        fontSize: 16,
        color: colors.text.primary,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.background.secondary,
        marginTop: 8,
        marginHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    logoutText: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '600',
    },
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: colors.background.secondary,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border.primary,
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
        color: colors.text.muted,
        marginTop: 2,
    },
    navTextActive: {
        color: colors.primary,
    },
});