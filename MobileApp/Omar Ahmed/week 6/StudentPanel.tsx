import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../const/colors';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import ButtonNav from '../../components/ButtonNav';
import { getCurrentLocation, isWithinRadius } from '../professor/geoService';
import StudentQRScanner from './StudentQRScanner';
import StudentQuizScreen from './StudentQuizScreen';
import LectureJoinScreen from './LectureJoinScreen';
import ManualEntryScreen from './ManualEntryScreen';
import ScanHistoryScreen from './ScanHistoryScreen';
import { QuizQuestion } from '../professor/types';
import { registerForPushNotifications, subscribeToSessionStartAlerts, sendLocalNotification } from '../professor/notificationService';
import { subscribeToRandomCheck, respondToCheck, RandomCheck } from '../professor/randomCheckService';
import SelfieCapture from '../professor/SelfieCapture';

interface Course { id: string; name: string; code: string; attendanceRate: number; color: string; }
interface ScheduleItem { id: string; courseId: string; courseName: string; startTime: string; endTime: string; location: string; day: string; }
interface ActiveSession {
    id: string; courseId: string; courseName: string; startTime: string; endTime: string; timeRemaining: string;
    geoEnabled: boolean; centerLat: number | null; centerLng: number | null; radiusMeters: number;
    randomCheckEnabled: boolean; selfieEnabled: boolean;
    pdfUrl: string | null; pdfName: string | null; quizActive: boolean; quizQuestions: QuizQuestion[];
}
type GeoStatus = 'idle' | 'inside' | 'warning' | 'revoked' | 'no_geo';
const GEO_GRACE_SECONDS = 5 * 60;
const CHECK_INTERVAL_MS = 60_000;
const ProgressBar = ({ percentage, color }: { percentage: number; color: string }) => (
    <View style={styles.progressBarContainer}><View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} /></View>
);

