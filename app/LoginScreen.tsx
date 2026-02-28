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
import Colors from "../constants/Colors";

export default function LoginScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { role } = params;
    const { login, loading } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please fill all fields");
            return;
        }

        try {
            await login(email, password, role as string);
            router.replace('/ProfileScreen');
        } catch (error: any) {
            Alert.alert("Login Failed", error.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollView}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.push({
                            pathname: '/RoleSelectionScreen',
                        })}
                    >
                        <Icon name="arrow-back" size={24} color={Colors.textMuted} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <Icon name="location-on" size={24} color={Colors.primary} />
                            <Text style={styles.appTitle}>Geo Track</Text>
                        </View>
                        <Text style={styles.welcomeText}>Welcome Back</Text>
                        <Text style={styles.subtitleText}>Sign in to continue</Text>
                    </View>

                    <View style={styles.form}>
                        <InputField
                            label="University Email"
                            arabicLabel="البريد الجامعي"
                            placeholder="student@university.edu"
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
                            style={{ backgroundColor: Colors.primary }}
                        />

                        <TouchableOpacity
                            style={styles.forgotButton}
                            onPress={() => {console.log("Forgot Password Pressed")}}
                        >
                            <Text style={styles.forgotText}>
                                Forgot Password? /{" "}
                                <Text style={styles.arabicForgot}>نسيت كلمة المرور؟</Text>
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.orContainer}>
                            <View style={styles.line} />
                            <Text style={styles.orText}>OR</Text>
                            <View style={styles.line} />
                        </View>

                        <View style={styles.registerContainer}>
                            <TouchableOpacity onPress={() => router.push({
                                pathname: '/RegisterScreen',
                                params: { role: role }
                            })}>
                                <Text style={styles.registerLink}>
                                    {role === 'professor'
                                        ? 'Create your professor account'
                                        : 'Create your academic account'}
                                </Text>
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
        paddingTop: 80,
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
        marginBottom: 40,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    appTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: Colors.primary,
    },
    welcomeText: {
        fontSize: 40,
        fontWeight: "700",
        color: Colors.text,
        marginBottom: 8,
        textAlign: "center",
    },
    subtitleText: {
        fontSize: 16,
        color: Colors.textMuted,
        textAlign: "center",
    },
    form: {
        flex: 1,
    },
    forgotButton: {
        alignSelf: "flex-end",
        marginBottom: 32,
    },
    forgotText: {
        fontSize: 14,
        color: Colors.primary,
    },
    arabicForgot: {
        fontSize: 14,
        color: Colors.textMuted,
    },
    orContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 32,
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
    registerContainer: {
        alignItems: "center",
    },
    registerLink: {
        fontSize: 16,
        color: Colors.primary,
        fontWeight: "600",
        textDecorationLine: "underline",
    },
});