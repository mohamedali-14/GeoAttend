import React, { useState } from "react";
//
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
            <View style={[styles.container, { backgroundColor: '#0F172A' }]}>
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
                            <Icon name="arrow-back" size={24} color="#9CA3AF" />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <Text style={styles.appTitle}>
                                <Icon name="location-on" size={24} color="#10B981" />
                                <Text>Geo Track</Text>
                            </Text>
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
                                style={styles.signInButton}
                            />

                            <TouchableOpacity
                                style={styles.forgotButton}
                                onPress={() => { console.log("Forgot Password Pressed") }}
                            >
                                <Text style={styles.forgotText}>
                                    Forgot Password? /{" "}
                                    <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.orContainer}>
                                <View style={styles.line} />
                                <Text style={styles.orText}>OR</Text>
                                <View style={styles.line} />
                            </View>

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
        backgroundColor: '#0F172A',
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
        color: '#10B981',
        marginBottom: 10,
        marginLeft: 15,
    },
    welcomeText: {
        fontSize: 28,
        fontWeight: '600',
        color: '#F3F4F6',
        marginBottom: 4,
        textAlign: "center"
    },
    subtitleText: {
        fontSize: 16,
        color: '#9CA3AF',
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
        color: '#9CA3AF',
        fontWeight: '500',
    },
    signInButton: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
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
    },
    createAccountText: {
        fontSize: 14,
        color: '#10B981',
        fontWeight: '600',
        textAlign: "center"
    },
});