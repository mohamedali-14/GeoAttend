import { colors } from '@/const/colors';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
                    placeholderTextColor="#9CA3AF"
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
                        color="#9CA3AF"
                    />
                </TouchableOpacity>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        margin : 10,
    },
    label: {
        fontSize: 14,
        color: colors.text.light,
        marginBottom: 8,
        fontWeight: '500',
    },
    arabicLabel: {
        fontSize: 14,
        color: colors.text.light,
    },
    required: {
        color: colors.primary,
        fontSize: 14,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 12,
        backgroundColor: colors.border.primary,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: colors.text.secondary,
    },
    eyeIcon: {
        paddingHorizontal: 16,
    },
    inputFocused: {
        borderColor: colors.primary,
        borderWidth: 1,
    },
    inputError: {
        borderColor: colors.error,
        borderWidth: 1,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});