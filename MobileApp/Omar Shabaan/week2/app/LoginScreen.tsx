import React, { useState } from "react";

import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    ScrollView,
    Alert,
    Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { PasswordInput } from "@/components/PasswordInput";
import { CustomButton } from "@/components/CustomButton";
import { InputField } from "@/components/InputField";
import { colors } from "@/const/colors";

export default function LoginScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const { role } = params;
    const { login, loading, checkUserExists, forgotPassword } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const isAdmin = role === 'Admin';

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        try {
            await login(email, password, role as string);
            if (role === "Admin") {
                router.replace('/admin/AdminPanel');
            }else if (role === "professor") {
                router.replace('/professor/ProfessorPanel');
            } else  if (role === "student") {
                router.replace('/student/StudentPanel');
            }
        } catch (error: any) {
            Alert.alert("Login Failed", error.message);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert("Error", "Please enter your email address first");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert("Error", "Please enter a valid email address");
            return;
        }

        try {
            setForgotPasswordLoading(true);

            const userCheck = await checkUserExists(email);

            if (!userCheck.exists) {
                Alert.alert(
                    "Account Not Found",
                    "No account found with this email address. Please register first.",
                    [
                        {
                            text: "Register",
                            onPress: () => router.push({
                                pathname: '/RegisterScreen',
                                params: { role: role }
                            })
                        },
                        { text: "Cancel", style: "cancel" }
                    ]
                );
                return;
            }

            if (userCheck.role !== role) {
                const correctRole = userCheck.role === 'student' ? 'Student' : 'Professor';
                const currentRole = role === 'student' ? 'Student' : 'Professor';

                Alert.alert(
                    "Role Mismatch",
                    `This email is registered as a ${correctRole}. You are trying to login as ${currentRole}. Please select the correct role.`,
                    [
                        {
                            text: "Change Role",
                            onPress: () => router.push({
                                pathname: '/RoleSelectionScreen',
                                params: { suggestedRole: userCheck.role }
                            })
                        },
                        { text: "Cancel", style: "cancel" }
                    ]
                );
                return;
            }

            await forgotPassword(email);
            Alert.alert(
                "Password Reset Email Sent",
                "Check your inbox for instructions to reset your password.",
                [{ text: "OK" }]
            );

        } catch (error: any) {
            let errorMessage = "Failed to send password reset email";

            if (error.code === 'auth/user-not-found') {
                errorMessage = "No account found with this email address";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Invalid email address";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "Too many attempts. Please try again later";
            }

            Alert.alert("Error", errorMessage);
        } finally {
            setForgotPasswordLoading(false);
        }
    };



    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                >
                    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.push({
                                pathname: '/RoleSelectionScreen',
                            })}
                        >
                            <Icon name="arrow-back" size={24} color={colors.icon.secondary} />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <Text style={styles.appTitle}>
                                <Icon name="location-on" size={24} color={colors.primary} />
                                <Text>Geo Track</Text>
                            </Text>
                            <Text style={styles.welcomeText}>Welcome Back</Text>
                            <Text style={styles.subtitleText}>Sign in to continue</Text>
                        </View>

                        <View style={styles.form}>
                            <InputField
                                label="University Email"
                                arabicLabel="البريد الجامعي"
                                placeholder="UniversityEmail@university.edu"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                            />

                            <PasswordInput
                                label="Password"
                                arabicLabel="كلمة المرور"
                                value={password}
                                onChangeText={setPassword}
                            />

                            <CustomButton
                                title="Login"
                                arabicTitle="تسجيل الدخول"
                                onPress={handleLogin}
                                loading={loading}
                                style={styles.signInButton}
                            />

                            {!isAdmin && (
                                <TouchableOpacity
                                    style={styles.forgotButton}
                                    onPress={() => { handleForgotPassword(); }}
                                >
                                    <Text style={styles.forgotText}>
                                        Forgot Password? /{" "}
                                        <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {!isAdmin && (
                                <View style={styles.orContainer}>
                                    <View style={styles.line} />
                                    <Text style={styles.orText}>OR</Text>
                                    <View style={styles.line} />
                                </View>
                            )}

                            {!isAdmin && (
                                <View style={styles.content}>
                                    <TouchableOpacity onPress={() => router.push({
                                        pathname: '/RegisterScreen',
                                        params: { role: role }
                                    })}>
                                        <Text style={styles.createAccountText}>
                                            {role === 'professor'
                                                ? 'Create your professor account'
                                                : 'Create your academic account'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
        paddingTop: 80,
    },
    gradientBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        marginBottom: 20,
    },
    backIcon: {
        color: '#9CA3AF',
    },
    header: {
        marginBottom: 32,
    },
    appTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 10,
        marginLeft: 15,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: 4,
        textAlign: "center"
    },
    subtitleText: {
        fontSize: 16,
        color: colors.text.muted,
        textAlign: "center",
    },
    form: {
        gap: 16,
    },
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: 8,
        marginBottom: 16,
    },
    forgotText: {
        fontSize: 14,
        color: colors.text.muted,
        fontWeight: '500',
    },
    signInButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 24,
        shadowColor: colors.primary,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    signInText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    orContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border.primary,
    },
    orText: {
        marginHorizontal: 16,
        fontSize: 14,
        color: colors.text.muted,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 14,
        color: colors.text.muted,
    },
    createAccountText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '600',
        textAlign: "center"
    },
});
