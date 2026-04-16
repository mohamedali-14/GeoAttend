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
    sessionStartTime: string;
    onChangeStartTime: (v: string) => void;
    sessionEndTime: string;
    onChangeEndTime: (v: string) => void;
    sessionRoom: string;
    onChangeRoom: (v: string) => void;
    creatingSession: boolean;
    onCreateSession: () => void;
    // Geo-attendance
    geoEnabled: boolean;
    onToggleGeo: (v: boolean) => void;
    radiusMeters: string;
    onChangeRadius: (v: string) => void;
    fetchingLocation: boolean;
}

export default function ProfessorSessionsScreen({
    visible, onClose, courses, selectedCourse, onSelectCourse,
    sessionStartTime, onChangeStartTime,
    sessionEndTime, onChangeEndTime,
    sessionRoom, onChangeRoom,
    creatingSession, onCreateSession,
    geoEnabled, onToggleGeo, radiusMeters, onChangeRadius, fetchingLocation,
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

                        {/* Times */}
                        <Text style={styles.fieldLabel}>Start Time</Text>
                        <TextInput style={styles.fieldInput} placeholder="e.g. 10:00 AM"
                            placeholderTextColor={colors.text.muted} value={sessionStartTime}
                            onChangeText={onChangeStartTime} />

                        <Text style={styles.fieldLabel}>End Time</Text>
                        <TextInput style={styles.fieldInput} placeholder="e.g. 11:30 AM"
                            placeholderTextColor={colors.text.muted} value={sessionEndTime}
                            onChangeText={onChangeEndTime} />

                        {/* Room */}
                        <Text style={styles.fieldLabel}>Room / Location</Text>
                        <TextInput style={styles.fieldInput} placeholder="e.g. Hall A-12"
                            placeholderTextColor={colors.text.muted} value={sessionRoom}
                            onChangeText={onChangeRoom} />

                        {/* Geo-attendance toggle card */}
                        <View style={styles.geoCard}>
                            <View style={styles.geoHeader}>
                                <View style={styles.geoTitleRow}>
                                    <View style={[styles.geoIconBg, geoEnabled && { backgroundColor: '#10B98122' }]}>
                                        <Icon name="my-location" size={20} color={geoEnabled ? '#10B981' : colors.text.muted} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.geoTitle}>تتبع الموقع GPS</Text>
                                        <Text style={styles.geoSubtitle}>
                                            {geoEnabled
                                                ? 'يُتحقق من موقع الطالب كل دقيقة'
                                                : 'تفعيل للتحقق من تواجد الطالب داخل القاعة'}
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
                                <View style={styles.geoOptions}>
                                    <Text style={[styles.fieldLabel, { marginTop: 16 }]}>نطاق الحضور (بالمتر)</Text>

                                    {/* Quick radius presets */}
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

                                    {/* Info note */}
                                    <View style={styles.geoInfoBox}>
                                        <Icon name="info-outline" size={15} color="#3B82F6" />
                                        <Text style={styles.geoInfoText}>
                                            {'موقعك الحالي سيُحفظ مركزاً للنطاق لحظة بدء الجلسة.\nإذا خرج الطالب من النطاق لأكثر من 5 دقائق متواصلة، يُسجَّل غائباً نهائياً.'}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Submit */}
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
    modalHandle: { width: 40, height: 4, backgroundColor: colors.border.primary, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text.secondary, marginBottom: 6 },
    fieldInput: {
        backgroundColor: colors.background.secondary, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
        color: colors.text.primary, borderWidth: 1, borderColor: colors.border.primary,
        marginBottom: 14, fontSize: 15,
    },
    courseChip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8,
        borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.background.secondary,
    },
    courseChipText: { fontSize: 13, fontWeight: '700', color: colors.text.primary },

    // Geo card
    geoCard: {
        borderRadius: 16, borderWidth: 1, borderColor: colors.border.primary,
        backgroundColor: colors.background.secondary, padding: 16, marginBottom: 20,
    },
    geoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    geoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    geoIconBg: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: colors.border.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    geoTitle: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
    geoSubtitle: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    geoOptions: {},
    radiusRow: { flexDirection: 'row', gap: 8 },
    radiusChip: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.background.primary,
    },
    radiusChipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
    radiusChipText: { fontSize: 13, fontWeight: '600', color: colors.text.muted },
    radiusChipTextActive: { color: '#fff' },
    geoInfoBox: {
        flexDirection: 'row', gap: 8, alignItems: 'flex-start',
        backgroundColor: '#3B82F611', borderRadius: 10, padding: 12, marginTop: 4,
    },
    geoInfoText: { flex: 1, fontSize: 12, color: colors.text.muted, lineHeight: 18 },
    startSessionBtn: {
        backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    startSessionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
