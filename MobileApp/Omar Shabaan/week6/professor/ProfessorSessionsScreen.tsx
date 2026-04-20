import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    TextInput, ScrollView, ActivityIndicator, Switch, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/const/colors';
import { Course } from './types';

interface Props {
    visible: boolean;
    onClose: () => void;
    courses: Course[];
    selectedCourse: Course | null;
    onSelectCourse: (course: Course) => void;
    sessionRoom: string;
    onChangeRoom: (v: string) => void;
    creatingSession: boolean;
    onCreateSession: () => void;
    geoEnabled: boolean;
    onToggleGeo: (v: boolean) => void;
    radiusMeters: string;
    onChangeRadius: (v: string) => void;
    fetchingLocation: boolean;
    errors?: { course?: string; room?: string };
    sessionStartTime?: string;
    onChangeStartTime?: (v: string) => void;
    sessionEndTime?: string;
    onChangeEndTime?: (v: string) => void;
    randomCheckEnabled: boolean;
    onToggleRandomCheck: (v: boolean) => void;
    selfieEnabled: boolean;
    onToggleSelfie: (v: boolean) => void;
}

export default function ProfessorSessionsScreen({
    visible, onClose, courses, selectedCourse, onSelectCourse,
    sessionRoom, onChangeRoom,
    creatingSession, onCreateSession,
    geoEnabled, onToggleGeo, radiusMeters, onChangeRadius, fetchingLocation,
    errors = {},
    randomCheckEnabled, onToggleRandomCheck,
    selfieEnabled, onToggleSelfie,
}: Props) {
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Start New Session</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color={colors.text.muted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>

                        <Text style={styles.fieldLabel}>Select Course</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                            {courses.map((c) => (
                                <TouchableOpacity key={c.id}
                                    style={[styles.courseChip, selectedCourse?.id === c.id && { backgroundColor: c.color, borderColor: c.color }]}
                                    onPress={() => onSelectCourse(c)}>
                                    <Text style={[styles.courseChipText, selectedCourse?.id === c.id && { color: '#fff' }]}>
                                        {c.code}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        {errors.course && <Text style={styles.errorText}>⚠ {errors.course}</Text>}

                        <Text style={styles.fieldLabel}>Room / Location</Text>
                        <TextInput
                            style={[styles.fieldInput, errors.room && styles.fieldInputError]}
                            placeholder="e.g. Hall A-12"
                            placeholderTextColor={colors.text.muted}
                            value={sessionRoom}
                            onChangeText={onChangeRoom}
                        />
                        {errors.room && <Text style={styles.errorText}>⚠ {errors.room}</Text>}

                        <Text style={styles.sectionLabel}>خيارات الجلسة</Text>

                        <View style={styles.featureCard}>
                            <View style={styles.featureHeader}>
                                <View style={styles.featureTitleRow}>
                                    <View style={[styles.featureIconBg, geoEnabled && { backgroundColor: '#10B98122' }]}>
                                        <Icon name="my-location" size={20} color={geoEnabled ? '#10B981' : colors.text.muted} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.featureTitle}>تتبع الموقع GPS</Text>
                                        <Text style={styles.featureSubtitle}>
                                            {geoEnabled ? 'يُتحقق من موقع الطالب كل دقيقة' : 'تفعيل للتحقق من تواجد الطالب داخل القاعة'}
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={geoEnabled}
                                    onValueChange={onToggleGeo}
                                    trackColor={{ false: colors.border.primary, true: '#10B98155' }}
                                    thumbColor={geoEnabled ? '#10B981' : colors.text.muted}
                                />
                            </View>

                            {geoEnabled && (
                                <View style={styles.featureOptions}>
                                    <Text style={[styles.fieldLabel, { marginTop: 16 }]}>نطاق الحضور (بالمتر)</Text>
                                    <View style={styles.radiusRow}>
                                        {['25', '50', '100', '200'].map(r => (
                                            <TouchableOpacity key={r}
                                                style={[styles.radiusChip, radiusMeters === r && styles.radiusChipActive]}
                                                onPress={() => onChangeRadius(r)}>
                                                <Text style={[styles.radiusChipText, radiusMeters === r && styles.radiusChipTextActive]}>
                                                    {r}م
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <TextInput
                                        style={[styles.fieldInput, { marginTop: 10 }]}
                                        placeholder="أو أدخل قيمة مخصصة"
                                        placeholderTextColor={colors.text.muted}
                                        value={radiusMeters}
                                        onChangeText={onChangeRadius}
                                        keyboardType="numeric"
                                    />
                                    <View style={styles.infoBox}>
                                        <Icon name="info-outline" size={15} color="#3B82F6" />
                                        <Text style={styles.infoBoxText}>
                                            {'موقعك الحالي سيُحفظ مركزاً للنطاق لحظة بدء الجلسة.\nإذا خرج الطالب من النطاق لأكثر من 5 دقائق متواصلة، يُسجَّل غائباً نهائياً.'}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <View style={styles.featureCard}>
                            <View style={styles.featureHeader}>
                                <View style={styles.featureTitleRow}>
                                    <View style={[styles.featureIconBg, randomCheckEnabled && { backgroundColor: '#8B5CF622' }]}>
                                        <Icon name="shuffle" size={20} color={randomCheckEnabled ? '#8B5CF6' : colors.text.muted} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.featureTitle}>التحقق العشوائي</Text>
                                        <Text style={styles.featureSubtitle}>
                                            {randomCheckEnabled ? 'يمكنك إرسال تحقق عشوائي للطلاب أثناء الجلسة' : 'تفعيل لاختبار حضور الطلاب عشوائياً أثناء الجلسة'}
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={randomCheckEnabled}
                                    onValueChange={onToggleRandomCheck}
                                    trackColor={{ false: colors.border.primary, true: '#8B5CF655' }}
                                    thumbColor={randomCheckEnabled ? '#8B5CF6' : colors.text.muted}
                                />
                            </View>

                            {randomCheckEnabled && (
                                <View style={styles.featureOptions}>
                                    <View style={[styles.infoBox, { backgroundColor: '#8B5CF611', marginTop: 12 }]}>
                                        <Icon name="info-outline" size={15} color="#8B5CF6" />
                                        <Text style={[styles.infoBoxText, { color: '#8B5CF6' }]}>
                                            {'أثناء الجلسة يظهر زر "اختبار عشوائي" في شاشة تفاصيل الجلسة.\nالطلاب الذين لا يردون خلال دقيقتين يُسجَّلون غائبين تلقائياً.'}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <View style={styles.featureCard}>
                            <View style={styles.featureHeader}>
                                <View style={styles.featureTitleRow}>
                                    <View style={[styles.featureIconBg, selfieEnabled && { backgroundColor: '#F59E0B22' }]}>
                                        <Icon name="face" size={20} color={selfieEnabled ? '#F59E0B' : colors.text.muted} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.featureTitle}>سيلفي الحضور</Text>
                                        <Text style={styles.featureSubtitle}>
                                            {selfieEnabled ? 'يُطلب من الطالب التقاط سيلفي عند تسجيل حضوره' : 'تفعيل للتحقق البصري من هوية الطالب'}
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={selfieEnabled}
                                    onValueChange={onToggleSelfie}
                                    trackColor={{ false: colors.border.primary, true: '#F59E0B55' }}
                                    thumbColor={selfieEnabled ? '#F59E0B' : colors.text.muted}
                                />
                            </View>

                            {selfieEnabled && (
                                <View style={styles.featureOptions}>
                                    <View style={[styles.infoBox, { backgroundColor: '#F59E0B11', marginTop: 12 }]}>
                                        <Icon name="info-outline" size={15} color="#F59E0B" />
                                        <Text style={[styles.infoBoxText, { color: '#F59E0B' }]}>
                                            {'بعد مسح QR يُطلب من الطالب التقاط صورة سيلفي.\nتُحفظ الصورة في Firebase Storage وتظهر في تقرير الحضور.'}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.startSessionBtn, (creatingSession || fetchingLocation) && { opacity: 0.6 }]}
                            onPress={onCreateSession}
                            disabled={creatingSession || fetchingLocation}>
                            {fetchingLocation ? (
                                <>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={styles.startSessionBtnText}>جاري تحديد موقعك...</Text>
                                </>
                            ) : creatingSession ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Icon name="play-circle-filled" size={20} color="#fff" />
                                    <Text style={styles.startSessionBtnText}>Start Session & Enable Attendance</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: colors.background.primary,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        maxHeight: '92%',
    },
    modalHandle:  { width: 40, height: 4, backgroundColor: colors.border.primary, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle:   { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    fieldLabel:   { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 6 },
    fieldInput:   {
        backgroundColor: colors.background.secondary, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        color: colors.text.primary, borderWidth: 1, borderColor: colors.border.primary,
        marginBottom: 14, fontSize: 15,
    },
    fieldInputError: { borderColor: '#EF4444', borderWidth: 1.5 },
    errorText:    { fontSize: 12, color: '#EF4444', marginTop: -10, marginBottom: 10, fontWeight: '600' },

    courseChip:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.background.secondary },
    courseChipText: { fontSize: 13, fontWeight: '700', color: colors.text.primary },

    sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.text.secondary, marginBottom: 10, marginTop: 4, letterSpacing: 0.5 },

    featureCard:      { borderRadius: 16, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.background.secondary, padding: 16, marginBottom: 12 },
    featureHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    featureTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    featureIconBg:    { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.border.primary, justifyContent: 'center', alignItems: 'center' },
    featureTitle:     { fontSize: 14, fontWeight: '700', color: colors.text.primary },
    featureSubtitle:  { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    featureOptions:   {},

    radiusRow:            { flexDirection: 'row', gap: 8 },
    radiusChip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.background.primary },
    radiusChipActive:     { backgroundColor: '#10B981', borderColor: '#10B981' },
    radiusChipText:       { fontSize: 13, fontWeight: '600', color: colors.text.muted },
    radiusChipTextActive: { color: '#fff' },

    infoBox:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#3B82F611', borderRadius: 10, padding: 12, marginTop: 4 },
    infoBoxText: { flex: 1, fontSize: 12, color: colors.text.muted, lineHeight: 18 },

    startSessionBtn:     { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 },
    startSessionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