export default function StudentPanel() {
    const router = useRouter();
    const { userData, user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [fullSchedule, setFullSchedule] = useState<ScheduleItem[]>([]);
    const [selectedDay, setSelectedDay] = useState('جميع الأيام');
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [attendanceId, setAttendanceId] = useState<string | null>(null);
    const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
    const [outsideSeconds, setOutsideSeconds] = useState(0);
    const [checkingGeo, setCheckingGeo] = useState(false);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [showLectureJoin, setShowLectureJoin] = useState(false);
    const [scannedSessionId, setScannedSessionId] = useState('');
    const [scannedCourseId, setScannedCourseId] = useState('');
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizDone, setQuizDone] = useState(false);
    const [randomCheck, setRandomCheck] = useState<RandomCheck | null>(null);
    const [checkSecondsLeft, setCheckSecondsLeft] = useState(0);
    const [showSelfie, setShowSelfie] = useState(false);
    const [selfieSessionId, setSelfieSessionId] = useState('');
    const geoCheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const graceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const checkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const notifiedRef = useRef<Set<string>>(new Set());
    const activeSessionRef = useRef<ActiveSession | null>(null);
    const sessionUnsubRef = useRef<(() => void) | null>(null);
    const studentName = userData?.fullName || 'طالب';

    useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

    useEffect(() => {
        if (!user?.uid) return;
        registerForPushNotifications(user.uid);
        fetchStudentData(true);
        return () => { clearAllTimers(); if (sessionUnsubRef.current) sessionUnsubRef.current(); };
    }, [user?.uid]);

    useEffect(() => {
        if (!courses.length) return;
        return subscribeToSessionStartAlerts(courses.map(c => c.id), notifiedRef);
    }, [courses]);

    useEffect(() => {
        if (!activeSession?.id) return;
        const unsub = subscribeToRandomCheck(activeSession.id, (check) => {
            if (check) {
                const isNew = randomCheck?.id !== check.id;
                if (isNew) {
                    sendLocalNotification('تحقق عشوائي!', 'أكد حضورك خلال دقيقتين');
                    const left = Math.max(0, Math.round((check.deadline - Date.now()) / 1000));
                    setCheckSecondsLeft(left);
                    if (checkTimerRef.current) clearInterval(checkTimerRef.current);
                    checkTimerRef.current = setInterval(() => {
                        setCheckSecondsLeft(p => { if (p <= 1) { clearInterval(checkTimerRef.current!); return 0; } return p - 1; });
                    }, 1000);
                }
                setRandomCheck(check);
            } else {
                setRandomCheck(null);
                if (checkTimerRef.current) clearInterval(checkTimerRef.current);
            }
        });
        return () => { unsub(); if (checkTimerRef.current) clearInterval(checkTimerRef.current); };
    }, [activeSession?.id]);

    const clearAllTimers = () => {
        [geoCheckTimer, graceTimer, sessionTimer, checkTimerRef].forEach(r => { if (r.current) { clearInterval(r.current); r.current = null; } });
    };

    const fetchStudentData = async (showFullLoading = false) => {
        if (!user?.uid) return;
        try {
            if (showFullLoading) setLoading(true);
            else setRefreshing(true);
            const enrollSnap = await getDocs(query(collection(db, 'enrollments'), where('studentId', '==', user.uid)));
            const courseIds = enrollSnap.docs.map(d => d.data().courseId);
            if (!courseIds.length) { setCourses([]); setFullSchedule([]); return; }
            const COLORS = [colors.primary, '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];
            const coursesList: Course[] = [];
            for (let i = 0; i < courseIds.length; i++) {
                const cDoc = await getDoc(doc(db, 'courses', courseIds[i]));
                if (!cDoc.exists()) continue;
                const data = cDoc.data();
                const [attSnap, sessSnap] = await Promise.all([
                    getDocs(query(collection(db, 'attendance'), where('studentId', '==', user.uid), where('courseId', '==', courseIds[i]))),
                    getDocs(query(collection(db, 'sessions'), where('courseId', '==', courseIds[i]))),
                ]);
                const rate = sessSnap.size > 0 ? Math.round((attSnap.size / sessSnap.size) * 100) : 0;
                coursesList.push({ id: courseIds[i], name: data.name, code: data.code, attendanceRate: rate, color: COLORS[i % COLORS.length] });
            }
            setCourses(coursesList);
            const schedSnap = await getDocs(query(collection(db, 'schedules'), where('courseId', 'in', courseIds)));
            const days = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday'];
            setFullSchedule(schedSnap.docs.map(d => {
                const data = d.data();
                return { id: d.id, courseId: data.courseId, courseName: coursesList.find(c => c.id === data.courseId)?.name || '', startTime: data.startTime, endTime: data.endTime, location: data.location, day: data.day };
            }).sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || a.startTime.localeCompare(b.startTime)));
            const sessSnap2 = await getDocs(query(collection(db, 'sessions'), where('isActive', '==', true)));
            const activeDoc = sessSnap2.docs.find(d => courseIds.includes(d.data().courseId));
            if (activeDoc) {
                if (sessionUnsubRef.current) sessionUnsubRef.current();
                sessionUnsubRef.current = startSessionListener(activeDoc.id, coursesList, user.uid);
            }
        } catch (e) { console.error(e); Alert.alert('خطأ', 'فشل في تحميل البيانات'); }
        finally { setLoading(false); setRefreshing(false); }
    };

    const startSessionListener = (sessionId: string, coursesList: Course[], uid: string) => {
        return onSnapshot(doc(db, 'sessions', sessionId), async (snap) => {
            if (!snap.exists() || !snap.data().isActive) { setActiveSession(null); return; }
            const d = snap.data();
            const course = coursesList.find(c => c.id === d.courseId);
            const toTimeStr = (val: any): string => {
                if (!val) return '--:--';
                if (typeof val === 'string') return val;
                if (val?.toDate) return val.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                return '--:--';
            };
            setActiveSession(prev => ({
                id: sessionId,
                courseId: d.courseId || '',
                courseName: course?.name || d.courseName || '',
                startTime: toTimeStr(d.startTime),
                endTime: toTimeStr(d.endTime),
                timeRemaining: prev?.id === sessionId ? (prev?.timeRemaining || '90:00') : '90:00',
                geoEnabled: d.geoEnabled ?? false,
                centerLat: d.centerLat ?? null,
                centerLng: d.centerLng ?? null,
                radiusMeters: d.radiusMeters ?? 50,
                randomCheckEnabled: d.randomCheckEnabled ?? false,
                selfieEnabled: d.selfieEnabled ?? false,
                pdfUrl: d.pdfUrl ?? null,
                pdfName: d.pdfName ?? null,
                quizActive: d.quizActive ?? false,
                quizQuestions: d.quizQuestions ?? [],
            }));
            const attSnap = await getDocs(query(collection(db, 'attendance'), where('sessionId', '==', sessionId), where('studentId', '==', uid)));
            if (!attSnap.empty) {
                const attData = attSnap.docs[0].data();
                setAttendanceId(attSnap.docs[0].id);
                setGeoStatus(attData.status === 'present' ? (d.geoEnabled ? 'inside' : 'no_geo') : 'revoked');
            }
        });
    };

    useEffect(() => {
        if (!activeSession?.id) return;
        if (sessionTimer.current) clearInterval(sessionTimer.current);
        sessionTimer.current = setInterval(() => {
            setActiveSession(prev => {
                if (!prev) return null;
                const [m, s] = prev.timeRemaining.split(':').map(Number);
                let total = m * 60 + s - 10;
                if (total < 0) total = 0;
                const minutes = Math.floor(total / 60);
                const seconds = total % 60;
                return {
                    ...prev,
                    timeRemaining: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                };
            });
        }, 10000);
        return () => { if (sessionTimer.current) clearInterval(sessionTimer.current); };
    }, [activeSession?.id]);

    useEffect(() => {
        if (geoStatus === 'inside' && activeSession?.geoEnabled) startGeoTracking();
        return () => stopGeoTracking();
    }, [geoStatus, activeSession?.id]);

    const startGeoTracking = () => { stopGeoTracking(); geoCheckTimer.current = setInterval(checkStudentLocation, CHECK_INTERVAL_MS); };
    const stopGeoTracking = () => {
        if (geoCheckTimer.current) { clearInterval(geoCheckTimer.current); geoCheckTimer.current = null; }
        if (graceTimer.current) { clearInterval(graceTimer.current); graceTimer.current = null; }
    };

    useEffect(() => {
        if (geoStatus === 'warning') {
            graceTimer.current = setInterval(() => {
                setOutsideSeconds(prev => {
                    const next = prev + 1;
                    if (next >= GEO_GRACE_SECONDS) { clearInterval(graceTimer.current!); graceTimer.current = null; revokeAttendance(); }
                    return next;
                });
            }, 1000);
        } else {
            if (graceTimer.current) { clearInterval(graceTimer.current); graceTimer.current = null; }
            if (geoStatus === 'inside') setOutsideSeconds(0);
        }
    }, [geoStatus]);

    const checkStudentLocation = useCallback(async () => {
        const sess = activeSessionRef.current;
        if (!sess?.geoEnabled || !sess.centerLat || !sess.centerLng || geoStatus === 'revoked') return;
        setCheckingGeo(true);
        const loc = await getCurrentLocation(geoStatus === 'inside');
        setCheckingGeo(false);
        if (!loc) return;
        const inside = isWithinRadius(loc, { latitude: sess.centerLat, longitude: sess.centerLng }, sess.radiusMeters);
        if (inside) setGeoStatus('inside');
        else setGeoStatus(prev => (prev === 'inside' || prev === 'idle' ? 'warning' : prev));
    }, [geoStatus]);

    const revokeAttendance = async () => {
        setGeoStatus('revoked'); stopGeoTracking();
        if (attendanceId) { try { await updateDoc(doc(db, 'attendance', attendanceId), { status: 'absent', revokedAt: Timestamp.now(), revokeReason: 'left_zone' }); } catch (e) { console.error(e); } }
        Alert.alert('تم إلغاء حضورك', 'خرجت من النطاق لأكثر من 5 دقائق.', [{ text: 'حسناً' }]);
    };

    const handleAttendance = async () => {
        const sess = activeSession;
        if (!sess || !user?.uid) return;
        if (sess.geoEnabled) {
            if (!sess.centerLat || !sess.centerLng) { Alert.alert('خطأ', 'لم يتم تحديد نطاق الجلسة.'); return; }
            setCheckingGeo(true);
            const loc = await getCurrentLocation(false);
            setCheckingGeo(false);
            if (!loc) { Alert.alert('خطأ', 'تعذّر الحصول على موقعك.'); return; }
            if (!isWithinRadius(loc, { latitude: sess.centerLat, longitude: sess.centerLng }, sess.radiusMeters)) {
                Alert.alert('خارج النطاق', `أنت خارج نطاق القاعة (${sess.radiusMeters} متر).`); return;
            }
        }
        try {
            const ref = await addDoc(collection(db, 'attendance'), { studentId: user.uid, studentName, courseId: sess.courseId, sessionId: sess.id, timestamp: Timestamp.now(), status: 'present' });
            setAttendanceId(ref.id);
            setGeoStatus(sess.geoEnabled ? 'inside' : 'no_geo');
            if (sess.geoEnabled) startGeoTracking();
            if (sess.selfieEnabled) { setSelfieSessionId(sess.id); setShowSelfie(true); }
            else Alert.alert('تم تسجيل حضورك', sess.geoEnabled ? 'سيتم التحقق من موقعك كل دقيقة.' : 'تم التسجيل بنجاح.');
        } catch { Alert.alert('خطأ', 'فشل في تسجيل الحضور'); }
    };

    const getFilteredSchedule = () => selectedDay === 'جميع الأيام' ? fullSchedule : fullSchedule.filter(s => s.day === selectedDay);
    const getArabicDay = (day: string) => ({ Saturday:'السبت', Sunday:'الأحد', Monday:'الإثنين', Tuesday:'الثلاثاء', Wednesday:'الأربعاء', Thursday:'الخميس' }[day] ?? day);
    const graceRemaining = GEO_GRACE_SECONDS - outsideSeconds;
    const graceMin = Math.floor(graceRemaining / 60).toString().padStart(2, '0');
    const graceSec = (graceRemaining % 60).toString().padStart(2, '0');
    const daysOfWeek = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday'];
    const attended = geoStatus === 'inside' || geoStatus === 'no_geo';

    const renderGeoBadge = () => {
        if (!activeSession?.geoEnabled) return null;
        const cfg = { inside: { icon:'location-on', color:'#10B981', label:'داخل النطاق ✓' }, warning: { icon:'location-off', color:'#F59E0B', label:`خارج النطاق — ${graceMin}:${graceSec} متبقٍ` }, revoked: { icon:'gps-off', color:'#EF4444', label:'تم إلغاء الحضور' } }[geoStatus as 'inside'|'warning'|'revoked'];
        if (!cfg) return null;
        return (
            <View style={[styles.geoBadge, { backgroundColor: cfg.color+'20', borderColor: cfg.color+'44' }]}>
                <Icon name={cfg.icon} size={15} color={cfg.color} />
                <Text style={[styles.geoBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                {checkingGeo && <ActivityIndicator size="small" color={cfg.color} style={{ marginLeft: 6 }} />}
            </View>
        );
    };

    if (loading) return (<View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>مرحباً 👋</Text>
                        <Text style={styles.userName}>{studentName}</Text>
                        <Text style={styles.userDepartment}>{userData?.department || 'قسم'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity onPress={() => fetchStudentData(false)} disabled={refreshing}>
                            {refreshing ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon name="refresh" size={28} color={colors.primary} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/ProfileScreen')}>
                            <Icon name="school" size={50} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {activeSession ? (
                    <View style={styles.activeSessionCard}>
                        <View style={styles.sessionHeader}>
                            <Icon name="notifications-active" size={24} color={colors.primary} />
                            <Text style={styles.sessionTitle}>محاضرة نشطة الآن</Text>
                        </View>
                        <View style={styles.featurePillsRow}>
                            {activeSession.geoEnabled && (<View style={[styles.featurePill, { backgroundColor: '#10B98115' }]}><Icon name="my-location" size={12} color="#10B981" /><Text style={[styles.featurePillText, { color: '#10B981' }]}>GPS</Text></View>)}
                            {activeSession.randomCheckEnabled && (<View style={[styles.featurePill, { backgroundColor: '#8B5CF615' }]}><Icon name="shuffle" size={12} color="#8B5CF6" /><Text style={[styles.featurePillText, { color: '#8B5CF6' }]}>تحقق عشوائي</Text></View>)}
                            {activeSession.selfieEnabled && (<View style={[styles.featurePill, { backgroundColor: '#F59E0B15' }]}><Icon name="face" size={12} color="#F59E0B" /><Text style={[styles.featurePillText, { color: '#F59E0B' }]}>سيلفي</Text></View>)}
                        </View>
                        <Text style={styles.sessionCourse}>{activeSession.courseName}</Text>
                        <Text style={styles.sessionTime}>{activeSession.startTime} - {activeSession.endTime}</Text>
                        <View style={styles.timerContainer}><Icon name="timer" size={20} color={colors.error} /><Text style={styles.timerText}>الوقت المتبقي: {activeSession.timeRemaining}</Text></View>
                        {renderGeoBadge()}
                        {activeSession.geoEnabled && geoStatus === 'idle' && (<View style={styles.infoBox}><Icon name="radar" size={15} color="#3B82F6" /><Text style={styles.infoBoxText}>نطاق الحضور: {activeSession.radiusMeters} متر</Text></View>)}
                        {geoStatus === 'warning' && (<View style={styles.graceBarWrap}><View style={styles.graceBarBg}><View style={[styles.graceBarFill, { width: `${(outsideSeconds / GEO_GRACE_SECONDS) * 100}%` }]} /></View><Text style={styles.graceBarLabel}>عد إلى النطاق خلال {graceMin}:{graceSec}</Text></View>)}

                        {randomCheck && (
                            <View style={styles.randomCheckBanner}>
                                <View style={styles.randomCheckTop}>
                                    <Icon name="warning" size={20} color="#F59E0B" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.randomCheckTitle}>تحقق عشوائي من الدكتور!</Text>
                                        <Text style={styles.randomCheckSub}>أكد وجودك داخل القاعة الآن</Text>
                                    </View>
                                </View>
                                <View style={styles.randomCheckBottom}>
                                    <View style={styles.randomCheckCountdown}>
                                        <Text style={styles.randomCheckNum}>{checkSecondsLeft}</Text>
                                        <Text style={styles.randomCheckNumLabel}>ثانية</Text>
                                    </View>
                                    <TouchableOpacity style={styles.randomCheckConfirmBtn}
                                        onPress={async () => {
                                            const ok = await respondToCheck(activeSession.id, randomCheck.id, user!.uid, studentName, randomCheck.deadline);
                                            if (checkTimerRef.current) clearInterval(checkTimerRef.current);
                                            setRandomCheck(null);
                                            Alert.alert(ok ? 'تم التأكيد' : 'انتهى الوقت', ok ? 'تم تسجيل وجودك' : 'انتهت مدة التحقق');
                                        }}>
                                        <Icon name="check-circle" size={18} color="#fff" />
                                        <Text style={styles.randomCheckConfirmText}>أكد حضوري</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {geoStatus === 'idle' && (
                            <TouchableOpacity style={[styles.attendButton, checkingGeo && { opacity: 0.6 }]} onPress={handleAttendance} disabled={checkingGeo}>
                                {checkingGeo ? (<><ActivityIndicator size="small" color="#fff" /><Text style={styles.attendButtonText}> جاري التحقق...</Text></>) : (
                                    <Text style={styles.attendButtonText}>{activeSession.geoEnabled ? '📍 ' : '✅ '}سجل حضوري{activeSession.selfieEnabled ? ' + سيلفي 📸' : ''}</Text>
                                )}
                            </TouchableOpacity>
                        )}
                        {geoStatus === 'revoked' && (<View style={styles.revokedBanner}><Icon name="block" size={20} color="#EF4444" /><Text style={styles.revokedText}>تم إلغاء حضورك نهائياً</Text></View>)}
                        {attended && (<View style={styles.presentBanner}><Icon name="check-circle" size={20} color="#10B981" /><Text style={styles.presentText}>تم تسجيل حضورك</Text></View>)}
                        {activeSession.pdfUrl && attended && (
                            <TouchableOpacity style={styles.pdfBanner} onPress={() => Linking.openURL(activeSession.pdfUrl!)}>
                                <Icon name="picture-as-pdf" size={20} color="#EF4444" />
                                <Text style={styles.pdfBannerText} numberOfLines={1}>{activeSession.pdfName || 'ملف المحاضرة'}</Text>
                                <Icon name="download" size={18} color="#EF4444" />
                            </TouchableOpacity>
                        )}
                        {activeSession.quizActive && (activeSession.quizQuestions?.length ?? 0) > 0 && !quizDone && attended && (
                            <TouchableOpacity style={styles.quizBanner} onPress={() => setShowQuiz(true)}>
                                <Icon name="quiz" size={20} color="#8B5CF6" />
                                <Text style={styles.quizBannerText}>اختبار متاح — ابدأ الحل!</Text>
                                <Icon name="arrow-forward-ios" size={14} color="#8B5CF6" />
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={[styles.sectionCard, styles.noActiveCard]}>
                        <View style={styles.sessionHeader}>
                            <Icon name="notifications-none" size={24} color={colors.text.muted} />
                            <Text style={[styles.sessionTitle, { color: colors.text.muted }]}>لا توجد محاضرات نشطة</Text>
                        </View>
                        <Text style={styles.noActiveText}>يمكنك متابعة جدول المحاضرات لمعرفة مواعيدك القادمة</Text>
                    </View>
                )}

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>نسب الحضور</Text>
                    {!courses.length ? <Text style={styles.emptyText}>لا توجد مواد مسجل فيها</Text> : courses.map(item => (
                        <View key={item.id} style={styles.statItem}>
                            <View style={styles.statRow}><Text style={styles.statCourse}>{item.name}</Text><Text style={styles.statPercentage}>{item.attendanceRate}%</Text></View>
                            <ProgressBar percentage={item.attendanceRate} color={item.color} />
                        </View>
                    ))}
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>جدول المحاضرات</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
                        {['جميع الأيام', ...daysOfWeek].map(day => (
                            <TouchableOpacity key={day} style={[styles.dayChip, selectedDay === day && styles.dayChipActive]} onPress={() => setSelectedDay(day)}>
                                <Text style={[styles.dayChipText, selectedDay === day && styles.dayChipTextActive]}>{day === 'جميع الأيام' ? day : getArabicDay(day)}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    {!getFilteredSchedule().length ? <Text style={styles.emptyText}>لا توجد محاضرات</Text> : getFilteredSchedule().map(item => (
                        <View key={item.id} style={styles.scheduleItem}>
                            <View style={styles.scheduleTimeContainer}><Icon name="access-time" size={18} color={colors.primary} /><Text style={styles.scheduleTime}>{item.startTime}</Text></View>
                            <View style={styles.scheduleInfo}><Text style={styles.scheduleCourse}>{item.courseName}</Text><Text style={styles.scheduleLocation}>{item.location}</Text></View>
                        </View>
                    ))}
                </View>

                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/student/StudentCoursesScreen')}><Icon name="menu-book" size={28} color={colors.primary} /><Text style={styles.actionText}>المواد</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowHistory(true)}><Icon name="history" size={28} color={colors.primary} /><Text style={styles.actionText}>السجل</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, !activeSession && { opacity: 0.4 }]} onPress={() => activeSession ? setShowQRScanner(true) : Alert.alert('تنبيه', 'لا توجد جلسة نشطة.')}><Icon name="qr-code-scanner" size={28} color={colors.primary} /><Text style={styles.actionText}>Scan QR</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowManualEntry(true)}><Icon name="edit" size={28} color={colors.primary} /><Text style={styles.actionText}>إدخال يدوي</Text></TouchableOpacity>
                </View>
            </ScrollView>

            {activeSession && (<StudentQRScanner visible={showQRScanner} onClose={() => setShowQRScanner(false)} studentId={user?.uid || ''} studentName={studentName} onScanned={(sessionId, courseId) => { setScannedSessionId(sessionId); setScannedCourseId(courseId); setShowQRScanner(false); setShowLectureJoin(true); }} />)}
            <LectureJoinScreen visible={showLectureJoin} onClose={() => setShowLectureJoin(false)} sessionId={scannedSessionId} courseId={scannedCourseId} studentId={user?.uid || ''} studentName={studentName}
                onSuccess={(attId) => {
                    setAttendanceId(attId);
                    setGeoStatus(activeSessionRef.current?.geoEnabled ? 'inside' : 'no_geo');
                    if (activeSessionRef.current?.geoEnabled) startGeoTracking();
                    setShowLectureJoin(false);
                    if (activeSessionRef.current?.selfieEnabled) { setSelfieSessionId(scannedSessionId); setShowSelfie(true); }
                    else Alert.alert('تم تسجيل حضورك', 'تم التسجيل بنجاح.');
                }} />
            <ManualEntryScreen visible={showManualEntry} onClose={() => setShowManualEntry(false)} studentId={user?.uid || ''} studentName={studentName} onSuccess={(sessionId, courseId) => { setScannedSessionId(sessionId); setScannedCourseId(courseId); setShowManualEntry(false); setShowLectureJoin(true); }} />
            <ScanHistoryScreen visible={showHistory} onClose={() => setShowHistory(false)} onSelect={(sessionId, courseId) => { setScannedSessionId(sessionId); setScannedCourseId(courseId); setShowHistory(false); setShowLectureJoin(true); }} />
            {activeSession && (<StudentQuizScreen visible={showQuiz} questions={activeSession.quizQuestions} sessionId={activeSession.id} courseId={activeSession.courseId} studentId={user?.uid || ''} studentName={studentName} onClose={() => { setShowQuiz(false); setQuizDone(true); }} />)}
            {showSelfie && (<SelfieCapture studentId={user!.uid} sessionId={selfieSessionId} onDone={(url) => { setShowSelfie(false); Alert.alert('تم التسجيل', url ? 'تم حفظ حضورك والسيلفي.' : 'تم تسجيل حضورك.'); }} />)}
            <ButtonNav role="student" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary, paddingTop: 30 },
    scrollContent: { paddingBottom: 100, paddingHorizontal: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background.primary },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 24 },
    greeting: { fontSize: 16, color: colors.text.muted },
    userName: { fontSize: 24, fontWeight: 'bold', color: colors.text.primary },
    userDepartment: { fontSize: 14, color: colors.primary, marginTop: 4 },
    activeSessionCard: { backgroundColor: colors.background.secondary, borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border.primary },
    noActiveCard: { backgroundColor: colors.background.secondary },
    sessionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
    sessionTitle: { fontSize: 16, fontWeight: '600', color: colors.primary, flex: 1 },
    featurePillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    featurePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    featurePillText: { fontSize: 11, fontWeight: '700' },
    sessionCourse: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
    sessionTime: { fontSize: 14, color: colors.text.muted, marginTop: 4, marginBottom: 8 },
    timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    timerText: { fontSize: 16, color: colors.error, fontWeight: '600' },
    geoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
    geoBadgeText: { fontSize: 13, fontWeight: '600', flex: 1 },
    infoBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#3B82F611', borderRadius: 10, padding: 10, marginBottom: 12 },
    infoBoxText: { fontSize: 12, color: '#3B82F6' },
    graceBarWrap: { marginBottom: 12 },
    graceBarBg: { height: 6, backgroundColor: '#F59E0B33', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
    graceBarFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
    graceBarLabel: { fontSize: 12, color: '#F59E0B', fontWeight: '600', textAlign: 'center' },
    randomCheckBanner: { backgroundColor: '#F59E0B12', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#F59E0B50', gap: 12 },
    randomCheckTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    randomCheckTitle: { fontSize: 14, fontWeight: '800', color: '#F59E0B' },
    randomCheckSub: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
    randomCheckBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    randomCheckCountdown: { flex: 1, alignItems: 'center', backgroundColor: '#F59E0B20', borderRadius: 10, paddingVertical: 10 },
    randomCheckNum: { fontSize: 30, fontWeight: '900', color: '#F59E0B' },
    randomCheckNumLabel: { fontSize: 11, color: '#F59E0B', fontWeight: '600' },
    randomCheckConfirmBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 14 },
    randomCheckConfirmText: { fontSize: 15, fontWeight: '800', color: '#fff' },
    attendButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    attendButtonText: { color: colors.white, fontSize: 17, fontWeight: 'bold' },
    revokedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EF444420', borderRadius: 10, padding: 12 },
    revokedText: { fontSize: 13, color: '#EF4444', fontWeight: '600', flex: 1 },
    presentBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10B98120', borderRadius: 10, padding: 12 },
    presentText: { fontSize: 14, color: '#10B981', fontWeight: '700' },
    noActiveText: { fontSize: 14, color: colors.text.muted, textAlign: 'center', marginTop: 8 },
    sectionCard: { backgroundColor: colors.background.secondary, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.border.primary },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 16 },
    emptyText: { fontSize: 14, color: colors.text.muted, textAlign: 'center', padding: 20 },
    statItem: { marginBottom: 16 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    statCourse: { fontSize: 16, color: colors.text.primary },
    statPercentage: { fontSize: 16, fontWeight: '600', color: colors.primary },
    progressBarContainer: { height: 8, backgroundColor: colors.border.primary, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    daysContainer: { flexDirection: 'row', marginBottom: 16 },
    dayChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background.primary, marginRight: 8, borderWidth: 1, borderColor: colors.border.primary },
    dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dayChipText: { fontSize: 14, color: colors.text.muted },
    dayChipTextActive: { color: colors.white },
    scheduleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.primary },
    scheduleTimeContainer: { flexDirection: 'row', alignItems: 'center', width: 80, gap: 4 },
    scheduleTime: { fontSize: 15, color: colors.primary, fontWeight: '500' },
    scheduleInfo: { flex: 1, marginLeft: 12 },
    scheduleCourse: { fontSize: 16, color: colors.text.primary },
    scheduleLocation: { fontSize: 14, color: colors.text.muted },
    quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 8 },
    actionButton: { alignItems: 'center', backgroundColor: colors.background.secondary, padding: 12, borderRadius: 16, flex: 1, borderWidth: 1, borderColor: colors.border.primary },
    actionText: { fontSize: 12, color: colors.text.primary, marginTop: 8, textAlign: 'center' },
    pdfBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EF444415', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10, borderWidth: 1, borderColor: '#EF444430' },
    pdfBannerText: { flex: 1, fontSize: 13, color: '#EF4444', fontWeight: '600' },
    quizBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#8B5CF615', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10, borderWidth: 1, borderColor: '#8B5CF630' },
    quizBannerText: { flex: 1, fontSize: 13, color: '#8B5CF6', fontWeight: '700' },
});