import React from 'react';
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
import Colors from '../constants/Colors';

export default function ProfileScreen() {
    const router = useRouter();
    const { userData, logout, loading } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/RoleSelectionScreen');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const professorMenuItems = [
        { icon: 'edit', title: 'Edit Profile', onPress: () => console.log('Edit Profile') },
        { icon: 'class', title: 'Course Management', onPress: () => console.log('Course Management') },
        { icon: 'people', title: 'Student Management', onPress: () => console.log('Student Management') },
        { icon: 'bar-chart', title: 'Attendance Statistics', onPress: () => console.log('Attendance Statistics') },
        { icon: 'qr-code', title: 'Scan QR (Start Lecture)', onPress: () => console.log('Scan QR') },
        { icon: 'notifications', title: 'Notification Settings', onPress: () => console.log('Notification Settings') },
    ];

    const studentMenuItems = [
        { icon: 'edit', title: 'Edit Profile', onPress: () => console.log('Edit Profile') },
        { icon: 'menu-book', title: 'My Courses', onPress: () => console.log('My Courses') },
        { icon: 'calendar-check', title: 'My Attendance', onPress: () => console.log('My Attendance') },
        { icon: 'note-add', title: 'Submit Absence Excuse', onPress: () => console.log('Submit Absence Excuse') },
        { icon: 'error', title: 'Warnings / Notifications', onPress: () => console.log('Warnings') },
        { icon: 'notifications', title: 'Notification Settings', onPress: () => console.log('Notification Settings') },
    ];

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const displayName = userData?.fullName || 'User Name';
    const displayDepartment = userData?.department || 'Department';
    const displayId = userData?.studentId || '------';
    const displayRole = userData?.role || 'student';
    const displayTitle = displayRole === 'professor' ? 'Doctor' : 'Student';
    const menuItems = displayRole === 'professor' ? professorMenuItems : studentMenuItems;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Icon
                            name={displayRole === 'student' ? 'school' : 'person'}
                            size={60}
                            color={Colors.primary}
                        />
                    </View>
                    <Text style={styles.userName}>
                        {displayRole === 'professor' ? 'Dr. ' + displayName : displayName}
                    </Text>
                    <Text style={styles.userTitle}>{displayTitle}</Text>
                    <Text style={styles.userDepartment}>
                        Department: {displayDepartment}
                    </Text>
                    {displayRole === 'student' && (
                        <Text style={styles.userId}>ID: {displayId}</Text>
                    )}
                </View>

                <View style={styles.menuSection}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={item.onPress}
                        >
                            <View style={styles.menuItemLeft}>
                                <Icon name={item.icon} size={24} color={Colors.primary} />
                                <Text style={styles.menuItemText}>{item.title}</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color={Colors.textMuted} />
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Icon name="logout" size={24} color={Colors.danger} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem}>
                    <Icon name="home" size={24} color={Colors.textMuted} />
                    <Text style={styles.navText}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <Icon name="location-on" size={24} color={Colors.textMuted} />
                    <Text style={[styles.navText]}>Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.navItem]}>
                    <Icon name="person" size={24} color={Colors.primary} />
                    <Text style={[styles.navText, styles.navTextActive]}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <Icon name="settings" size={24} color={Colors.textMuted} />
                    <Text style={styles.navText}>Settings</Text>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    scrollContent: {
        paddingBottom: 80,
    },
    profileSection: {
        backgroundColor: Colors.surface,
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.surface2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 3,
        borderColor: Colors.primary,
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    userTitle: {
        fontSize: 16,
        color: Colors.primary,
        fontWeight: '600',
        marginBottom: 4,
    },
    userDepartment: {
        fontSize: 16,
        color: Colors.textMuted,
        marginBottom: 4,
    },
    userId: {
        fontSize: 14,
        color: Colors.primary,
        fontWeight: '500',
    },
    menuSection: {
        backgroundColor: Colors.surface,
        marginTop: 8,
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuItemText: {
        fontSize: 16,
        color: Colors.text,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.surface,
        marginTop: 8,
        marginHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.danger,
    },
    logoutText: {
        fontSize: 16,
        color: Colors.danger,
        fontWeight: '600',
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