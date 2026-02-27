import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

interface CustomButtonProps {
    title: string;
    arabicTitle?: string;
    onPress: () => void;
    loading?: boolean;
    disabled?: boolean;
    style?: any;
    textStyle?: any;
}

export const CustomButton = ({
    title,
    arabicTitle,
    onPress,
    loading = false,
    disabled = false,
    style,
    textStyle,
}: CustomButtonProps) => {
    return (
        <TouchableOpacity
            style={[styles.button, style, disabled && styles.disabled]}
            onPress={onPress}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator color="#FFFFFF" />
            ) : (
                <Text style={[styles.text, textStyle]}>
                    {title} {arabicTitle ? `/ ${arabicTitle}` : ''}
                </Text>
            )}
        </TouchableOpacity>
    );
};
//
const styles = StyleSheet.create({
    button: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        padding : 20,
        alignItems: 'center',
        margin : 15,
        shadowColor: '#10B981',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    disabled: {
        opacity: 0.6,
    },
    text: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});