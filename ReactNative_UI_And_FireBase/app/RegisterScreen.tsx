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
import { InputField } from "@/components/InputField";
import { CustomButton } from "@/components/CustomButton";

export default function RegisterScreen() {
    const router = useRouter();

    const params = useLocalSearchParams();
    const { role } = params;

    const { register, loading } = useAuth();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [studentId, setStudentId] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [department, setDepartment] = useState("");

    const [errors, setErrors] = useState({
        fullName: "",
        email: "",
        studentId: "",
        password: "",
        confirmPassword: "",
        department: "",
    });

    const isStudent = role === 'student';

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password: string) => {
        return password.length >= 6;
    };

    const validateStudentId = (id: string) => {
        return id.length >= 7 && /^\d+$/.test(id);
    };

    const validateForm = () => {
        const newErrors = {
            fullName: "",
            email: "",
            studentId: "",
            password: "",
            confirmPassword: "",
            department: "",
        };

        let isValid = true;

        if (!fullName.trim()) {
            newErrors.fullName = "Full name is required / الاسم الكامل مطلوب";
            isValid = false;
        } else if (fullName.trim().length < 5) {
            newErrors.fullName = "Name must be at least 5 characters / الاسم يجب أن يكون 5 أحرف على الأقل";
            isValid = false;
        }

        if (!email.trim()) {
            newErrors.email = "Email is required / البريد الإلكتروني مطلوب";
            isValid = false;
        } else if (!validateEmail(email)) {
            newErrors.email = "Invalid email format / صيغة البريد الإلكتروني غير صحيحة";
            isValid = false;
        }

        if (isStudent) {
            if (!studentId.trim()) {
                newErrors.studentId = "Student ID is required / الرقم الجامعي مطلوب";
                isValid = false;
            } else if (!validateStudentId(studentId)) {
                newErrors.studentId = "Student ID must be at least 7 digits / الرقم الجامعي يجب أن يكون 7 أرقام على الأقل";
                isValid = false;
            }
        }

        if (!password) {
            newErrors.password = "Password is required / كلمة المرور مطلوبة";
            isValid = false;
        } else if (!validatePassword(password)) {
            newErrors.password = "Password must be at least 6 characters / كلمة المرور يجب أن تكون 6 أحرف على الأقل";
            isValid = false;
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password / الرجاء تأكيد كلمة المرور";
            isValid = false;
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match / كلمات المرور غير متطابقة";
            isValid = false;
        }

        if (!department.trim()) {
            newErrors.department = "Department is required / القسم مطلوب";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleRegister = async () => {
        if (validateForm()) {
            try {
                const userData = {
                    fullName,
                    role,
                    ...(isStudent && { studentId }),
                    department,
                };

                await register(email, password, userData);
                Alert.alert(
                    "Success / نجاح",
                    "Please check your email to verify your account before logging in.",
                    [
                        {
                            text: "OK",
                            onPress: () => router.push('/LoginScreen'),
                        }
                    ]
                );
            } catch (error: any) {
                Alert.alert(
                    "Error / خطأ",
                    error.message || "Registration failed / فشل التسجيل"
                );
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.container, { backgroundColor: '#0F172A' }]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.push({
                                pathname: '/LoginScreen',
                                params: { role }
                            })}
                        >
                            <Icon name="arrow-back" size={24} color="#9CA3AF" />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <Text style={styles.appTitle}>GEO-TRACK</Text>
                            <Text style={styles.welcomeText}>
                                {isStudent ? "Create Student Account" : "Create Professor Account"}
                            </Text>
                            <Text style={styles.subtitleText}>
                                {isStudent ? "Join as a student" : "Join as a professor"}
                            </Text>
                        </View>

                        <View style={styles.form}>

                            <InputField
                                label="Full Name"
                                arabicLabel="الاسم الكامل"
                                placeholder="Full Name"
                                value={fullName}
                                onChangeText={setFullName}
                                error={errors.fullName}
                            />

                            {isStudent && (
                                <InputField
                                    label="Student ID"
                                    arabicLabel="الرقم الجامعي"
                                    placeholder="2324567"
                                    value={studentId}
                                    onChangeText={setStudentId}
                                    keyboardType="numeric"
                                    error={errors.studentId}
                                />
                            )}
                            <InputField
                                label="Department"
                                arabicLabel="القسم"
                                placeholder="Computer Science"
                                value={department}
                                onChangeText={setDepartment}
                                error={errors.department}
                            />

                            <InputField
                                label="University Email"
                                arabicLabel="البريد الجامعي"
                                placeholder={isStudent ? "student@university.edu" : "professor@university.edu"}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                error={errors.email}
                            />

                            <PasswordInput
                                label="Password"
                                arabicLabel="كلمة المرور"
                                value={password}
                                onChangeText={setPassword}
                                error={errors.password}
                            />

                            <PasswordInput
                                label="Confirm Password"
                                arabicLabel="تأكيد كلمة المرور"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                error={errors.confirmPassword}
                            />

                            <CustomButton
                                title="Register"
                                arabicTitle="تسجيل"
                                onPress={handleRegister}
                                loading={loading}
                                style={{ backgroundColor: "#10B981" }}
                            />

                            <View style={styles.orContainer}>
                                <View style={styles.line} />
                                <Text style={styles.orText}>OR</Text>
                                <View style={styles.line} />
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.footerText}>Already have an account?</Text>
                                <TouchableOpacity onPress={() => router.push({
                                    pathname: "/LoginScreen",
                                    params: { role }
                                })}>
                                    <Text style={styles.loginLink}>Sign in</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
}
//
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
        paddingTop: 50,
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
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    scrollContent: {
        flexGrow: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    backIcon: {
        color: '#9CA3AF',
    },
    card: {
        backgroundColor: '#111827',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#1F2937',
    },
    header: {
        marginBottom: 24,
    },
    appTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#10B981',
        marginBottom: 8,
        marginLeft: 15,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#F3F4F6',
        marginBottom: 4,
        marginLeft: 15,
    },
    subtitleText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginLeft: 15,
    },
    form: {
        gap: 8,
    },
    registerButton: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 24,
        shadowColor: '#10B981',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    registerText: {
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
        backgroundColor: '#1F2937',
    },
    orText: {
        marginHorizontal: 16,
        fontSize: 14,
        color: '#9CA3AF',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    footerText: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 50,
    },
    loginLink: {
        fontSize: 14,
        color: '#10B981',
        fontWeight: '600',
        marginBottom: 50,
    },
});