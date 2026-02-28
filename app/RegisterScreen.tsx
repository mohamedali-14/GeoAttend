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
import Colors from "../constants/Colors"; // استيراد الألوان

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
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.push({
                            pathname: '/LoginScreen',
                            params: { role }
                        })}
                    >
                        <Icon name="arrow-back" size={24} color={Colors.textMuted} />
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
                            style={{ backgroundColor: Colors.primary }}
                        />

                        <View style={styles.orContainer}>
                            <View style={styles.line} />
                            <Text style={styles.orText}>OR</Text>
                            <View style={styles.line} />
                        </View>

                        <View style={styles.loginContainer}>
                            <Text style={styles.loginLabel}>Already have an account?</Text>
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: 50,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 30,
    },
    backButton: {
        marginTop: 20,
        marginBottom: 20,
        width: 40,
        height: 40,
        justifyContent: "center",
    },
    header: {
        marginBottom: 30,
    },
    appTitle: {
        fontSize: 32,
        fontWeight: "bold",
        color: Colors.primary,
        marginBottom: 20,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: "700",
        color: Colors.text,
        marginBottom: 8,
    },
    subtitleText: {
        fontSize: 16,
        color: Colors.textMuted,
    },
    form: {
        flex: 1,
    },
    orContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    orText: {
        marginHorizontal: 16,
        fontSize: 14,
        color: Colors.textMuted,
    },
    loginContainer: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
    },
    loginLabel: {
        fontSize: 15,
        color: Colors.textMuted,
    },
    loginLink: {
        fontSize: 15,
        color: Colors.primary,
        fontWeight: "600",
        textDecorationLine: "underline",
    },
});