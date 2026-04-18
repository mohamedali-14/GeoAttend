import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../const/colors';
import { db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

interface Props {
    visible: boolean;
    onClose: () => void;
    studentId: string;
    studentName: string;
    onSuccess: (sessionId: string, courseId: string) => void;
     onSaveToHistory?: (code: string, name: string, courseId: string) => void;
}

export default function ManualEntryScreen({ visible, onClose, studentId, studentName, onSuccess }: Props) {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!code.trim()) {
            Alert.alert('خطأ', 'الرجاء إدخال كود الجلسة');
            return;
        }
        setLoading(true);
        try {
            // البحث عن جلسة نشطة بهذا الكود (نفترض أن الكود هو sessionId)
            const sessionRef = doc(db, 'sessions', code);
            const sessionSnap = await getDoc(sessionRef);
            if (!sessionSnap.exists() || !sessionSnap.data().isActive) {
                throw new Error('الكود غير صالح أو الجلسة غير نشطة');
            }
            const sessionData = sessionSnap.data();
            onSuccess(code, sessionData.courseId);
            setCode('');
            onClose();
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <Text style={styles.title}>إدخال كود الجلسة يدوياً</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color={colors.text.muted} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>كود الجلسة</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="أدخل الكود"
                        placeholderTextColor={colors.text.muted}
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.submitBtnText}>تحقق</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.6)', justifyContent:'flex-end' },
    sheet: {
        backgroundColor: colors.background.primary,
        borderTopLeftRadius:24, borderTopRightRadius:24,
        padding:20, paddingBottom: Platform.OS==='ios'?36:24,
    },
    handle: { width:40, height:4, backgroundColor: colors.border.primary, borderRadius:2, alignSelf:'center', marginBottom:16 },
    header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
    title: { fontSize:18, fontWeight:'700', color:colors.text.primary },
    label: { fontSize:14, fontWeight:'600', color:colors.text.secondary, marginBottom:6 },
    input: {
        backgroundColor: colors.background.secondary,
        borderWidth:1, borderColor: colors.border.primary,
        borderRadius:12, padding:14,
        fontSize:16, color: colors.text.primary,
        marginBottom:20,
    },
    submitBtn: {
        backgroundColor: colors.primary,
        borderRadius:14, paddingVertical:16,
        alignItems:'center',
    },
    submitBtnText: { fontSize:16, fontWeight:'700', color:'#fff' },
});