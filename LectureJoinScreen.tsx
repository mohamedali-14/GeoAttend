import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../const/colors';
import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { getCurrentLocation, isWithinRadius } from '../professor/geoService';

interface Props {
    visible: boolean;
    onClose: () => void;
    sessionId: string;
    courseId: string;
    studentId: string;
    studentName: string;
    onSuccess: (attendanceId: string) => void;
}

export default function LectureJoinScreen({ visible, onClose, sessionId, courseId, studentId, studentName, onSuccess }: Props) {
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<any>(null);
    const [course, setCourse] = useState<any>(null);
    const [checkingGeo, setCheckingGeo] = useState(false);

    useEffect(() => {
        if (visible && sessionId && courseId) {
            fetchDetails();
        }
    }, [visible, sessionId, courseId]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const [sessionSnap, courseSnap] = await Promise.all([
                getDoc(doc(db, 'sessions', sessionId)),
                getDoc(doc(db, 'courses', courseId))
            ]);
            if (sessionSnap.exists()) setSession(sessionSnap.data());
            if (courseSnap.exists()) setCourse(courseSnap.data());
        } catch (error) {
            Alert.alert('خطأ', 'فشل في تحميل بيانات الجلسة');
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        // التحقق من الموقع إذا كان مفعلاً
        if (session?.geoEnabled) {
            setCheckingGeo(true);
            const loc = await getCurrentLocation();
            setCheckingGeo(false);
            if (!loc) {
                Alert.alert('خطأ في الموقع', 'تعذّر الحصول على موقعك. تأكد من الإذن وأعد المحاولة.');
                return;
            }
            const inside = isWithinRadius(loc, 
                { latitude: session.centerLat, longitude: session.centerLng }, 
                session.radiusMeters || 50
            );
            if (!inside) {
                Alert.alert('خارج النطاق', 'أنت خارج نطاق القاعة المحدد. انتقل إلى القاعة ثم أعد المحاولة.');
                return;
            }
        }

        // تسجيل الحضور
        try {
            const ref = await addDoc(collection(db, 'attendance'), {
                studentId,
                studentName,
                courseId,
                sessionId,
                timestamp: Timestamp.now(),
                status: 'present',
                method: session?.geoEnabled ? 'qr+gps' : 'qr',
            });
            onSuccess(ref.id);
            onClose();
        } catch (e) {
            Alert.alert('خطأ', 'فشل في تسجيل الحضور');
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.header}>
                                <Icon name="info" size={28} color={colors.primary} />
                                <Text style={styles.title}>تفاصيل المحاضرة</Text>
                            </View>
                            
                            <View style={styles.detailCard}>
                                <Text style={styles.courseName}>{course?.name}</Text>
                                <Text style={styles.courseCode}>{course?.code}</Text>
                                
                                <View style={styles.infoRow}>
                                    <Icon name="person" size={18} color={colors.text.muted} />
                                    <Text style={styles.infoText}>د. {session?.professorName || 'غير معروف'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Icon name="access-time" size={18} color={colors.text.muted} />
                                    <Text style={styles.infoText}>
                                        {session?.startTime?.toDate?.().toLocaleString('ar-EG') || '--'}
                                    </Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Icon name="room" size={18} color={colors.text.muted} />
                                    <Text style={styles.infoText}>{session?.room || 'غير محدد'}</Text>
                                </View>
                                {session?.geoEnabled && (
                                    <View style={[styles.infoRow, { backgroundColor: '#3B82F611', padding: 8, borderRadius: 8 }]}>
                                        <Icon name="gps-fixed" size={18} color="#3B82F6" />
                                        <Text style={[styles.infoText, { color: '#3B82F6' }]}>
                                            نطاق الحضور: {session.radiusMeters} متر
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <TouchableOpacity 
                                style={[styles.joinBtn, checkingGeo && { opacity: 0.6 }]}
                                onPress={handleJoin}
                                disabled={checkingGeo}
                            >
                                {checkingGeo ? (
                                    <><ActivityIndicator size="small" color="#fff" /><Text style={styles.joinBtnText}> جاري التحقق...</Text></>
                                ) : (
                                    <><Icon name="check-circle" size={20} color="#fff" /><Text style={styles.joinBtnText}>تأكيد الحضور</Text></>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                <Text style={styles.cancelBtnText}>إلغاء</Text>
                            </TouchableOpacity>
                        </ScrollView>
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
        maxHeight:'90%',
    },
    handle: { width:40, height:4, backgroundColor: colors.border.primary, borderRadius:2, alignSelf:'center', marginBottom:16 },
    header: { flexDirection:'row', alignItems:'center', gap:12, marginBottom:20 },
    title: { fontSize:20, fontWeight:'800', color:colors.text.primary },
    detailCard: {
        backgroundColor: colors.background.secondary,
        borderRadius:16, padding:16,
        borderWidth:1, borderColor:colors.border.primary,
        marginBottom:20
    },
    courseName: { fontSize:22, fontWeight:'800', color:colors.text.primary, marginBottom:4 },
    courseCode: { fontSize:14, color:colors.primary, marginBottom:12 },
    infoRow: { flexDirection:'row', alignItems:'center', gap:12, marginBottom:10 },
    infoText: { fontSize:15, color:colors.text.primary, flex:1 },
    joinBtn: {
        flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10,
        backgroundColor: colors.primary,
        borderRadius:14, paddingVertical:16,
        marginBottom:10
    },
    joinBtnText: { fontSize:16, fontWeight:'700', color:'#fff' },
    cancelBtn: { alignItems:'center', paddingVertical:12 },
    cancelBtnText: { fontSize:14, color:colors.text.muted, fontWeight:'600' },
});