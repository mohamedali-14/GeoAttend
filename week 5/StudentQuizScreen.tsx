import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Modal, Alert, ActivityIndicator, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../const/colors';
import { db } from '../../firebaseConfig';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { QuizQuestion } from '../professor/types';

interface Props {
    visible: boolean;
    questions: QuizQuestion[];
    sessionId: string;
    courseId: string;
    studentId: string;
    studentName: string;
    onClose: () => void;
}

type Phase = 'quiz' | 'result';

const TIME_PER_QUESTION = 30;

export default function StudentQuizScreen({
    visible, questions, sessionId, courseId, studentId, studentName, onClose,
}: Props) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
    const [phase, setPhase] = useState<Phase>('quiz');
    const [score, setScore] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
    const timerRef = useRef<number| null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        if (phase !== 'quiz') return;
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    if (currentIndex + 1 < questions.length) {
                        setCurrentIndex(prevIndex => prevIndex + 1);
                        return TIME_PER_QUESTION;
                    } else {
                        handleSubmit();
                        return 0;
                    }
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentIndex, phase, questions.length]);

    useEffect(() => {
        if (phase === 'quiz') {
            setTimeLeft(TIME_PER_QUESTION);
        }
    }, [currentIndex, phase]);

    const selectAnswer = (optionIndex: number) => {
        if (phase === 'result') return;
        const newAnswers = [...answers];
        newAnswers[currentIndex] = optionIndex;
        setAnswers(newAnswers);
    };

    const goPrev = () => {
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
    };

    const goNext = () => {
        if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
    };

    const jumpToQuestion = (index: number) => {
        setCurrentIndex(index);
    };

    const handleSubmit = async () => {
        const unanswered = answers.filter(a => a === null).length;
        if (unanswered > 0) {
            Alert.alert(
                'تأكيد الإرسال',
                `لديك ${unanswered} سؤال غير مجاب عنه. هل تريد المتابعة؟`,
                [
                    { text: 'رجوع', style: 'cancel' },
                    { text: 'إرسال', onPress: () => submitAnswers() },
                ]
            );
            return;
        }
        submitAnswers();
    };

    const submitAnswers = async () => {
        try {
            setSubmitting(true);
            const correct = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
            const finalScore = Math.round((correct / questions.length) * 10);
            setScore(finalScore);

            await addDoc(collection(db, 'quizResults'), {
                studentId, studentName, sessionId, courseId,
                answers,
                score: finalScore,
                correctCount: correct,
                totalQuestions: questions.length,
                submittedAt: Timestamp.now(),
            });

            setPhase('result');
            if (timerRef.current) clearInterval(timerRef.current);
        } catch (e: any) {
            Alert.alert('خطأ', 'فشل في إرسال الإجابات: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const answeredCount = answers.filter(a => a !== null).length;
    const progressPercent = (answeredCount / questions.length) * 100;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const timerColor = timeLeft <= 5 ? '#EF4444' : colors.primary;
    const scoreColor = score >= 7 ? '#10B981' : score >= 5 ? '#F59E0B' : '#EF4444';
    const scoreLabel = score >= 7 ? 'ممتاز 🎉' : score >= 5 ? 'جيد 👍' : 'تحتاج مراجعة 📚';

    if (!visible) return null;

    if (phase === 'quiz') {
        const currentQuestion = questions[currentIndex];
        const currentAnswer = answers[currentIndex];

        return (
            <Modal visible={visible} animationType="slide" transparent={false}>
                <View style={styles.root}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>اختبار سريع 📝</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Icon name="close" size={24} color={colors.text.muted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.progressWrap}>
                        <View style={styles.progressBg}>
                            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                        </View>
                        <View style={styles.progressRow}>
                            <Text style={styles.progressText}>{answeredCount}/{questions.length} أسئلة</Text>
                            <View style={styles.timerContainer}>
                                <Icon name="timer" size={16} color={timerColor} />
                                <Text style={[styles.timerText, { color: timerColor }]}>{formatTime(timeLeft)}</Text>
                            </View>
                        </View>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.paletteScroll}>
                        <View style={styles.palette}>
                            {questions.map((_, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.paletteItem,
                                        answers[idx] !== null && styles.answeredItem,
                                        currentIndex === idx && styles.currentItem,
                                    ]}
                                    onPress={() => jumpToQuestion(idx)}
                                >
                                    <Text style={[styles.paletteText, currentIndex === idx && styles.currentItemText]}>{idx + 1}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.questionCard}>
                            <View style={styles.qHeader}>
                                <View style={[styles.qNumBadge, currentAnswer !== null && { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.qNum, currentAnswer !== null && { color: '#fff' }]}>{currentIndex + 1}</Text>
                                </View>
                                <Text style={styles.qText}>{currentQuestion.question}</Text>
                            </View>

                            {currentQuestion.options.map((opt, oi) => (
                                <TouchableOpacity
                                    key={oi}
                                    style={[styles.optionBtn, currentAnswer === oi && styles.optionSelected]}
                                    onPress={() => selectAnswer(oi)}
                                >
                                    <View style={[styles.optionCircle, currentAnswer === oi && styles.optionCircleSelected]}>
                                        {currentAnswer === oi && <Icon name="check" size={14} color="#fff" />}
                                    </View>
                                    <Text style={[styles.optionText, currentAnswer === oi && styles.optionTextSelected]}>
                                        {['أ', 'ب', 'ج', 'د'][oi]}. {opt}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={{ height: 20 }} />
                    </ScrollView>

                    <View style={styles.navContainer}>
                        <View style={styles.navButtons}>
                            <TouchableOpacity
                                style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
                                onPress={goPrev}
                                disabled={currentIndex === 0}
                            >
                                <Icon name="chevron-right" size={24} color={currentIndex === 0 ? colors.text.muted : colors.primary} />
                                <Text style={[styles.navBtnText, currentIndex === 0 && { color: colors.text.muted }]}>السابق</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.navBtn, currentIndex === questions.length - 1 && styles.navBtnDisabled]}
                                onPress={goNext}
                                disabled={currentIndex === questions.length - 1}
                            >
                                <Text style={[styles.navBtnText, currentIndex === questions.length - 1 && { color: colors.text.muted }]}>التالي</Text>
                                <Icon name="chevron-left" size={24} color={currentIndex === questions.length - 1 ? colors.text.muted : colors.primary} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Icon name="send" size={20} color="#fff" />
                                    <Text style={styles.submitBtnText}>إرسال الإجابات</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} animationType="slide" transparent={false}>
            <View style={styles.root}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>نتيجتك 🏆</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Icon name="close" size={24} color={colors.text.muted} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.resultContainer}>
                    <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                        <Text style={[styles.scoreNum, { color: scoreColor }]}>{score}</Text>
                        <Text style={styles.scoreMax}>/10</Text>
                    </View>
                    <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
                    <Text style={styles.scoreSubLabel}>
                        أجبت على {answers.filter((a, i) => a === questions[i]?.correctIndex).length} من {questions.length} أسئلة بشكل صحيح
                    </Text>

                    <View style={styles.reviewSection}>
                        <Text style={styles.reviewTitle}>مراجعة الإجابات</Text>
                        {questions.map((q, qi) => {
                            const chosen = answers[qi];
                            const correct = q.correctIndex;
                            const isRight = chosen === correct;
                            return (
                                <View key={qi} style={styles.reviewCard}>
                                    <View style={styles.reviewQHeader}>
                                        <View style={[styles.reviewIcon, { backgroundColor: isRight ? '#10B98120' : '#EF444420' }]}>
                                            <Icon name={isRight ? 'check-circle' : 'cancel'} size={18} color={isRight ? '#10B981' : '#EF4444'} />
                                        </View>
                                        <Text style={styles.reviewQText} numberOfLines={2}>{q.question}</Text>
                                    </View>

                                    {chosen !== null && chosen !== correct && (
                                        <View style={styles.reviewAnswerRow}>
                                            <Icon name="close" size={14} color="#EF4444" />
                                            <Text style={styles.reviewWrong}>إجابتك: {q.options[chosen]}</Text>
                                        </View>
                                    )}

                                    <View style={styles.reviewAnswerRow}>
                                        <Icon name="check" size={14} color="#10B981" />
                                        <Text style={styles.reviewCorrect}>الصواب: {q.options[correct]}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                        <Text style={styles.doneBtnText}>إغلاق</Text>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background.primary, paddingTop: Platform.OS === 'ios' ? 50 : 30 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: colors.border.primary,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text.primary },
    closeBtn: { padding: 4 },

    progressWrap: { paddingHorizontal: 20, paddingVertical: 12 },
    progressBg: { height: 6, backgroundColor: colors.border.primary, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    progressText: { fontSize: 12, color: colors.text.muted },
    timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timerText: { fontSize: 14, fontWeight: '700' },

    paletteScroll: { maxHeight: 50, marginBottom: 8 },
    palette: { flexDirection: 'row', paddingHorizontal: 20, gap: 8 },
    paletteItem: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.background.secondary,
        borderWidth: 1, borderColor: colors.border.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    answeredItem: { backgroundColor: colors.primary, borderColor: colors.primary },
    currentItem: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primary + '20' },
    paletteText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
    currentItemText: { color: colors.primary, fontWeight: '800' },

    scroll: { flex: 1, paddingHorizontal: 20 },
    questionCard: {
        backgroundColor: colors.background.secondary, borderRadius: 16,
        borderWidth: 1, borderColor: colors.border.primary,
        padding: 16, marginBottom: 14,
    },
    qHeader: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    qNumBadge: {
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: colors.border.primary,
        justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    qNum: { fontSize: 13, fontWeight: '800', color: colors.text.muted },
    qText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text.primary, lineHeight: 22 },

    optionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
        borderWidth: 1, borderColor: colors.border.primary,
        marginBottom: 8,
    },
    optionSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
    optionCircle: {
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2, borderColor: colors.border.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    optionCircleSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionText: { flex: 1, fontSize: 14, color: colors.text.secondary },
    optionTextSelected: { color: colors.primary, fontWeight: '600' },

    navContainer: {
        padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        borderTopWidth: 1, borderTopColor: colors.border.primary,
        backgroundColor: colors.background.primary,
    },
    navButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12 },
    navBtnDisabled: { opacity: 0.5 },
    navBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },

    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
    },
    submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    resultContainer: { alignItems: 'center', padding: 24 },
    scoreCircle: {
        width: 140, height: 140, borderRadius: 70,
        borderWidth: 6, alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, marginTop: 20,
        flexDirection: 'row',
    },
    scoreNum: { fontSize: 52, fontWeight: '900' },
    scoreMax: { fontSize: 22, color: colors.text.muted, fontWeight: '600', marginLeft: 2 },
    scoreLabel: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
    scoreSubLabel: { fontSize: 14, color: colors.text.muted, textAlign: 'center', marginBottom: 32 },

    reviewSection: { width: '100%', marginBottom: 24 },
    reviewTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 12, textAlign: 'right' },
    reviewCard: {
        backgroundColor: colors.background.secondary, borderRadius: 14,
        borderWidth: 1, borderColor: colors.border.primary,
        padding: 14, marginBottom: 10,
    },
    reviewQHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
    reviewIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    reviewQText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.text.primary, lineHeight: 19 },
    reviewAnswerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    reviewWrong: { fontSize: 13, color: '#EF4444', flex: 1 },
    reviewCorrect: { fontSize: 13, color: '#10B981', flex: 1, fontWeight: '600' },

    doneBtn: {
        backgroundColor: colors.primary, paddingHorizontal: 40, paddingVertical: 14,
        borderRadius: 14, marginTop: 8,
    },
    doneBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});