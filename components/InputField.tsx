import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

interface InputFieldProps {
    label: string;
    arabicLabel: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'email-address' | 'numeric';
    autoCapitalize?: 'none' | 'sentences' | 'words';
    error?: string;
    secureTextEntry?: boolean;
}

export const InputField = ({
    label,
    arabicLabel,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    autoCapitalize = 'none',
    error,
    secureTextEntry = false,
}: InputFieldProps) => {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                {label} / <Text style={styles.arabicLabel}>{arabicLabel}</Text>
                <Text style={styles.required}> *</Text>
            </Text>
            <TextInput
                style={[styles.input, error ? styles.inputError : null]}
                placeholder={placeholder}
                placeholderTextColor={Colors.textMuted}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                secureTextEntry={secureTextEntry}
            />
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
    input: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: Colors.text,
        backgroundColor: Colors.surface2,
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