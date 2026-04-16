// screens/SettingsScreen.tsx
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    SafeAreaView, ScrollView, Alert, ActivityIndicator,
    Modal, TextInput, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { colors } from '@/const/colors';
import { useAuth } from '@/context/AuthContext';
import ButtonNav from '@/components/ButtonNav';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

export default function SettingsScreen() {
    const router = useRouter();
    const { userData, logout } = useAuth();
    const auth = getAuth();

    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const role = userData?.role || 'student';

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Error', 'New password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }
        if (newPassword === currentPassword) {
            Alert.alert('Error', 'New password must be different from current');
            return;
        }

        try {
            setChangingPassword(true);
            const user = auth.currentUser!;

            const credential = EmailAuthProvider.credential(user.email!, currentPassword);
            await reauthenticateWithCredential(user, credential);

            await updatePassword(user, newPassword);

            Alert.alert('✅ Success', 'Password changed successfully!', [{
                text: 'OK',
                onPress: () => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                },
            }]);
        } catch (e: any) {
            let msg = 'Failed to change password';
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                msg = 'Current password is incorrect';
            } else if (e.code === 'auth/too-many-requests') {
                msg = 'Too many attempts. Please try again later';
            }
            Alert.alert('Error', msg);
        } finally {
            setChangingPassword(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout', style: 'destructive', onPress: async () => {
                    await logout();
                    router.replace('/RoleSelectionScreen');
                }
            },
        ]);
    };

    const settingsSections = [
        {
            title: 'Account',
            items: [
                {
                    icon: 'person',
                    label: 'Edit Profile',
                    desc: 'Update your name, department & photo',
                    color: '#10B981',
                    onPress: () => router.push('./EditProfileScreen.tsx' as any),
                },
                {
                    icon: 'lock',
                    label: 'Change Password',
                    desc: 'Update your account password',
                    color: '#3B82F6',
                    onPress: () => setShowChangePassword(true),
                },
            ],
        },
        {
            title: 'About',
            items: [
                {
                    icon: 'info',
                    label: 'App Version',
                    desc: 'GeoTrack v1.0.0',
                    color: '#8B5CF6',
                    onPress: () => { },
                },
            ],
        },
    ];

    return (
        <View style={styles.root}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
                        <Icon name="arrow-back" size={22} color={colors.text.primary} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.profileCard}>
                        <View style={styles.profileAvatar}>
                            <Icon
                                name={role === 'professor' ? 'person' : role === 'admin' ? 'admin-panel-settings' : 'school'}
                                size={36} color={colors.primary}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.profileName}>{userData?.fullName || 'User'}</Text>
                            <Text style={styles.profileRole}>
                                {role === 'professor' ? 'Professor' : role === 'admin' ? 'Administrator' : 'Student'}
                            </Text>
                            <Text style={styles.profileDept}>{userData?.department || ''}</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('./EditProfileScreen.tsx' as any)}>
                            <Icon name="edit" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {settingsSections.map((section, si) => (
                        <View key={si} style={styles.section}>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                            <View style={styles.sectionCard}>
                                {section.items.map((item, ii) => (
                                    <TouchableOpacity key={ii} style={[
                                        styles.settingRow,
                                        ii < section.items.length - 1 && styles.settingRowBorder,
                                    ]} onPress={item.onPress}>
                                        <View style={[styles.settingIcon, { backgroundColor: item.color + '18' }]}>
                                            <Icon name={item.icon} size={20} color={item.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.settingLabel}>{item.label}</Text>
                                            <Text style={styles.settingDesc}>{item.desc}</Text>
                                        </View>
                                        <Icon name="chevron-right" size={20} color={colors.text.muted} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Icon name="logout" size={20} color="#EF4444" />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>

            <Modal visible={showChangePassword} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Change Password</Text>
                            <TouchableOpacity onPress={() => {
                                setShowChangePassword(false);
                                setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
                            }}>
                                <Icon name="close" size={24} color={colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        {/* Current password */}
                        <Text style={styles.fieldLabel}>Current Password</Text>
                        <View style={styles.passwordField}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Enter current password"
                                placeholderTextColor={colors.text.muted}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                secureTextEntry={!showCurrent}
                            />
                            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                                <Icon name={showCurrent ? 'visibility' : 'visibility-off'} size={20} color={colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        {/* New password */}
                        <Text style={styles.fieldLabel}>New Password</Text>
                        <View style={styles.passwordField}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Enter new password (min 6 chars)"
                                placeholderTextColor={colors.text.muted}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showNew}
                            />
                            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                                <Icon name={showNew ? 'visibility' : 'visibility-off'} size={20} color={colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        {/* Confirm password */}
                        <Text style={styles.fieldLabel}>Confirm New Password</Text>
                        <View style={styles.passwordField}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Repeat new password"
                                placeholderTextColor={colors.text.muted}
                                value={confirmNewPassword}
                                onChangeText={setConfirmNewPassword}
                                secureTextEntry={!showConfirm}
                            />
                            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                                <Icon name={showConfirm ? 'visibility' : 'visibility-off'} size={20} color={colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveBtn, changingPassword && { opacity: 0.6 }]}
                            onPress={handleChangePassword}
                            disabled={changingPassword}>
                            {changingPassword
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <><Icon name="lock" size={18} color="#fff" />
                                    <Text style={styles.saveBtnText}>Update Password</Text></>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <ButtonNav role={role} />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background.primary, paddingTop: 25 },
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text.primary },
    headerBack: { padding: 6 },

    profileCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: colors.background.card, marginHorizontal: 16, borderRadius: 16,
        padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border.primary,
    },
    profileAvatar: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: colors.primary + '18', justifyContent: 'center', alignItems: 'center',
    },
    profileName: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    profileRole: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 2 },
    profileDept: { fontSize: 12, color: colors.text.muted, marginTop: 1 },

    section: { marginHorizontal: 16, marginBottom: 20 },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.text.muted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
    sectionCard: { backgroundColor: colors.background.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border.primary, overflow: 'hidden' },
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    settingRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border.primary },
    settingIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    settingLabel: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
    settingDesc: { fontSize: 12, color: colors.text.muted, marginTop: 2 },

    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        marginHorizontal: 16, borderRadius: 14, paddingVertical: 16,
        backgroundColor: '#EF444410', borderWidth: 1, borderColor: '#EF444430',
    },
    logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: colors.background.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    modalHandle: { width: 40, height: 4, backgroundColor: colors.border.primary, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 6 },
    passwordField: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.background.secondary, borderRadius: 12,
        paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border.primary, marginBottom: 14,
    },
    passwordInput: { flex: 1, paddingVertical: 12, color: colors.text.primary, fontSize: 15 },
    saveBtn: {
        backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
    },
    saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});