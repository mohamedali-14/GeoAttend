import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/Colors';

interface PasswordInputProps {
    label: string;
    arabicLabel: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    error?: string;
}

export const PasswordInput = ({
    label,
    arabicLabel,
    value,
    onChangeText,
    placeholder = '••••••••',
    error,
}: PasswordInputProps) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                {label} / <Text style={styles.arabicLabel}>{arabicLabel}</Text>
                <Text style={styles.required}> *</Text>
            </Text>
            <View style={[styles.passwordContainer, error ? styles.inputError : null]}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.textMuted}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                >
                    <Icon
                        name={showPassword ? 'visibility' : 'visibility-off'}
                        size={24}
                        color={Colors.textMuted}
                    />
                </TouchableOpacity>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: Colors.text,
        marginBottom: 8,
        fontWeight: '500',
    },
    arabicLabel: {
        fontSize: 14,
        color: Colors.textMuted,
    },
    required: {
        color: Colors.primary,
        fontSize: 14,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        backgroundColor: Colors.surface2,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: Colors.text,
    },
    eyeIcon: {
        paddingHorizontal: 16,
    },
    inputError: {
        borderColor: Colors.danger,
        borderWidth: 1,
    },
    errorText: {
        color: Colors.danger,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});