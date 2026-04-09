import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    ScrollView, ActivityIndicator, Alert, Share,
    Animated, Platform, FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '@/const/colors';
import { LectureSession, QuizQuestion, QuizResult } from './types';
import {
    generateQuizWithAI, saveQuizToSession, activateQuiz,
    deactivateQuiz, subscribeToQuizResults, buildExportText,
} from './quizService';

type Tab = 'generate' | 'questions' | 'results' | 'analytics';

type GenerateStatus = 'idle' | 'fetching_pdf' | 'generating' | 'saving' | 'done' | 'error';

interface Props {
    visible: boolean;
    onClose: () => void;
    session: LectureSession;
}

const STATUS_LABELS: Record<GenerateStatus, string> = {
    idle:        '',
    fetching_pdf: 'جاري قراءة الـ PDF...',
    generating:  'الذكاء الاصطناعي يولّد الأسئلة...',
    saving:      'جاري الحفظ...',
    done:        'تم توليد الاختبار بنجاح ✓',
    error:       'حدث خطأ — حاول مجدداً',
};

const STATUS_COLORS: Record<GenerateStatus, string> = {
    idle:        colors.text.muted,
    fetching_pdf: '#F59E0B',
    generating:  '#8B5CF6',
    saving:      '#3B82F6',
    done:        '#10B981',
    error:       '#EF4444',
};

