import React, { useState } from 'react';
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

export default function StudentQuizScreen({
    visible, questions, sessionId, courseId, studentId, studentName, onClose,
}: Props) {
    const [answers, setAnswers]     = useState<(number | null)[]>(Array(questions.length).fill(null));
    const [phase, setPhase]         = useState<Phase>('quiz');
    const [score, setScore]         = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const selectAnswer = (qIdx: number, optIdx: number) => {
        if (phase === 'result') return;
        setAnswers(prev => {
            const next = [...prev];
            next[qIdx] = optIdx;
            return next;
        });
    };

    const handleSubmit = async () => {
        const unanswered = answers.filter(a => a === null).length;
        if (unanswered > 0) {
            Alert.alert('تنبيه', `لديك ${unanswered} سؤال/أسئلة لم تُجب عليها. هل تريد الإرسال؟`, [
                { text: 'راجع الأسئلة', style: 'cancel' },
                { text: 'إرسال', onPress: () => submitAnswers() },
            ]);
            return;
        }
        submitAnswers();
    };

    const submitAnswers = async () => {
        try {
            setSubmitting(true);
            // Calculate score out of 10
            const correct = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
            const finalScore = Math.round((correct / questions.length) * 10);
            setScore(finalScore);

            // Save to Firestore
            await addDoc(collection(db, 'quizResults'), {
                studentId, studentName, sessionId, courseId,
                answers,
                score: finalScore,
                correctCount: correct,
                totalQuestions: questions.length,
                submittedAt: Timestamp.now(),
            });

            setPhase('result');
        } catch (e: any) {
            Alert.alert('خطأ', 'فشل في إرسال الإجابات: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const answeredCount = answers.filter(a => a !== null).length;
    const scoreColor = score >= 7 ? '#10B981' : score >= 5 ? '#F59E0B' : '#EF4444';
    const scoreLabel = score >= 7 ? 'ممتاز 🎉' : score >= 5 ? 'جيد 👍' : 'تحتاج مراجعة 📚';

    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.root}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>اختبار سريع 📝</Text>
                    {phase === 'result' && (
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Icon name="close" size={24} color={colors.text.muted} />
                        </TouchableOpacity>
                    )}
                </View>

                {phase === 'quiz' ? (
                    <>
                        {/* Progress bar */}
                        <View style={styles.progressWrap}>
                            <View style={styles.progressBg}>
                                <View style={[styles.progressFill, {
                                    width: `${(answeredCount / questions.length) * 100}%`
                                }]} />
                            </View>
                            <Text style={styles.progressText}>
                                {answeredCount}/{questions.length} أسئلة
                            </Text>
                        </View>

                        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                            {questions.map((q, qi) => (
                                <View key={qi} style={styles.questionCard}>
                                    {/* Question header */}
                                    <View style={styles.qHeader}>
                                        <View style={[styles.qNumBadge,
                                            answers[qi] !== null && { backgroundColor: colors.primary }]}>
                                            <Text style={[styles.qNum,
                                                answers[qi] !== null && { color: '#fff' }]}>
                                                {qi + 1}
                                            </Text>
                                        </View>
                                        <Text style={styles.qText}>{q.question}</Text>
                                    </View>

                                    {/* Options */}
                                    {q.options.map((opt, oi) => (
                                        <TouchableOpacity key={oi}
                                            style={[
                                                styles.optionBtn,
                                                answers[qi] === oi && styles.optionSelected,
                                            ]}
                                            onPress={() => selectAnswer(qi, oi)}>
                                            <View style={[
                                                styles.optionCircle,
                                                answers[qi] === oi && styles.optionCircleSelected,
                                            ]}>
                                                {answers[qi] === oi &&
                                                    <Icon name="check" size={14} color="#fff" />}
                                            </View>
                                            <Text style={[
                                                styles.optionText,
                                                answers[qi] === oi && styles.optionTextSelected,
                                            ]}>
                                                {['أ','ب','ج','د'][oi]}. {opt}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))}
                            <View style={{ height: 100 }} />
                        </ScrollView>

                        <View style={styles.submitWrap}>
                            <TouchableOpacity
                                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                                onPress={handleSubmit}
                                disabled={submitting}>
                                {submitting
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <>
                                        <Icon name="send" size={20} color="#fff" />
                                        <Text style={styles.submitBtnText}>إرسال الإجابات</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
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
                                            <View style={[styles.reviewIcon,
                                                { backgroundColor: isRight ? '#10B98120' : '#EF444420' }]}>
                                                <Icon
                                                    name={isRight ? 'check-circle' : 'cancel'}
                                                    size={18}
                                                    color={isRight ? '#10B981' : '#EF4444'}
                                                />
                                            </View>
                                            <Text style={styles.reviewQText} numberOfLines={2}>{q.question}</Text>
                                        </View>

                                        {chosen !== null && chosen !== correct && (
                                            <View style={styles.reviewAnswerRow}>
                                                <Icon name="close" size={14} color="#EF4444" />
                                                <Text style={styles.reviewWrong}>
                                                    إجابتك: {q.options[chosen]}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Correct answer */}
                                        <View style={styles.reviewAnswerRow}>
                                            <Icon name="check" size={14} color="#10B981" />
                                            <Text style={styles.reviewCorrect}>
                                                الصواب: {q.options[correct]}
                                            </Text>
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
                )}
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

    // Progress
    progressWrap: { paddingHorizontal: 20, paddingVertical: 12 },
    progressBg: { height: 6, backgroundColor: colors.border.primary, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
    progressText: { fontSize: 12, color: colors.text.muted, textAlign: 'right' },

    scroll: { flex: 1, paddingHorizontal: 20 },

    // Question card
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

    // Options
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

    // Submit
    submitWrap: {
        padding: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        borderTopWidth: 1, borderTopColor: colors.border.primary,
    },
    submitBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
    },
    submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    // Result
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

    // Review
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
