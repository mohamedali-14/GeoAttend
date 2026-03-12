import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter, usePathname } from 'expo-router';
import { colors } from '@/const/colors';

interface BottomNavProps {
    role: string;
}

export default function BottomNav({ role }: BottomNavProps) {
    const router = useRouter();
    const pathname = usePathname();

    const getHomeRoute = () => {
        switch (role) {
            case 'Admin':
                return '/admin/AdminHome';
            case 'professor':
                return '/professor/ProfessorHome';
            case 'student':
                return '/student/StudentHome';
            default:
                return '/ProfileScreen';
        }
    };

    const getDashboardRoute = () => {
        switch (role) {
            case 'Admin':
                return '/admin/AdminPanel';
            case 'professor':
                return '/professor/ProfessorPanel';
            case 'student':
                return '/student/StudentPanel';
            default:
                return '/ProfileScreen';
        }
    };

    const navItems = [
        {
            icon: 'home',
            label: 'Home',
            route: getHomeRoute(),
            activeIcon: 'home',
            id: 'home',
            pageName: 'AdminPanel'
        },
        {
            icon: 'dashboard',
            label: 'Dashboard',
            route: getDashboardRoute(),
            activeIcon: 'dashboard',
            id: 'dashboard',
            pageName: 'AdminPanel'
        },
        {
            icon: 'person-outline',
            label: 'Profile',
            route: '/ProfileScreen',
            activeIcon: 'person',
            id: 'profile',
            pageName: 'ProfileScreen'
        },
        {
            icon: 'settings',
            label: 'Settings',
            route: '/SettingsScreen',
            activeIcon: 'settings',
            id: 'settings',
            pageName: 'SettingsScreen'
        },
    ];

    const isRouteActive = (itemRoute: string) => {
        const currentPath = pathname.split('/').pop() || '';

        const targetPath = itemRoute.split('/').pop() || '';

        return currentPath === targetPath;
    };

    return (
        <View style={styles.container}>
            {navItems.map((item) => {
                const isActive = isRouteActive(item.route);

                return (
                    <TouchableOpacity
                        key={item.id}
                        style={styles.navItem}
                        onPress={() => router.push(item.route as any)}
                        activeOpacity={0.7}
                    >
                        <Icon
                            name={isActive ? item.activeIcon : item.icon}
                            size={24}
                            color={isActive ? colors.primary : colors.text.muted}
                        />
                        <Text style={[
                            styles.navText,
                            isActive && styles.navTextActive
                        ]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: colors.background.card,
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