const BAR_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: max > 0 ? value / max : 0, duration: 700, useNativeDriver: false }).start();
    }, [value, max]);
    return (
        <View style={barStyles.bg}>
            <Animated.View style={[barStyles.fill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
    );
}

const barStyles = StyleSheet.create({
    bg:   { height: 8, backgroundColor: colors.border.primary, borderRadius: 4, overflow: 'hidden', flex: 1 },
    fill: { height: 8, borderRadius: 4 },
});

export default function ProfessorQuizScreen({ visible, onClose, session }: Props) {
    const [activeTab,     setActiveTab]     = useState<Tab>('generate');
    const [questions,     setQuestions]     = useState<QuizQuestion[]>(session.quizQuestions || []);
    const [quizActive,    setQuizActive]    = useState(session.quizActive || false);
    const [results,       setResults]       = useState<QuizResult[]>([]);
    const [genStatus,     setGenStatus]     = useState<GenerateStatus>('idle');
    const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;
        setQuestions(session.quizQuestions || []);
        setQuizActive(session.quizActive   || false);

        const unsub = subscribeToQuizResults(session.id, (r) => setResults(r));
        return () => unsub();
    }, [visible, session.id]);

    useEffect(() => {
        if (genStatus === 'generating' || genStatus === 'fetching_pdf') {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
                ]),
            );
            loop.start();
            return () => loop.stop();
        }
    }, [genStatus]);

    const handleGenerate = async () => {
        try {
            setGenStatus(session.pdfUrl ? 'fetching_pdf' : 'generating');
            const qs = await generateQuizWithAI(session.courseName, session.pdfUrl);
            setGenStatus('saving');
            await saveQuizToSession(session.id, qs);
            setQuestions(qs);
            setGenStatus('done');
            setActiveTab('questions');
        } catch (e) {
            console.error(e);
            setGenStatus('error');
        }
    };

    const handleActivate = async () => {
        try {
            await activateQuiz(session.id);
            setQuizActive(true);
            setActiveTab('results');
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        }
    };

    const handleDeactivate = async () => {
        try {
            await deactivateQuiz(session.id);
            setQuizActive(false);
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        }
    };

    const handleExport = async () => {
        const text = buildExportText(session.courseName, questions, results);
        await Share.share({ message: text, title: `نتائج ${session.courseName}` });
    };

    const avg = results.length > 0
        ? (results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(1)
        : '0';

    const passCount = results.filter(r => r.score >= 5).length;
    const failCount = results.length - passCount;

    const questionDifficulty = questions.map((q, qi) => {
        const total   = results.length;
        const correct = results.filter(r => r.answers?.[qi] === q.correctIndex).length;
        return { question: q.question, correct, total, pct: total > 0 ? Math.round((correct / total) * 100) : 0 };
    });

    const renderGenerate = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.generateHero}>
                <View style={styles.generateIconBg}>
                    <Icon name="auto-awesome" size={36} color="#8B5CF6" />
                </View>
                <Text style={styles.generateTitle}>توليد الاختبار بالذكاء الاصطناعي</Text>
                <Text style={styles.generateSub}>
                    {session.pdfUrl
                        ? 'سيتم توليد الأسئلة من ملف الـ PDF المرفوع'
                        : 'سيتم توليد الأسئلة بناءً على اسم المادة'}
                </Text>
            </View>

            {session.pdfUrl && (
                <View style={styles.pdfBadge}>
                    <Icon name="picture-as-pdf" size={16} color="#EF4444" />
                    <Text style={styles.pdfBadgeText} numberOfLines={1}>{session.pdfName || 'lecture.pdf'}</Text>
                    <View style={styles.pdfReadyDot} />
                </View>
            )}

            {genStatus !== 'idle' && (
                <View style={[styles.statusCard, { borderColor: STATUS_COLORS[genStatus] + '44' }]}>
                    {(genStatus === 'generating' || genStatus === 'fetching_pdf' || genStatus === 'saving') && (
                        <Animated.View style={{ opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }}>
                            <ActivityIndicator size="small" color={STATUS_COLORS[genStatus]} />
                        </Animated.View>
                    )}
                    {genStatus === 'done'  && <Icon name="check-circle" size={18} color="#10B981" />}
                    {genStatus === 'error' && <Icon name="error"        size={18} color="#EF4444" />}
                    <Text style={[styles.statusText, { color: STATUS_COLORS[genStatus] }]}>
                        {STATUS_LABELS[genStatus]}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.generateBtn, (genStatus === 'generating' || genStatus === 'fetching_pdf' || genStatus === 'saving') && { opacity: 0.6 }]}
                onPress={handleGenerate}
                disabled={genStatus === 'generating' || genStatus === 'fetching_pdf' || genStatus === 'saving'}
            >
                <Icon name="auto-awesome" size={20} color="#fff" />
                <Text style={styles.generateBtnText}>
                    {questions.length > 0 ? 'إعادة التوليد' : 'توليد الاختبار'}
                </Text>
            </TouchableOpacity>

            {questions.length > 0 && (
                <View style={styles.alreadyCard}>
                    <Icon name="quiz" size={18} color="#10B981" />
                    <Text style={styles.alreadyText}>يوجد اختبار محفوظ ({questions.length} أسئلة)</Text>
                    <TouchableOpacity onPress={() => setActiveTab('questions')}>
                        <Text style={styles.alreadyAction}>عرض</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );

    const renderQuestions = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            {questions.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="quiz" size={50} color={colors.text.muted} />
                    <Text style={styles.emptyTitle}>لا يوجد اختبار بعد</Text>
                    <TouchableOpacity onPress={() => setActiveTab('generate')}>
                        <Text style={styles.emptyAction}>توليد اختبار</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {questions.map((q, i) => (
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

                    {quizActive ? (
                        <TouchableOpacity style={styles.deactivateBtn} onPress={handleDeactivate}>
                            <Icon name="stop-circle" size={18} color="#EF4444" />
                            <Text style={styles.deactivateBtnText}>إيقاف الاختبار</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.activateBtn} onPress={handleActivate}>
                            <Icon name="send" size={18} color="#fff" />
                            <Text style={styles.activateBtnText}>إرسال الاختبار للطلاب</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}
        </ScrollView>
    );

    const renderResults = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.resultsSummaryRow}>
                <View style={[styles.resultsSummaryCard, { borderColor: '#10B98144' }]}>
                    <Text style={[styles.resultsSummaryVal, { color: '#10B981' }]}>{results.length}</Text>
                    <Text style={styles.resultsSummaryLabel}>مُسلِّم</Text>
                </View>
                <View style={[styles.resultsSummaryCard, { borderColor: '#3B82F644' }]}>
                    <Text style={[styles.resultsSummaryVal, { color: '#3B82F6' }]}>{avg}</Text>
                    <Text style={styles.resultsSummaryLabel}>المتوسط</Text>
                </View>
                <View style={[styles.resultsSummaryCard, { borderColor: '#10B98144' }]}>
                    <Text style={[styles.resultsSummaryVal, { color: '#10B981' }]}>{passCount}</Text>
                    <Text style={styles.resultsSummaryLabel}>ناجح</Text>
                </View>
                <View style={[styles.resultsSummaryCard, { borderColor: '#EF444444' }]}>
                    <Text style={[styles.resultsSummaryVal, { color: '#EF4444' }]}>{failCount}</Text>
                    <Text style={styles.resultsSummaryLabel}>راسب</Text>
                </View>
            </View>

            {!quizActive && results.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="hourglass-empty" size={50} color={colors.text.muted} />
                    <Text style={styles.emptyTitle}>لم يُسلِّم أحد بعد</Text>
                    <Text style={styles.emptySub}>أرسل الاختبار للطلاب أولاً</Text>
                </View>
            ) : (
                results
                    .sort((a, b) => b.score - a.score)
                    .map((r, i) => {
                        const c = r.score >= 7 ? '#10B981' : r.score >= 5 ? '#F59E0B' : '#EF4444';
                        return (
                            <TouchableOpacity
                                key={r.studentId}
                                style={styles.resultRow}
                                onPress={() => setSelectedResult(r)}
                            >
                                <View style={[styles.resultRank, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.resultRankText, { color: colors.primary }]}>#{i + 1}</Text>
                                </View>
                                <Text style={styles.resultName} numberOfLines={1}>{r.studentName}</Text>
                                <View style={[styles.scoreBadge, { backgroundColor: c + '20' }]}>
                                    <Text style={[styles.scoreText, { color: c }]}>{r.score}/10</Text>
                                </View>
                                <Icon name="chevron-right" size={18} color={colors.text.muted} />
                            </TouchableOpacity>
                        );
                    })
            )}
        </ScrollView>
    );

    const renderAnalytics = () => (
        <ScrollView showsVerticalScrollIndicator={false}>
            {questionDifficulty.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="bar-chart" size={50} color={colors.text.muted} />
                    <Text style={styles.emptyTitle}>لا يوجد بيانات كافية</Text>
                    <Text style={styles.emptySub}>تحتاج اختباراً ونتائج</Text>
                </View>
            ) : (
                <>
                    <Text style={styles.analyticsTitle}>نسبة الإجابة الصحيحة لكل سؤال</Text>
                    {questionDifficulty.map((d, i) => (
                        <View key={i} style={styles.analyticsCard}>
                            <View style={styles.analyticsHeader}>
                                <Text style={styles.analyticsQNum}>س{i + 1}</Text>
                                <Text style={styles.analyticsQText} numberOfLines={2}>{d.question}</Text>
                            </View>
                            <View style={styles.analyticsBarRow}>
                                <MiniBar value={d.correct} max={d.total} color={BAR_COLORS[i % BAR_COLORS.length]} />
                                <Text style={[styles.analyticsPct, { color: BAR_COLORS[i % BAR_COLORS.length] }]}>{d.pct}%</Text>
                            </View>
                            <Text style={styles.analyticsCount}>{d.correct}/{d.total} أجابوا صح</Text>
                        </View>
                    ))}

                    <View style={styles.difficultyLegend}>
                        {[
                            { label: 'سهل',    range: '>= 70%', color: '#10B981' },
                            { label: 'متوسط',  range: '40-69%', color: '#F59E0B' },
                            { label: 'صعب',    range: '< 40%',  color: '#EF4444' },
                        ].map((d) => (
                            <View key={d.label} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                                <Text style={styles.legendText}>{d.label} ({d.range})</Text>
                            </View>
                        ))}
                    </View>
                </>
            )}
        </ScrollView>
    );

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />

                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                            <Icon name="arrow-back" size={22} color={colors.text.primary} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle}>إدارة الاختبار</Text>
                            <Text style={styles.headerSub}>{session.courseName}</Text>
                        </View>
                        {results.length > 0 && (
                            <TouchableOpacity onPress={handleExport} style={styles.exportBtn}>
                                <Icon name="share" size={18} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                        {quizActive && (
                            <View style={styles.activePill}>
                                <View style={styles.activeDot} />
                                <Text style={styles.activeText}>نشط</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.tabBar}>
                        {([
                            { key: 'generate',  icon: 'auto-awesome', label: 'توليد' },
                            { key: 'questions', icon: 'quiz',          label: `أسئلة (${questions.length})` },
                            { key: 'results',   icon: 'people',        label: `نتائج (${results.length})` },
                            { key: 'analytics', icon: 'bar-chart',     label: 'تحليل' },
                        ] as const).map((t) => (
                            <TouchableOpacity
                                key={t.key}
                                style={[styles.tabItem, activeTab === t.key && styles.tabItemActive]}
                                onPress={() => setActiveTab(t.key)}
                            >
                                <Icon name={t.icon} size={15} color={activeTab === t.key ? colors.primary : colors.text.muted} />
                                <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ flex: 1 }}>
                        {activeTab === 'generate'  && renderGenerate()}
                        {activeTab === 'questions' && renderQuestions()}
                        {activeTab === 'results'   && renderResults()}
                        {activeTab === 'analytics' && renderAnalytics()}
                    </View>
                </View>
            </View>

            <Modal visible={!!selectedResult} animationType="slide" transparent onRequestClose={() => setSelectedResult(null)}>
                <View style={styles.overlay}>
                    <View style={[styles.sheet, { maxHeight: '75%' }]}>
                        <View style={styles.handle} />
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => setSelectedResult(null)} style={styles.backBtn}>
                                <Icon name="arrow-back" size={22} color={colors.text.primary} />
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.headerTitle}>{selectedResult?.studentName}</Text>
                                <Text style={styles.headerSub}>درجة: {selectedResult?.score}/10</Text>
                            </View>
                        </View>
                        <ScrollView>
                            {questions.map((q, i) => {
                                const chosen    = selectedResult?.answers?.[i] ?? -1;
                                const isCorrect = chosen === q.correctIndex;
                                return (
                                    <View key={i} style={styles.questionCard}>
                                        <View style={styles.questionCardHeader}>
                                            <Text style={styles.questionNum}>س{i + 1}</Text>
                                            <Icon name={isCorrect ? 'check-circle' : 'cancel'} size={18} color={isCorrect ? '#10B981' : '#EF4444'} />
                                        </View>
                                        <Text style={styles.questionText}>{q.question}</Text>
                                        {q.options.map((opt, j) => {
                                            const isChosen  = j === chosen;
                                            const isCorrectOpt = j === q.correctIndex;
                                            let bg = 'transparent';
                                            if (isCorrectOpt) bg = '#10B98115';
                                            if (isChosen && !isCorrect) bg = '#EF444415';
                                            return (
                                                <View key={j} style={[styles.optionRow, { backgroundColor: bg }]}>
                                                    <Text style={[
                                                        styles.optionLabel,
                                                        isCorrectOpt && styles.optionLabelCorrect,
                                                        isChosen && !isCorrect && { color: '#EF4444', fontWeight: '600' },
                                                    ]}>
                                                        {['أ', 'ب', 'ج', 'د'][j]}. {opt}
                                                    </Text>
                                                    {isChosen && <Icon name={isCorrect ? 'check-circle' : 'cancel'} size={14} color={isCorrect ? '#10B981' : '#EF4444'} />}
                                                </View>
                                            );
                                        })}
                                    </View>
                                );
                            })}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: colors.background.primary,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 24,
        maxHeight: '94%', flex: 1,
    },
    handle: { width: 40, height: 4, backgroundColor: colors.border.primary, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
    headerSub:   { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    exportBtn:   { padding: 8, borderWidth: 1, borderColor: colors.primary, borderRadius: 10 },
    activePill:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#10B98120', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    activeDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
    activeText:  { fontSize: 11, fontWeight: '800', color: '#10B981' },

    tabBar:       { flexDirection: 'row', backgroundColor: colors.background.secondary, borderRadius: 12, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: colors.border.primary },
    tabItem:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 7, borderRadius: 8 },
    tabItemActive: { backgroundColor: colors.background.primary, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3 },
    tabLabel:     { fontSize: 10, color: colors.text.muted },
    tabLabelActive: { color: colors.primary, fontWeight: '700' },

    generateHero:   { alignItems: 'center', paddingVertical: 24, gap: 10 },
    generateIconBg: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#8B5CF620', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    generateTitle:  { fontSize: 18, fontWeight: '700', color: colors.text.primary },
    generateSub:    { fontSize: 13, color: colors.text.muted, textAlign: 'center', paddingHorizontal: 20 },
    pdfBadge:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EF444412', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#EF444430' },
    pdfBadgeText:   { flex: 1, fontSize: 13, color: colors.text.primary, fontWeight: '600' },
    pdfReadyDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    statusCard:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
    statusText:     { fontSize: 14, fontWeight: '600' },
    generateBtn:    { backgroundColor: '#8B5CF6', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 },
    generateBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    alreadyCard:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#10B98112', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#10B98130' },
    alreadyText:    { flex: 1, fontSize: 14, color: '#10B981', fontWeight: '600' },
    alreadyAction:  { fontSize: 13, color: colors.primary, fontWeight: '700' },

    questionCard:       { backgroundColor: colors.background.secondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border.primary, padding: 14, marginBottom: 12 },
    questionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    questionNum:        { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 4 },
    questionText:       { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: 10, lineHeight: 20 },
    optionRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginBottom: 4 },
    optionCorrect:      { backgroundColor: '#10B98115' },
    optionLabel:        { fontSize: 13, color: colors.text.secondary, flex: 1 },
    optionLabelCorrect: { color: '#10B981', fontWeight: '600' },
    activateBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, marginTop: 8, marginBottom: 20 },
    activateBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff' },
    deactivateBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#EF4444', borderRadius: 14, paddingVertical: 14, marginTop: 8, marginBottom: 20 },
    deactivateBtnText:  { fontSize: 15, fontWeight: '700', color: '#EF4444' },

    resultsSummaryRow:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
    resultsSummaryCard:  { flex: 1, backgroundColor: colors.background.card, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1 },
    resultsSummaryVal:   { fontSize: 20, fontWeight: '800' },
    resultsSummaryLabel: { fontSize: 10, color: colors.text.muted },
    resultRow:           { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background.card, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border.primary },
    resultRank:          { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    resultRankText:      { fontSize: 12, fontWeight: '700' },
    resultName:          { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text.primary },
    scoreBadge:          { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    scoreText:           { fontSize: 15, fontWeight: '800' },

    analyticsTitle:  { fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 14 },
    analyticsCard:   { backgroundColor: colors.background.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border.primary, padding: 14, marginBottom: 10 },
    analyticsHeader: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    analyticsQNum:   { fontSize: 11, fontWeight: '800', color: colors.primary, marginTop: 2 },
    analyticsQText:  { flex: 1, fontSize: 13, color: colors.text.primary, lineHeight: 18 },
    analyticsBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    analyticsPct:    { fontSize: 14, fontWeight: '800', minWidth: 36, textAlign: 'right' },
    analyticsCount:  { fontSize: 11, color: colors.text.muted },
    difficultyLegend: { flexDirection: 'row', gap: 16, marginTop: 16, marginBottom: 20, justifyContent: 'center' },
    legendItem:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot:       { width: 8, height: 8, borderRadius: 4 },
    legendText:      { fontSize: 11, color: colors.text.muted },

    emptyState:  { alignItems: 'center', paddingVertical: 50, gap: 10 },
    emptyTitle:  { fontSize: 16, fontWeight: '700', color: colors.text.primary },
    emptySub:    { fontSize: 13, color: colors.text.muted },
    emptyAction: { fontSize: 14, color: colors.primary, fontWeight: '700', marginTop: 4 },
});
