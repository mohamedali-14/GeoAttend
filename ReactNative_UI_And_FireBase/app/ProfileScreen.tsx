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

    const menuItems = [
        {
            icon: 'edit',
            title: 'Edit Profile',
            onPress: () => console.log('Edit Profile'),
        },
        {
            icon: 'notifications',
            title: 'Notification Settings',
            onPress: () => console.log('Notification Settings'),
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
            icon: 'help',
            title: 'Help & Support',
            onPress: () => console.log('Help & Support'),
        },
        {
            icon: 'info',
            title: 'About Geo Attendance',
            onPress: () => console.log('About Geo Attendance'),
        },
        {
            icon: 'settings',
            title: 'App Settings',
            onPress: () => console.log('App Settings'),
        }
    ];

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ff9d00" />
            </View>
        );
    }

    const displayName = userData?.fullName || 'User Name';
    const displayDepartment = userData?.department || 'Department';
    const displayId = userData?.studentId || '------';
    const displayRole = userData?.role || 'student';

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.container, { backgroundColor: '#0F172A' }]}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.profileSection}>
                        <View style={styles.avatarContainer}>
                            <Icon
                                name={displayRole === 'student' ? 'school' : 'person'}
                                size={60}
                                color="#10B981"
                            />
                        </View>
                        <Text style={styles.userName}>{displayRole === 'professor' ? 'Dr. ' + displayName : displayName}</Text>
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
                                    <Icon name={item.icon} size={24} color="#10B981" />
                                    <Text style={styles.menuItemText}>{item.title}</Text>
                                </View>
                                <Icon name="chevron-right" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Icon name="logout" size={24} color="#10B981" />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </ScrollView>

                <View style={styles.bottomNav}>
                    <TouchableOpacity style={styles.navItem}>
                        <Icon name="home" size={24} color="#9CA3AF" />
                        <Text style={styles.navText}>Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}>
                        <Icon name="location-on" size={24} color="#9CA3AF" />
                        <Text style={[styles.navText]}>Attendance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.navItem]}>
                        <Icon name="person" size={24} color="#10B981" />
                        <Text style={[styles.navText, styles.navTextActive]}>Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}>
                        <Icon name="settings" size={24} color="#9CA3AF" />
                        <Text style={styles.navText}>Settings</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
//
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
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
        backgroundColor: '#0F172A',
    },
    scrollContent: {
        paddingBottom: 80,
    },
    profileSection: {
        backgroundColor: '#111827',
        paddingVertical: 30,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
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
        borderColor: '#10B981',
    },
    userName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#F3F4F6',
        marginBottom: 4,
    },
    userDepartment: {
        fontSize: 16,
        color: '#9CA3AF',
        marginBottom: 4,
    },
    userId: {
        fontSize: 14,
        color: '#10B981',
        fontWeight: '500',
    },
    menuSection: {
        backgroundColor: '#111827',
        marginTop: 8,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    menuItemText: {
        fontSize: 16,
        color: '#E5E7EB',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#111827',
        marginTop: 8,
        marginHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1F2937',
    },
    logoutText: {
        fontSize: 16,
        color: '#10B981',
        fontWeight: '600',
    },
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: '#111827',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
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
        color: '#9CA3AF',
        marginTop: 2,
    },
    navTextActive: {
        color: '#10B981',
    },
});