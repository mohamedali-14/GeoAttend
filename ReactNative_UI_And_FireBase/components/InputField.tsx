import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

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
                placeholderTextColor="#9CA3AF"
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
        margin : 10,
    },
    label: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
        fontWeight: '500',
    },
    arabicLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    required: {
        color: '#10B981',
        fontSize: 14,
    },
    input: {
        backgroundColor: '#1F2937',
        borderWidth: 1,
        borderColor: 'transparent',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#E5E7EB',
    },
    inputFocused: {
        borderColor: '#10B981',
        borderWidth: 1,
    },
    inputError: {
        borderColor: '#EF4444',
        borderWidth: 1,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});