import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../const/colors';

interface HistoryItem {
    code: string;
    name: string;
    courseId: string;   // ✅ أضفنا courseId
    timestamp: string;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelect: (sessionId: string, courseId: string) => void;
}

export default function ScanHistoryScreen({ visible, onClose, onSelect }: Props) {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        if (visible) loadHistory();
    }, [visible]);

    const loadHistory = async () => {
        try {
            const data = await AsyncStorage.getItem('scanHistory');
            setHistory(data ? JSON.parse(data) : []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelect = (item: HistoryItem) => {
        // ✅ استخدم courseId من العنصر
        onSelect(item.code, item.courseId);
        onClose();
    };

    const clearHistory = () => {
        Alert.alert('تأكيد', 'حذف كل سجل المسح؟', [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'حذف', onPress: async () => {
                await AsyncStorage.removeItem('scanHistory');
                setHistory([]);
            }},
        ]);
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <View style={styles.header}>
                        <Text style={styles.title}>سجل المسح</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color={colors.text.muted} />
                        </TouchableOpacity>
                    </View>

                    {history.length === 0 ? (
                        <View style={styles.empty}>
                            <Icon name="history" size={50} color={colors.text.muted} />
                            <Text style={styles.emptyText}>لا توجد مسوحات سابقة</Text>
                        </View>
                    ) : (
                        <>
                            <FlatList
                                data={history}
                                keyExtractor={(item, idx) => idx.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.historyItem} onPress={() => handleSelect(item)}>
                                        <Icon name="qr-code" size={20} color={colors.primary} />
                                        <View style={styles.itemInfo}>
                                            <Text style={styles.itemCode}>{item.code}</Text>
                                            <Text style={styles.itemName}>{item.name}</Text>
                                            <Text style={styles.itemTime}>
                                                {new Date(item.timestamp).toLocaleString('ar-EG')}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                            <TouchableOpacity style={styles.clearBtn} onPress={clearHistory}>
                                <Icon name="delete" size={18} color="#EF4444" />
                                <Text style={styles.clearBtnText}>مسح السجل</Text>
                            </TouchableOpacity>
                        </>
                    )}
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
        maxHeight:'80%',
    },
    handle: { width:40, height:4, backgroundColor: colors.border.primary, borderRadius:2, alignSelf:'center', marginBottom:16 },
    header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:20 },
    title: { fontSize:18, fontWeight:'700', color:colors.text.primary },
    empty: { alignItems:'center', paddingVertical:40, gap:10 },
    emptyText: { fontSize:14, color:colors.text.muted },
    historyItem: {
        flexDirection:'row', alignItems:'center', gap:12,
        backgroundColor: colors.background.secondary,
        borderRadius:12, padding:12, marginBottom:8,
        borderWidth:1, borderColor: colors.border.primary,
    },
    itemInfo: { flex:1 },
    itemCode: { fontSize:15, fontWeight:'600', color:colors.text.primary },
    itemName: { fontSize:13, color:colors.text.muted, marginTop:2 },
    itemTime: { fontSize:11, color:colors.text.muted, marginTop:4 },
    clearBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, marginTop:20, paddingVertical:10 },
    clearBtnText: { fontSize:14, color:'#EF4444', fontWeight:'600' },
});