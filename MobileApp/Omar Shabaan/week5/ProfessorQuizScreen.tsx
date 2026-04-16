import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
    Share, ActivityIndicator, SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/const/colors';
import { LectureSession, QuizResult, QuizQuestion } from './types';
import { subscribeToQuizResults, buildExportText } from './quizService';

interface Props {
    visible: boolean;
    onClose: () => void;
    session: LectureSession;
}

export default function ProfessorQuizScreen({ visible, onClose, session }: Props) {
    const [activeTab, setActiveTab] = useState<'analytics' | 'results'>('analytics');
    const [results, setResults] = useState<QuizResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<QuizResult | null>(null);

    const questions: QuizQuestion[] = session.quizQuestions || [];

    useEffect(() => {
        if (!visible || !session?.id) return;
        setLoading(true);
        const unsubscribe = subscribeToQuizResults(session.id, (data) => {
            setResults(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [session?.id, visible]);

    const handleExport = async () => {
        if (results.length === 0 || questions.length === 0) return;
        const text = buildExportText(session.courseName || 'الاختبار', questions, results);
        try {
            await Share.share({ message: text });
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };

    const avgScore = results.length > 0
        ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)
        : '0';

    const passCount = results.filter(r => r.score >= 5).length;
    const failCount = results.length - passCount;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.root}>
                <View style={styles.header}>
                    <View style={styles.headerTitleRow}>
                        <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                            <Icon name="arrow-back-ios" size={20} color={colors.text.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>تحليل الاختبار</Text>
                    </View>
                    <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
                        <Icon name="ios-share" size={18} color={colors.primary} />
                        <Text style={styles.exportText}>مشاركة</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'analytics' && styles.tabItemActive]}
                        onPress={() => setActiveTab('analytics')}>
                        <Icon name="insert-chart" size={20} color={activeTab === 'analytics' ? colors.primary : colors.text.muted} />
                        <Text style={[styles.tabText, activeTab === 'analytics' && styles.tabTextActive]}>التحليل والصعوبة</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'results' && styles.tabItemActive]}
                        onPress={() => setActiveTab('results')}>
                        <Icon name="format-list-numbered" size={20} color={activeTab === 'results' ? colors.primary : colors.text.muted} />
                        <Text style={[styles.tabText, activeTab === 'results' && styles.tabTextActive]}>إجابات الطلاب</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>سلموا</Text>
                            <Text style={styles.summaryValue}>{results.length}</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>المتوسط</Text>
                            <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>{avgScore}</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>ناجح</Text>
                            <Text style={[styles.summaryValue, { color: '#10B981' }]}>{passCount}</Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>راسب</Text>
                            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{failCount}</Text>
                        </View>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
                    ) : questions.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Icon name="hourglass-empty" size={50} color={colors.text.muted} />
                            <Text style={styles.emptyText}>لم يتم توليد أسئلة لهذا الاختبار بعد.</Text>
                        </View>
                    ) : (
                        <>
                            {activeTab === 'analytics' && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>أداء الدفعة في كل سؤال</Text>
                                    {questions.map((q, i) => {
                                        const correctCount = results.filter(r => r.answers[i] === q.correctIndex).length;
                                        const percentage = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
                                        const barColor = percentage >= 70 ? '#10B981' : percentage >= 40 ? '#F59E0B' : '#EF4444';

                                        return (
                                            <View key={i} style={styles.analysisCard}>
                                                <Text style={styles.qText}>س{i + 1}: {q.question}</Text>
                                                <View style={styles.barContainer}>
                                                    <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
                                                </View>
                                                <View style={styles.statsRow}>
                                                    <Text style={styles.statsSubText}>{correctCount} من {results.length} أجابوا بشكل صحيح</Text>
                                                    <Text style={[styles.statsPercent, { color: barColor }]}>{percentage}%</Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            {activeTab === 'results' && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>قائمة الدرجات (اضغط للتفاصيل)</Text>
                                    {results.length === 0 ? (
                                        <Text style={styles.emptyText}>لم يقم أي طالب بتسليم الاختبار حتى الآن.</Text>
                                    ) : (
                                        results.sort((a, b) => b.score - a.score).map((r, i) => (
                                            <TouchableOpacity 
                                                key={r.id || i} 
                                                style={styles.studentRow}
                                                onPress={() => setSelectedStudent(r)}>
                                                <View style={styles.rankBadge}>
                                                    <Text style={styles.rankText}>{i + 1}</Text>
                                                </View>
                                                <Text style={styles.studentName} numberOfLines={1}>{r.studentName}</Text>
                                                <View style={[styles.scoreBadge, { backgroundColor: r.score >= 7 ? '#10B98120' : '#EF444420' }]}>
                                                    <Text style={[styles.scoreText, { color: r.score >= 7 ? '#10B981' : '#EF4444' }]}>{r.score}/10</Text>
                                                </View>
                                                <Icon name="chevron-right" size={20} color={colors.text.muted} />
                                            </TouchableOpacity>
                                        ))
                                    )}
                                </View>
                            )}
                        </>
                    )}
                    <View style={{ height: 40 }} />
                </ScrollView>

                {selectedStudent && (
                    <Modal visible={true} animationType="fade" transparent>
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>ورقة إجابة: {selectedStudent.studentName}</Text>
                                    <TouchableOpacity onPress={() => setSelectedStudent(null)}>
                                        <Icon name="close" size={24} color={colors.text.muted} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {questions.map((q, i) => {
                                        const studentAnswer = selectedStudent.answers[i];
                                        const isCorrect = studentAnswer === q.correctIndex;
                                        return (
                                            <View key={i} style={[styles.studentAnsCard, { borderColor: isCorrect ? '#10B981' : '#EF4444' }]}>
                                                <Text style={styles.qText}>س{i + 1}: {q.question}</Text>
                                                <View style={styles.ansRow}>
                                                    <Icon name={isCorrect ? "check-circle" : "cancel"} size={18} color={isCorrect ? '#10B981' : '#EF4444'} />
                                                    <Text style={[styles.ansText, { color: isCorrect ? '#10B981' : '#EF4444' }]}>
                                                        إجابة الطالب: {studentAnswer !== undefined && studentAnswer !== -1 ? q.options[studentAnswer] : 'لم يُجب'}
                                                    </Text>
                                                </View>
                                                {!isCorrect && (
                                                    <View style={[styles.ansRow, { marginTop: 8 }]}>
                                                        <Icon name="check" size={18} color="#10B981" />
                                                        <Text style={[styles.ansText, { color: '#10B981' }]}>
                                                            الإجابة الصحيحة: {q.options[q.correctIndex]}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                    <View style={{ height: 20 }} />
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background.primary },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: colors.background.secondary, borderBottomWidth: 1, borderColor: colors.border.primary },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary + '15' },
    exportText: { fontSize: 13, fontWeight: '600', color: colors.primary },
    tabBar: { flexDirection: 'row', padding: 16, gap: 10, backgroundColor: colors.background.primary },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.background.secondary, borderWidth: 1, borderColor: colors.border.primary },
    tabItemActive: { backgroundColor: colors.primary + '10', borderColor: colors.primary },
    tabText: { fontSize: 14, fontWeight: '600', color: colors.text.muted },
    tabTextActive: { color: colors.primary },
    content: { flex: 1, paddingHorizontal: 16 },
    summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 20, marginTop: 10 },
    summaryCard: { flex: 1, backgroundColor: colors.background.secondary, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border.primary },
    summaryLabel: { fontSize: 11, color: colors.text.muted, marginBottom: 4 },
    summaryValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
    emptyState: { alignItems: 'center', marginTop: 60, padding: 20 },
    emptyText: { fontSize: 14, color: colors.text.muted, marginTop: 10, textAlign: 'center' },
    section: { paddingBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 12 },
    analysisCard: { backgroundColor: colors.background.secondary, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border.primary },
    qText: { fontSize: 14, fontWeight: '700', color: colors.text.primary, marginBottom: 12, lineHeight: 22, textAlign: 'right' },
    barContainer: { height: 8, backgroundColor: colors.border.primary, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    barFill: { height: '100%', borderRadius: 4 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statsSubText: { fontSize: 12, color: colors.text.muted },
    statsPercent: { fontSize: 14, fontWeight: '800' },
    studentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background.secondary, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border.primary },
    rankBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.border.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    rankText: { fontSize: 12, fontWeight: '700', color: colors.text.secondary },
    studentName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text.primary, textAlign: 'left' },
    scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
    scoreText: { fontSize: 14, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.background.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    studentAnsCard: { backgroundColor: colors.background.secondary, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
    ansRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ansText: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
});