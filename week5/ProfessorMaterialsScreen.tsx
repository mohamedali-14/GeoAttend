import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    ActivityIndicator, Alert, ScrollView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '@/const/colors';
import { db } from '@/firebaseConfig';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { LectureSession, QuizQuestion } from './types';
import { generateQuizWithAI, saveQuizToSession, activateQuiz } from './quizService';

const QRDisplay = ({ value }: { value: string }) => (
    <View style={qrStyles.box}>
        <Icon name="qr-code" size={120} color={colors.text.primary} />
        <Text style={qrStyles.hint}>Session ID:</Text>
        <Text style={qrStyles.value} selectable>{JSON.parse(value).sessionId}</Text>
    </View>
);
const qrStyles = StyleSheet.create({
    box:   { alignItems: 'center', gap: 8 },
    hint:  { fontSize: 12, color: colors.text.muted },
    value: { fontSize: 13, fontWeight: '700', color: colors.primary, textAlign: 'center' },
});

interface Props {
    visible: boolean;
    onClose: () => void;
    session: LectureSession;
    professorName: string;
    onSessionUpdated: (updates?: any) => void;
}

type Tab = 'pdf' | 'qr' | 'quiz';

export default function ProfessorMaterialsScreen({ visible, onClose, session, professorName, onSessionUpdated }: Props) {
    const [activeTab, setActiveTab]         = useState<Tab>('pdf');
    const [internalVisible, setInternalVisible] = useState(visible);
    const [uploadingPDF, setUploadingPDF]   = useState(false);
    const [pdfName, setPdfName]             = useState(session.pdfName || '');
    const [pdfUrl, setPdfUrl]               = useState(session.pdfUrl || '');
    const [generatingQuiz, setGeneratingQuiz] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(session.quizQuestions || []);
    const [quizActive, setQuizActive]       = useState(session.quizActive || false);
    const [quizResults, setQuizResults]     = useState<any[]>([]);
    const [loadingResults, setLoadingResults] = useState(false);

    const qrValue = JSON.stringify({ sessionId: session.id, courseId: session.courseId, type: 'attendance' });

    useEffect(() => {
        setPdfName(session.pdfName || '');
        setPdfUrl(session.pdfUrl || '');
        setQuizQuestions(session.quizQuestions || []);
        setQuizActive(session.quizActive || false);
        if (session.pdfUrl && !pdfUrl) setActiveTab('pdf');
    }, [session]);

    const handlePickPDF = async () => {
        try {
            if (Platform.OS === 'android') {
                setInternalVisible(false);
                await new Promise<void>(resolve => setTimeout(resolve, 300));
            }

            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (Platform.OS === 'android') setInternalVisible(true);
            if (result.canceled || !result.assets?.[0]) return;

            const file = result.assets[0];
            setUploadingPDF(true);

            if (!session?.id) return;

            const data = new FormData();
            data.append('file', { uri: file.uri, type: 'application/pdf', name: file.name || 'lecture.pdf' } as any);
            data.append('upload_preset', 'flelb7gp');

            const response = await fetch('https://api.cloudinary.com/v1_1/dpnzn3qfk/auto/upload', {
                method: 'POST',
                body: data,
            });

            const resJson = await response.json();
            if (!response.ok) throw new Error(resJson.error?.message || 'Cloudinary Upload Failed');

            const downloadURL = resJson.secure_url || resJson.url;
            if (!downloadURL) throw new Error('Could not get URL from Cloudinary');

            await updateDoc(doc(db, 'sessions', session.id), {
                pdfUrl:  downloadURL,
                pdfName: file.name ?? 'lecture.pdf',
            });

            setPdfUrl(downloadURL);
            setPdfName(file.name ?? 'lecture.pdf');
            if (onSessionUpdated) onSessionUpdated({ pdfUrl: downloadURL, pdfName: file.name ?? 'lecture.pdf' });
            Alert.alert('✅ تم', 'تم رفع الملف وحفظه في النظام');
        } catch (e: any) {
            if (Platform.OS === 'android') setInternalVisible(true);
            Alert.alert('خطأ', e.message);
        } finally {
            setUploadingPDF(false);
        }
    };

    const handleGenerateQuiz = () => {
        Alert.alert('🤖 توليد أسئلة بالـ AI', `توليد 5 أسئلة لمادة "${session.courseName}"`, [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: 'توليد', onPress: async () => {
                    try {
                        setGeneratingQuiz(true);
                        const questions = await generateQuizWithAI(session.courseName, pdfUrl || undefined);
                        setQuizQuestions(questions);
                        await saveQuizToSession(session.id, questions);
                    } catch (e: any) {
                        Alert.alert('خطأ', 'فشل توليد الأسئلة: ' + e.message);
                    } finally {
                        setGeneratingQuiz(false);
                    }
                },
            },
        ]);
    };

    const handleActivateQuiz = () => {
        if (!quizQuestions.length) { Alert.alert('تنبيه', 'ولّد الأسئلة أولاً.'); return; }
        Alert.alert('📤 إرسال الاختبار', 'سيظهر للطلاب الحاضرين فوراً.', [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: 'إرسال', onPress: async () => {
                    await activateQuiz(session.id);
                    setQuizActive(true);
                    if (onSessionUpdated) onSessionUpdated({ quizActive: true });
                },
            },
        ]);
    };

    const fetchQuizResults = async () => {
        try {
            setLoadingResults(true);
            const snap = await getDocs(query(collection(db, 'quizResults'), where('sessionId', '==', session.id)));
            setQuizResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingResults(false);
        }
    };

    return (
        <Modal visible={internalVisible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>إدارة الجلسة</Text>
                            <Text style={styles.headerSub}>{session.courseName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Icon name="close" size={22} color={colors.text.muted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabRow}>
                        {([
                            { key: 'pdf',  icon: 'picture-as-pdf',   label: 'PDF' },
                            { key: 'qr',   icon: 'qr-code-scanner',  label: 'QR Code' },
                            { key: 'quiz', icon: 'auto-awesome',      label: 'AI Quiz' },
                        ] as { key: Tab; icon: string; label: string }[]).map(t => (
                            <TouchableOpacity key={t.key}
                                style={[styles.tab, activeTab === t.key && styles.tabActive]}
                                onPress={() => setActiveTab(t.key)}>
                                <Icon name={t.icon} size={18} color={activeTab === t.key ? '#fff' : colors.text.muted} />
                                <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {activeTab === 'pdf' && (
                            <View>
                                {pdfUrl ? (
                                    <View style={styles.pdfUploaded}>
                                        <View style={styles.pdfFileRow}>
                                            <View style={styles.pdfIconBg}>
                                                <Icon name="picture-as-pdf" size={28} color="#EF4444" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.pdfFileName} numberOfLines={1}>{pdfName}</Text>
                                                <Text style={styles.pdfStatus}>✅ متاح للطلاب</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity style={styles.replaceBtn} onPress={handlePickPDF} disabled={uploadingPDF}>
                                            {uploadingPDF
                                                ? <ActivityIndicator size="small" color={colors.primary} />
                                                : <><Icon name="refresh" size={16} color={colors.primary} /><Text style={styles.replaceBtnText}>استبدال الملف</Text></>
                                            }
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.pdfEmpty}>
                                        <View style={styles.pdfEmptyIcon}>
                                            <Icon name="upload-file" size={48} color={colors.text.muted} />
                                        </View>
                                        <Text style={styles.pdfEmptyTitle}>لا يوجد ملف محاضرة</Text>
                                        <Text style={styles.pdfEmptyText}>ارفع ملف PDF ليظهر للطلاب في الجلسة النشطة</Text>
                                        <TouchableOpacity
                                            style={[styles.uploadBtn, uploadingPDF && { opacity: 0.6 }]}
                                            onPress={handlePickPDF}
                                            disabled={uploadingPDF}>
                                            {uploadingPDF
                                                ? <ActivityIndicator size="small" color="#fff" />
                                                : <><Icon name="upload" size={20} color="#fff" /><Text style={styles.uploadBtnText}>اختر ملف PDF</Text></>
                                            }
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        {activeTab === 'qr' && (
                            <View style={styles.qrContainer}>
                                <Text style={styles.qrTitle}>QR تسجيل الحضور</Text>
                                <Text style={styles.qrSubtitle}>اعرض هذا الكود للطلاب ليسكنوه بكاميرا هواتفهم</Text>
                                <View style={styles.qrBox}>
                                    <QRDisplay value={qrValue} />
                                </View>
                                <View style={styles.qrInfoRow}>
                                    <Icon name="info-outline" size={15} color="#3B82F6" />
                                    <Text style={styles.qrInfoText}>الكود مرتبط بهذه الجلسة فقط وينتهي عند إغلاقها</Text>
                                </View>
                                <View style={styles.sessionBadge}>
                                    <Text style={styles.sessionBadgeText}>{session.courseName} — {session.room}</Text>
                                </View>
                            </View>
                        )}

                        {activeTab === 'quiz' && (
                            <View>
                                {quizActive && (
                                    <View style={styles.quizActiveBanner}>
                                        <Icon name="live-tv" size={18} color="#10B981" />
                                        <Text style={styles.quizActiveBannerText}>الاختبار نشط — الطلاب يحلون الآن</Text>
                                    </View>
                                )}

                                {!quizActive && (
                                    <TouchableOpacity
                                        style={[styles.generateBtn, generatingQuiz && { opacity: 0.6 }]}
                                        onPress={handleGenerateQuiz}
                                        disabled={generatingQuiz}>
                                        {generatingQuiz
                                            ? <><ActivityIndicator size="small" color="#fff" /><Text style={styles.generateBtnText}>جاري توليد الأسئلة...</Text></>
                                            : <><Icon name="auto-awesome" size={20} color="#fff" /><Text style={styles.generateBtnText}>توليد أسئلة بالـ AI</Text></>
                                        }
                                    </TouchableOpacity>
                                )}

                                {quizQuestions.length > 0 && (
                                    <View style={styles.questionsPreview}>
                                        <Text style={styles.previewTitle}>الأسئلة ({quizQuestions.length})</Text>
                                        {quizQuestions.map((q, i) => (
                                            <View key={i} style={styles.questionCard}>
                                                <Text style={styles.questionNum}>س{i + 1}</Text>
                                                <Text style={styles.questionText}>{q.question}</Text>
                                                {q.options.map((opt, j) => (
                                                    <View key={j} style={[styles.optionRow, j === q.correctIndex && styles.optionCorrect]}>
                                                        <Text style={[styles.optionLabel, j === q.correctIndex && styles.optionLabelCorrect]}>
                                                            {['أ', 'ب', 'ج', 'د'][j]}. {opt}
                                                        </Text>
                                                        {j === q.correctIndex && <Icon name="check-circle" size={14} color="#10B981" />}
                                                    </View>
                                                ))}
                                            </View>
                                        ))}
                                        {!quizActive && (
                                            <TouchableOpacity style={styles.activateBtn} onPress={handleActivateQuiz}>
                                                <Icon name="send" size={18} color="#fff" />
                                                <Text style={styles.activateBtnText}>إرسال الاختبار للطلاب</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}

                                {quizActive && (
                                    <View style={styles.resultsSection}>
                                        <View style={styles.resultsSectionHeader}>
                                            <Text style={styles.resultsSectionTitle}>📊 درجات الطلاب</Text>
                                            <TouchableOpacity onPress={fetchQuizResults}>
                                                <Icon name="refresh" size={20} color={colors.primary} />
                                            </TouchableOpacity>
                                        </View>
                                        {loadingResults
                                            ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
                                            : quizResults.length === 0
                                                ? <View style={styles.noResults}><Icon name="hourglass-empty" size={40} color={colors.text.muted} /><Text style={styles.noResultsText}>لم يُسلِّم أحد بعد</Text></View>
                                                : quizResults.map((r, i) => (
                                                    <View key={r.id} style={styles.resultRow}>
                                                        <View style={styles.resultRank}><Text style={styles.resultRankText}>#{i + 1}</Text></View>
                                                        <Text style={styles.resultName} numberOfLines={1}>{r.studentName}</Text>
                                                        <View style={[styles.scoreBadge, { backgroundColor: r.score >= 7 ? '#10B98120' : r.score >= 5 ? '#F59E0B20' : '#EF444420' }]}>
                                                            <Text style={[styles.scoreText, { color: r.score >= 7 ? '#10B981' : r.score >= 5 ? '#F59E0B' : '#EF4444' }]}>{r.score}/10</Text>
                                                        </View>
                                                    </View>
                                                ))
                                        }
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay:              { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet:                { backgroundColor: colors.background.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24, maxHeight: '92%', minHeight: '75%' },
    handle:               { width: 40, height: 4, backgroundColor: colors.border.primary, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    header:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle:          { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    headerSub:            { fontSize: 13, color: colors.text.muted, marginTop: 2 },
    closeBtn:             { padding: 4 },
    tabRow:               { flexDirection: 'row', gap: 8, marginBottom: 20 },
    tab:                  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border.primary, backgroundColor: colors.background.secondary },
    tabActive:            { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText:              { fontSize: 12, fontWeight: '600', color: colors.text.muted },
    tabTextActive:        { color: '#fff' },
    content:              { flex: 1 },
    pdfEmpty:             { alignItems: 'center', paddingVertical: 30 },
    pdfEmptyIcon:         { width: 90, height: 90, borderRadius: 24, backgroundColor: colors.background.secondary, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.border.primary },
    pdfEmptyTitle:        { fontSize: 17, fontWeight: '700', color: colors.text.primary, marginBottom: 8 },
    pdfEmptyText:         { fontSize: 13, color: colors.text.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 20 },
    uploadBtn:            { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
    uploadBtnText:        { fontSize: 15, fontWeight: '700', color: '#fff' },
    pdfUploaded:          { backgroundColor: colors.background.secondary, borderRadius: 16, borderWidth: 1, borderColor: colors.border.primary, padding: 16 },
    pdfFileRow:           { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
    pdfIconBg:            { width: 52, height: 52, borderRadius: 14, backgroundColor: '#EF444415', justifyContent: 'center', alignItems: 'center' },
    pdfFileName:          { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    pdfStatus:            { fontSize: 12, color: '#10B981', marginTop: 3 },
    replaceBtn:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingVertical: 10 },
    replaceBtnText:       { fontSize: 14, color: colors.primary, fontWeight: '600' },
    qrContainer:          { alignItems: 'center', paddingTop: 8 },
    qrTitle:              { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 6 },
    qrSubtitle:           { fontSize: 13, color: colors.text.muted, textAlign: 'center', marginBottom: 24 },
    qrBox:                { padding: 24, borderRadius: 20, backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: colors.border.primary, marginBottom: 20 },
    qrInfoRow:            { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#3B82F611', borderRadius: 10, padding: 12, marginBottom: 16 },
    qrInfoText:           { flex: 1, fontSize: 12, color: colors.text.muted, lineHeight: 18 },
    sessionBadge:         { backgroundColor: colors.primary + '15', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
    sessionBadgeText:     { fontSize: 13, color: colors.primary, fontWeight: '600' },
    quizActiveBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10B98115', borderRadius: 12, padding: 14, marginBottom: 16 },
    quizActiveBannerText: { fontSize: 14, color: '#10B981', fontWeight: '700' },
    generateBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#8B5CF6', borderRadius: 14, paddingVertical: 16, marginBottom: 20 },
    generateBtnText:      { fontSize: 15, fontWeight: '700', color: '#fff' },
    questionsPreview:     { marginBottom: 16 },
    previewTitle:         { fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 12 },
    questionCard:         { backgroundColor: colors.background.secondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border.primary, padding: 14, marginBottom: 12 },
    questionNum:          { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 4 },
    questionText:         { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 10, lineHeight: 20 },
    optionRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
    optionCorrect:        { backgroundColor: '#10B98115' },
    optionLabel:          { fontSize: 13, color: colors.text.secondary, flex: 1 },
    optionLabelCorrect:   { color: '#10B981', fontWeight: '600' },
    activateBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, marginTop: 8 },
    activateBtnText:      { fontSize: 15, fontWeight: '700', color: '#fff' },
    resultsSection:       { marginTop: 8 },
    resultsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    resultsSectionTitle:  { fontSize: 15, fontWeight: '700', color: colors.text.primary },
    noResults:            { alignItems: 'center', paddingVertical: 30, gap: 10 },
    noResultsText:        { fontSize: 14, color: colors.text.muted },
    resultRow:            { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.background.secondary, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border.primary },
    resultRank:           { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
    resultRankText:       { fontSize: 12, fontWeight: '700', color: colors.primary },
    resultName:           { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text.primary },
    scoreBadge:           { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    scoreText:            { fontSize: 15, fontWeight: '800' },
});
