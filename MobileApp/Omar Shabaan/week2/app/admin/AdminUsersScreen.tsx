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
import { collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { colors } from '@/const/colors';
import { db } from '@/firebaseConfig';

interface User {
    id: string;
    fullName: string;
    email: string;
    role: string;
    department?: string;
    studentId?: string;
}

export default function AdminUsersScreen() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editName, setEditName] = useState('');
    const [editDepartment, setEditDepartment] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [searchText, selectedRole, users]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const usersCollection = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCollection);
            const usersList = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as User[];
            setUsers(usersList);
        } catch (error) {
            Alert.alert('Error', 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const filterUsers = () => {
        let filtered = users;

        if (searchText) {
            filtered = filtered.filter(user =>
                user.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchText.toLowerCase()) ||
                user.studentId?.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        if (selectedRole !== 'all') {
            filtered = filtered.filter(user => user.role === selectedRole);
        }

        setFilteredUsers(filtered);
    };

    const handleDeleteUser = (userId: string, userName: string) => {
        Alert.alert(
            "Delete User",
            `Are you sure you want to delete ${userName}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteUser(userId)
                }
            ]
        );
    };

    const deleteUser = async (userId: string) => {
        try {
            await deleteDoc(doc(db, 'users', userId));
            setUsers(users.filter(user => user.id !== userId));
            Alert.alert('Success', 'User deleted successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to delete user');
        }
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setEditName(user.fullName || '');
        setEditDepartment(user.department || '');
        setModalVisible(true);
    };

    const saveEditUser = async () => {
        if (!selectedUser) return;

        try {
            const userRef = doc(db, 'users', selectedUser.id);
            await updateDoc(userRef, {
                fullName: editName,
                department: editDepartment
            });

            setUsers(users.map(user =>
                user.id === selectedUser.id
                    ? { ...user, fullName: editName, department: editDepartment }
                    : user
            ));

            setModalVisible(false);
            Alert.alert('Success', 'User updated successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to update user');
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return 'admin-panel-settings';
            case 'professor': return 'person';
            case 'student': return 'school';
            default: return 'person';
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return colors.error;
            case 'professor': return colors.primary;
            case 'student': return '#3B82F6';
            default: return colors.text.muted;
        }
    };

    const handleMakeAdmin = (user: User) => {
        Alert.alert(
            "Make Admin",
            `Are you sure you want to make ${user.fullName} an admin?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Make Admin",
                    onPress: () => makeUserAdmin(user.id, user.fullName)
                }
            ]
        );
    };

    const makeUserAdmin = async (userId: string, userName: string) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                role: 'admin'
            });

            setUsers(prevUsers => prevUsers.map(user =>
                user.id === userId
                    ? { ...user, role: 'admin' }
                    : user
            ));

            Alert.alert('Success', `${userName} is now an admin`);
        } catch (error) {
            Alert.alert('Error', 'Failed to make user admin');
        }
    };

    const handleRemoveAdmin = (user: User) => {
        Alert.alert(
            "Remove Admin",
            `Are you sure you want to remove ${user.fullName} from admin role?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => removeUserAdmin(user.id, user.fullName)
                }
            ]
        );
    };

    const removeUserAdmin = async (userId: string, userName: string) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                role: 'professor' // رجعها دكتور
            });

            setUsers(prevUsers => prevUsers.map(user =>
                user.id === userId
                    ? { ...user, role: 'professor' }
                    : user
            ));

            Alert.alert('Success', `${userName} is now a professor`);
        } catch (error) {
            Alert.alert('Error', 'Failed to remove admin role');
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.push('/admin/AdminPanel')} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>User Management</Text>
                    <TouchableOpacity onPress={fetchUsers} style={styles.refreshButton}>
                        <Icon name="refresh" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <Icon name="search" size={20} color={colors.text.muted} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name, email or ID..."
                        placeholderTextColor={colors.text.muted}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterButton, selectedRole === 'all' && styles.filterButtonActive]}
                        onPress={() => setSelectedRole('all')}
                    >
                        <Text style={[styles.filterText, selectedRole === 'all' && styles.filterTextActive]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, selectedRole === 'admin' && styles.filterButtonActive]}
                        onPress={() => setSelectedRole('admin')}
                    >
                        <Text style={[styles.filterText, selectedRole === 'admin' && styles.filterTextActive]}>Admin</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, selectedRole === 'professor' && styles.filterButtonActive]}
                        onPress={() => setSelectedRole('professor')}
                    >
                        <Text style={[styles.filterText, selectedRole === 'professor' && styles.filterTextActive]}>Professors</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, selectedRole === 'student' && styles.filterButtonActive]}
                        onPress={() => setSelectedRole('student')}
                    >
                        <Text style={[styles.filterText, selectedRole === 'student' && styles.filterTextActive]}>Students</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.userList}>
                    {loading ? (
                        <Text style={styles.loadingText}>Loading users...</Text>
                    ) : filteredUsers.length === 0 ? (
                        <Text style={styles.noUsersText}>No users found</Text>
                    ) : (
                        filteredUsers.map((user) => (
                            <View key={user.id} style={styles.userCard}>
                                <View style={styles.userInfo}>
                                    <View style={[styles.avatar, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                                        <Icon
                                            name={getRoleIcon(user.role)}
                                            size={24}
                                            color={getRoleColor(user.role)}
                                        />
                                    </View>
                                    <View style={styles.userDetails}>
                                        <Text style={styles.userName}>{user.fullName}</Text>
                                        <Text style={styles.userEmail}>{user.email}</Text>
                                        <View style={styles.userMeta}>
                                            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                                                <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                                                    {user.role}
                                                </Text>
                                            </View>
                                            {user.studentId && (
                                                <Text style={styles.userId}>ID: {user.studentId}</Text>
                                            )}
                                            {user.department && (
                                                <Text style={styles.userDepartment}>{user.department}</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.userActions}>
                                    {user.role === 'professor' ? (
                                        <TouchableOpacity
                                            onPress={() => handleMakeAdmin(user)}
                                            style={styles.actionButton}
                                        >
                                            <Icon name="admin-panel-settings" size={20} color="#8B5CF6" />
                                        </TouchableOpacity>
                                    ) : user.role === 'admin' && user.email !== 'omarshaban1654@gmail.com' ? (
                                        <TouchableOpacity
                                            onPress={() => handleRemoveAdmin(user)}
                                            style={styles.actionButton}
                                        >
                                            <Icon name="remove-moderator" size={20} color="#EF4444" />
                                        </TouchableOpacity>
                                    ) : null}
                                    <TouchableOpacity
                                        onPress={() => handleEditUser(user)}
                                        style={styles.actionButton}
                                    >
                                        <Icon name="edit" size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteUser(user.id, user.fullName)}
                                        style={styles.actionButton}
                                    >
                                        <Icon name="delete" size={20} color={colors.error} />
                                    </TouchableOpacity>
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
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit User</Text>

                        <Text style={styles.modalLabel}>Full Name</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editName}
                            onChangeText={setEditName}
                            placeholder="Enter full name"
                            placeholderTextColor={colors.text.muted}
                        />

                        <Text style={styles.modalLabel}>Department</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editDepartment}
                            onChangeText={setEditDepartment}
                            placeholder="Enter department"
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
                                onPress={saveEditUser}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
    refreshButton: {
        padding: 8,
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
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        color: colors.text.secondary,
        fontSize: 16,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: colors.background.secondary,
        borderWidth: 1,
        borderColor: colors.border.primary,
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        color: colors.text.muted,
        fontSize: 14,
    },
    filterTextActive: {
        color: colors.white,
    },
    userList: {
        flex: 1,
        paddingHorizontal: 20,
    },
    loadingText: {
        textAlign: 'center',
        color: colors.text.muted,
        marginTop: 20,
    },
    noUsersText: {
        textAlign: 'center',
        color: colors.text.muted,
        marginTop: 20,
    },
    userCard: {
        backgroundColor: colors.background.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border.primary,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        flexDirection: 'row',
        flex: 1,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
        color: colors.text.muted,
        marginBottom: 4,
    },
    userMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    userId: {
        fontSize: 12,
        color: colors.text.muted,
    },
    userDepartment: {
        fontSize: 12,
        color: colors.text.muted,
    },
    userActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.background.card,
        borderRadius: 16,
        padding: 24,
        width: '90%',
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