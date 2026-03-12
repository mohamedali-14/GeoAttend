import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    ScrollView, Alert, ActivityIndicator, Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/const/colors';
import { db } from '@/firebaseConfig';
import {
    collection, query, where, getDocs, doc, getDoc,
    addDoc, updateDoc, Timestamp,
} from 'firebase/firestore';
import ButtonNav from '@/components/ButtonNav';
import { getCurrentLocation, isWithinRadius, GeoPoint } from '../professor/geoService';
import StudentQRScanner from './StudentQRScanner';
import StudentQuizScreen from './StudentQuizScreen';
import { QuizQuestion } from '../professor/types';


interface Course {
    id: string; name: string; code: string; attendanceRate: number; color: string;
}
interface ScheduleItem {
    id: string; courseId: string; courseName: string;
    startTime: string; endTime: string; location: string; day: string;
}
interface ActiveSession {
    id: string; courseId: string; courseName: string;
    startTime: string; endTime: string; timeRemaining: string;
    // Geo fields
    geoEnabled: boolean;
    centerLat: number | null;
    centerLng: number | null;
    radiusMeters: number;
}

type GeoStatus =
    | 'idle'          
    | 'inside'        
    | 'warning'       
    | 'revoked'       
    | 'no_geo';       

const GEO_GRACE_SECONDS = 5 * 60;
const CHECK_INTERVAL_MS  = 60_000; 

const ProgressBar = ({ percentage, color }: { percentage: number; color: string }) => (
    <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
    </View>
);


export default function StudentPanel() {
    const router = useRouter();
    const { userData, user } = useAuth();

    const [courses, setCourses]           = useState<Course[]>([]);
    const [todaySchedule, setTodaySchedule] = useState<ScheduleItem[]>([]);
    const [fullSchedule, setFullSchedule] = useState<ScheduleItem[]>([]);
    const [selectedDay, setSelectedDay]   = useState<string>('جميع الأيام');
    const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
    const [loading, setLoading]           = useState(true);

    // Attendance state
    const [attendanceId, setAttendanceId] = useState<string | null>(null); // Firestore doc id
    const [geoStatus, setGeoStatus]       = useState<GeoStatus>('idle');
    const [outsideSeconds, setOutsideSeconds] = useState(0); // counts up while outside
    const [lastLocation, setLastLocation] = useState<GeoPoint | null>(null);
    const [checkingGeo, setCheckingGeo]   = useState(false);

    // QR Scanner
    const [showQRScanner, setShowQRScanner] = useState(false);

    // PDF
    const [sessionPdfUrl, setSessionPdfUrl]   = useState<string | null>(null);
    const [sessionPdfName, setSessionPdfName] = useState<string | null>(null);

    // Quiz
    const [showQuiz, setShowQuiz]           = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [quizDone, setQuizDone]           = useState(false);

    // Timers
    const geoCheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const graceTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionTimer  = useRef<ReturnType<typeof setInterval> | null>(null);

    const studentName = userData?.fullName || 'طالب';

    // ── Fetch data ────────────────────────────────────────────────────────────

    useEffect(() => {
        if (user?.uid) fetchStudentData();
        return () => clearAllTimers();
    }, [user]);

    const clearAllTimers = () => {
        if (geoCheckTimer.current) clearInterval(geoCheckTimer.current);
        if (graceTimer.current) clearInterval(graceTimer.current);
        if (sessionTimer.current) clearInterval(sessionTimer.current);
    };

    const fetchStudentData = async () => {
        try {
            setLoading(true);
            const enrollQ = query(collection(db, 'enrollments'), where('studentId', '==', user!.uid));
            const enrollSnap = await getDocs(enrollQ);
            const courseIds = enrollSnap.docs.map(d => d.data().courseId);

            if (courseIds.length === 0) {
                setCourses([]); setFullSchedule([]); setLoading(false); return;
            }

            const COLORS = [colors.primary, '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];
            const coursesList: Course[] = [];

            for (let i = 0; i < courseIds.length; i++) {
                const cDoc = await getDoc(doc(db, 'courses', courseIds[i]));
                if (!cDoc.exists()) continue;
                const data = cDoc.data();
                const attQ = query(collection(db, 'attendance'),
                    where('studentId', '==', user!.uid), where('courseId', '==', courseIds[i]));
                const sessQ = query(collection(db, 'sessions'), where('courseId', '==', courseIds[i]));
                const [attSnap, sessSnap] = await Promise.all([getDocs(attQ), getDocs(sessQ)]);
                const rate = sessSnap.size > 0 ? Math.round((attSnap.size / sessSnap.size) * 100) : 0;
                coursesList.push({
                    id: courseIds[i], name: data.name, code: data.code,
                    attendanceRate: rate, color: COLORS[i % COLORS.length],
                });
            }
            setCourses(coursesList);

            // Schedules
            const schedQ = query(collection(db, 'schedules'), where('courseId', 'in', courseIds));
            const schedSnap = await getDocs(schedQ);
            const days = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday'];
            const schedList: ScheduleItem[] = schedSnap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id, courseId: data.courseId,
                    courseName: coursesList.find(c => c.id === data.courseId)?.name || 'Unknown',
                    startTime: data.startTime, endTime: data.endTime,
                    location: data.location, day: data.day,
                };
            }).sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || a.startTime.localeCompare(b.startTime));
            setFullSchedule(schedList);
            setTodaySchedule(schedList.filter(s => s.day === new Date().toLocaleDateString('en-US', { weekday: 'long' })));

            // Active session
            const sessQ2 = query(collection(db, 'sessions'), where('isActive', '==', true));
            const sessSnap2 = await getDocs(sessQ2);
            const activeDoc = sessSnap2.docs.find(d => courseIds.includes(d.data().courseId));
            if (activeDoc) {
                const d = activeDoc.data();
                const course = coursesList.find(c => c.id === d.courseId);

                const toTimeStr = (val: any): string => {
                    if (!val) return '--:--';
                    if (typeof val === 'string') return val;
                    if (val?.toDate) {
                        const date = val.toDate();
                        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    }
                    return '--:--';
                };

                // Pick up PDF and quiz
                setSessionPdfUrl(d.pdfUrl || null);
                setSessionPdfName(d.pdfName || null);
                if (d.quizActive && d.quizQuestions?.length > 0) {
                    setQuizQuestions(d.quizQuestions);
                    // Don't auto-show if already done
                }

                setActiveSession({
                    id: activeDoc.id, courseId: d.courseId,
                    courseName: course?.name || 'Unknown',
                    startTime: toTimeStr(d.startTime), endTime: toTimeStr(d.endTime),
                    timeRemaining: '90:00',
                    geoEnabled: d.geoEnabled ?? false,
                    centerLat: d.centerLat ?? null,
                    centerLng: d.centerLng ?? null,
                    radiusMeters: d.radiusMeters ?? 50,
                });

                // Check if student already attended this session
                const existingAtt = query(collection(db, 'attendance'),
                    where('sessionId', '==', activeDoc.id),
                    where('studentId', '==', user!.uid));
                const existingSnap = await getDocs(existingAtt);
                if (!existingSnap.empty) {
                    const attDoc = existingSnap.docs[0];
                    if (attDoc.data().status === 'present') {
                        setAttendanceId(attDoc.id);
                        setGeoStatus(d.geoEnabled ? 'inside' : 'no_geo');
                    } else {
                        setGeoStatus('revoked');
                    }
                }
            }

        } catch (e) {
            console.error(e);
            Alert.alert('خطأ', 'فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    // ── Session countdown ────────────────────────────────────────────────────

    useEffect(() => {
        if (!activeSession) return;
        if (sessionTimer.current) clearInterval(sessionTimer.current);
        sessionTimer.current = setInterval(() => {
            setActiveSession(prev => {
                if (!prev) return null;
                const [m, s] = prev.timeRemaining.split(':').map(Number);
                let total = m * 60 + s - 1;
                if (total < 0) { clearInterval(sessionTimer.current!); return { ...prev, timeRemaining: '00:00' }; }
                return { ...prev, timeRemaining: `${Math.floor(total/60).toString().padStart(2,'0')}:${(total%60).toString().padStart(2,'0')}` };
            });
        }, 1000);
        return () => { if (sessionTimer.current) clearInterval(sessionTimer.current); };
    }, [activeSession?.id]);

    // ── Start geo tracking after attendance registered ───────────────────────

    useEffect(() => {
        if (geoStatus === 'inside' && activeSession?.geoEnabled) {
            startGeoTracking();
        }
        return () => stopGeoTracking();
    }, [geoStatus, activeSession?.id]);

    const startGeoTracking = () => {
        stopGeoTracking();
        geoCheckTimer.current = setInterval(checkStudentLocation, CHECK_INTERVAL_MS);
    };

    const stopGeoTracking = () => {
        if (geoCheckTimer.current) { clearInterval(geoCheckTimer.current); geoCheckTimer.current = null; }
        if (graceTimer.current) { clearInterval(graceTimer.current); graceTimer.current = null; }
    };

    // ── Grace period countdown when outside ─────────────────────────────────

    useEffect(() => {
        if (geoStatus === 'warning') {
            // Start 1-second grace countdown
            graceTimer.current = setInterval(() => {
                setOutsideSeconds(prev => {
                    const next = prev + 1;
                    if (next >= GEO_GRACE_SECONDS) {
                        clearInterval(graceTimer.current!);
                        graceTimer.current = null;
                        revokeAttendance();
                    }
                    return next;
                });
            }, 1000);
        } else {
            // Student came back inside — stop grace timer, reset counter
            if (graceTimer.current) { clearInterval(graceTimer.current); graceTimer.current = null; }
            if (geoStatus === 'inside') setOutsideSeconds(0);
        }
    }, [geoStatus]);

    // ── Check location once ──────────────────────────────────────────────────

    const checkStudentLocation = useCallback(async () => {
        if (!activeSession || !activeSession.geoEnabled) return;
        if (!activeSession.centerLat || !activeSession.centerLng) return;
        if (geoStatus === 'revoked') return;

        setCheckingGeo(true);
        const loc = await getCurrentLocation();
        setCheckingGeo(false);

        if (!loc) return; // silent fail — no punishment for GPS errors

        setLastLocation(loc);
        const inside = isWithinRadius(loc, { latitude: activeSession.centerLat, longitude: activeSession.centerLng }, activeSession.radiusMeters);

        if (inside) {
            setGeoStatus('inside');
        } else {
            setGeoStatus(prev => prev === 'inside' || prev === 'idle' ? 'warning' : prev);
        }
    }, [activeSession, geoStatus]);

    // ── Revoke attendance in Firestore ───────────────────────────────────────

    const revokeAttendance = async () => {
        setGeoStatus('revoked');
        stopGeoTracking();
        if (attendanceId) {
            try {
                await updateDoc(doc(db, 'attendance', attendanceId), {
                    status: 'absent',
                    revokedAt: Timestamp.now(),
                    revokeReason: 'left_zone',
                });
            } catch (e) { console.error('revokeAttendance error:', e); }
        }
        Alert.alert(
            '❌ تم إلغاء حضورك',
            'لقد خرجت من نطاق القاعة لأكثر من 5 دقائق. تم تسجيلك غائباً.',
            [{ text: 'حسناً' }]
        );
    };

    // ── Register attendance ──────────────────────────────────────────────────

    const handleAttendance = async () => {
        if (!activeSession || !user?.uid) return;

        // Geo check before registering
        if (activeSession.geoEnabled) {
            if (!activeSession.centerLat || !activeSession.centerLng) {
                Alert.alert('خطأ', 'لم يتم تحديد نطاق الجلسة بعد.');
                return;
            }
            setCheckingGeo(true);
            const loc = await getCurrentLocation();
            setCheckingGeo(false);

            if (!loc) {
                Alert.alert('خطأ في الموقع', 'تعذّر الحصول على موقعك. تحقق من إذن الموقع.');
                return;
            }
            setLastLocation(loc);
            const inside = isWithinRadius(loc, { latitude: activeSession.centerLat, longitude: activeSession.centerLng }, activeSession.radiusMeters);
            if (!inside) {
                Alert.alert(
                    '📍 خارج النطاق',
                    `أنت خارج نطاق القاعة (${activeSession.radiusMeters} متر). انتقل إلى القاعة ثم أعد المحاولة.`
                );
                return;
            }
        }

        try {
            const ref = await addDoc(collection(db, 'attendance'), {
                studentId: user.uid,
                studentName,
                courseId: activeSession.courseId,
                sessionId: activeSession.id,
                timestamp: Timestamp.now(),
                status: 'present',
            });
            setAttendanceId(ref.id);
            setGeoStatus(activeSession.geoEnabled ? 'inside' : 'no_geo');
            Alert.alert('✅ تم تسجيل حضورك', activeSession.geoEnabled
                ? 'سيتم التحقق من موقعك كل دقيقة طوال الجلسة.'
                : 'تم تسجيل حضورك بنجاح.');
            // Start geo tracking if needed
            if (activeSession.geoEnabled) startGeoTracking();
        } catch (e) {
            Alert.alert('خطأ', 'فشل في تسجيل الحضور');
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    const getFilteredSchedule = () =>
        selectedDay === 'جميع الأيام' ? fullSchedule : fullSchedule.filter(s => s.day === selectedDay);

    const getArabicDay = (day: string) => ({
        Saturday:'السبت', Sunday:'الأحد', Monday:'الإثنين',
        Tuesday:'الثلاثاء', Wednesday:'الأربعاء', Thursday:'الخميس',
    }[day] ?? day);

    const graceRemaining = GEO_GRACE_SECONDS - outsideSeconds;
    const graceMin = Math.floor(graceRemaining / 60).toString().padStart(2, '0');
    const graceSec = (graceRemaining % 60).toString().padStart(2, '0');

    const daysOfWeek = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday'];

    // ── Geo status badge inside session card ─────────────────────────────────

    const renderGeoBadge = () => {
        if (!activeSession?.geoEnabled) return null;
        const configs: Record<GeoStatus, { icon: string; color: string; label: string } | null> = {
            idle:    null,
            no_geo:  null,
            inside:  { icon: 'location-on',  color: '#10B981', label: 'داخل النطاق ✓' },
            warning: { icon: 'location-off', color: '#F59E0B', label: `خارج النطاق — ${graceMin}:${graceSec} متبقٍ` },
            revoked: { icon: 'gps-off',      color: '#EF4444', label: 'تم إلغاء الحضور' },
        };
        const cfg = configs[geoStatus];
        if (!cfg) return null;
        return (
            <View style={[styles.geoBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '44' }]}>
                <Icon name={cfg.icon} size={15} color={cfg.color} />
                <Text style={[styles.geoBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                {checkingGeo && <ActivityIndicator size="small" color={cfg.color} style={{ marginLeft: 6 }} />}
            </View>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>مرحباً 👋</Text>
                        <Text style={styles.userName}>{studentName}</Text>
                        <Text style={styles.userDepartment}>{userData?.department || 'قسم'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/ProfileScreen')}>
                        <Icon name="school" size={50} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Active session card */}
                {activeSession ? (
                    <View style={styles.activeSessionCard}>
                        <View style={styles.sessionHeader}>
                            <Icon name="notifications-active" size={24} color={colors.primary} />
                            <Text style={styles.sessionTitle}>محاضرة نشطة الآن</Text>
                            {activeSession.geoEnabled && (
                                <View style={styles.gpsIndicator}>
                                    <Icon name="gps-fixed" size={14} color="#10B981" />
                                    <Text style={styles.gpsIndicatorText}>GPS</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.sessionCourse}>{activeSession.courseName}</Text>
                        <Text style={styles.sessionTime}>{activeSession.startTime} - {activeSession.endTime}</Text>

                        <View style={styles.timerContainer}>
                            <Icon name="timer" size={20} color={colors.error} />
                            <Text style={styles.timerText}>الوقت المتبقي: {activeSession.timeRemaining}</Text>
                        </View>

                        {/* Geo status badge (shown after attendance registered) */}
                        {renderGeoBadge()}

                        {/* Radius info if geo enabled */}
                        {activeSession.geoEnabled && geoStatus === 'idle' && (
                            <View style={styles.geoRangeInfo}>
                                <Icon name="radar" size={16} color="#3B82F6" />
                                <Text style={styles.geoRangeText}>
                                    نطاق الحضور: {activeSession.radiusMeters} متر من موقع الدكتور
                                </Text>
                            </View>
                        )}

                        {/* Warning progress bar */}
                        {geoStatus === 'warning' && (
                            <View style={styles.graceBarWrap}>
                                <View style={styles.graceBarBg}>
                                    <View style={[styles.graceBarFill, {
                                        width: `${(outsideSeconds / GEO_GRACE_SECONDS) * 100}%`
                                    }]} />
                                </View>
                                <Text style={styles.graceBarLabel}>
                                    ⚠️ عد إلى النطاق خلال {graceMin}:{graceSec} أو سيُلغى حضورك
                                </Text>
                            </View>
                        )}

                        {/* Action button */}
                        {geoStatus === 'idle' && (
                            <TouchableOpacity
                                style={[styles.attendButton, checkingGeo && { opacity: 0.6 }]}
                                onPress={handleAttendance}
                                disabled={checkingGeo}>
                                {checkingGeo
                                    ? <><ActivityIndicator size="small" color="#fff" /><Text style={styles.attendButtonText}> جاري التحقق من موقعك...</Text></>
                                    : <Text style={styles.attendButtonText}>
                                        {activeSession.geoEnabled ? '📍 سجل حضوري (GPS)' : '✅ سجل حضوري'}
                                    </Text>
                                }
                            </TouchableOpacity>
                        )}

                        {geoStatus === 'revoked' && (
                            <View style={styles.revokedBanner}>
                                <Icon name="block" size={20} color="#EF4444" />
                                <Text style={styles.revokedText}>تم إلغاء حضورك نهائياً — لا يمكن إعادة التسجيل</Text>
                            </View>
                        )}

                        {(geoStatus === 'inside' || geoStatus === 'no_geo') && (
                            <View style={styles.presentBanner}>
                                <Icon name="check-circle" size={20} color="#10B981" />
                                <Text style={styles.presentText}>تم تسجيل حضورك ✓</Text>
                            </View>
                        )}

                        {/* PDF download banner */}
                        {sessionPdfUrl && (geoStatus === 'inside' || geoStatus === 'no_geo') && (
                            <TouchableOpacity style={styles.pdfBanner}
                                onPress={() => Linking.openURL(sessionPdfUrl)}>
                                <Icon name="picture-as-pdf" size={20} color="#EF4444" />
                                <Text style={styles.pdfBannerText} numberOfLines={1}>
                                    {sessionPdfName || 'ملف المحاضرة'}
                                </Text>
                                <Icon name="download" size={18} color="#EF4444" />
                            </TouchableOpacity>
                        )}

                        {/* Quiz available banner */}
                        {quizQuestions.length > 0 && !quizDone &&
                            (geoStatus === 'inside' || geoStatus === 'no_geo') && (
                            <TouchableOpacity style={styles.quizBanner}
                                onPress={() => setShowQuiz(true)}>
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

                {/* Attendance rates */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📊 نسب الحضور</Text>
                    {courses.length === 0 ? (
                        <Text style={styles.emptyText}>لا توجد مواد مسجل فيها</Text>
                    ) : courses.map(item => (
                        <View key={item.id} style={styles.statItem}>
                            <View style={styles.statRow}>
                                <Text style={styles.statCourse}>{item.name}</Text>
                                <Text style={styles.statPercentage}>{item.attendanceRate}%</Text>
                            </View>
                            <ProgressBar percentage={item.attendanceRate} color={item.color} />
                        </View>
                    ))}
                </View>

                {/* Schedule */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📅 جدول المحاضرات</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysContainer}>
                        {['جميع الأيام', ...daysOfWeek].map(day => (
                            <TouchableOpacity key={day}
                                style={[styles.dayChip, selectedDay === day && styles.dayChipActive]}
                                onPress={() => setSelectedDay(day)}>
                                <Text style={[styles.dayChipText, selectedDay === day && styles.dayChipTextActive]}>
                                    {day === 'جميع الأيام' ? day : getArabicDay(day)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    {getFilteredSchedule().length === 0 ? (
                        <Text style={styles.emptyText}>لا توجد محاضرات</Text>
                    ) : getFilteredSchedule().map(item => (
                        <View key={item.id} style={styles.scheduleItem}>
                            <View style={styles.scheduleTimeContainer}>
                                <Icon name="access-time" size={18} color={colors.primary} />
                                <Text style={styles.scheduleTime}>{item.startTime}</Text>
                            </View>
                            <View style={styles.scheduleInfo}>
                                <Text style={styles.scheduleCourse}>{item.courseName}</Text>
                                <Text style={styles.scheduleLocation}>{item.location}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Quick actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/student/StudentCoursesScreen')}>
                        <Icon name="menu-book" size={28} color={colors.primary} />
                        <Text style={styles.actionText}>المواد</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <Icon name="history" size={28} color={colors.primary} />
                        <Text style={styles.actionText}>سجل الحضور</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, !activeSession && { opacity: 0.4 }]}
                        onPress={() => activeSession ? setShowQRScanner(true) : Alert.alert('تنبيه', 'لا توجد جلسة نشطة حالياً.')}
                    >
                        <Icon name="qr-code-scanner" size={28} color={colors.primary} />
                        <Text style={styles.actionText}>Scan QR</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
            {/* QR Scanner */}
            {activeSession && (
                <StudentQRScanner
                    visible={showQRScanner}
                    onClose={() => setShowQRScanner(false)}
                    studentId={user?.uid || ''}
                    studentName={studentName}
                    onSuccess={(attId, sessionId, courseId) => {
                        setAttendanceId(attId);
                        setGeoStatus(activeSession.geoEnabled ? 'inside' : 'no_geo');
                        if (activeSession.geoEnabled) startGeoTracking();
                    }}
                />
            )}

            {/* Quiz */}
            {activeSession && (
                <StudentQuizScreen
                    visible={showQuiz}
                    questions={quizQuestions}
                    sessionId={activeSession.id}
                    courseId={activeSession.courseId}
                    studentId={user?.uid || ''}
                    studentName={studentName}
                    onClose={() => { setShowQuiz(false); setQuizDone(true); }}
                />
            )}

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

    // Session card
    activeSessionCard: {
        backgroundColor: colors.background.secondary, borderRadius: 20, padding: 20,
        marginBottom: 24, borderWidth: 1, borderColor: colors.border.primary,
    },
    noActiveCard: { borderColor: colors.border.primary, backgroundColor: colors.background.secondary },
    sessionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    sessionTitle: { fontSize: 16, fontWeight: '600', color: colors.primary, flex: 1 },
    sessionCourse: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
    sessionTime: { fontSize: 14, color: colors.text.muted, marginTop: 4, marginBottom: 8 },
    timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    timerText: { fontSize: 16, color: colors.error, fontWeight: '600' },

    // GPS indicator
    gpsIndicator: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#10B98120', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    },
    gpsIndicatorText: { fontSize: 11, fontWeight: '700', color: '#10B981' },

    // Geo badge
    geoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
        marginBottom: 12,
    },
    geoBadgeText: { fontSize: 13, fontWeight: '600', flex: 1 },

    // Range info
    geoRangeInfo: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#3B82F611', borderRadius: 10, padding: 10, marginBottom: 12,
    },
    geoRangeText: { fontSize: 12, color: '#3B82F6' },

    // Grace bar
    graceBarWrap: { marginBottom: 12 },
    graceBarBg: { height: 6, backgroundColor: '#F59E0B33', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
    graceBarFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
    graceBarLabel: { fontSize: 12, color: '#F59E0B', fontWeight: '600', textAlign: 'center' },

    // Attendance buttons
    attendButton: {
        backgroundColor: colors.primary, paddingVertical: 14,
        borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    attendButtonText: { color: colors.white, fontSize: 17, fontWeight: 'bold' },

    revokedBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#EF444420', borderRadius: 10, padding: 12,
    },
    revokedText: { fontSize: 13, color: '#EF4444', fontWeight: '600', flex: 1 },

    presentBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#10B98120', borderRadius: 10, padding: 12,
    },
    presentText: { fontSize: 14, color: '#10B981', fontWeight: '700' },

    noActiveText: { fontSize: 14, color: colors.text.muted, textAlign: 'center', marginTop: 8 },

    // Section
    sectionCard: {
        backgroundColor: colors.background.secondary, borderRadius: 16, padding: 20,
        marginBottom: 20, borderWidth: 1, borderColor: colors.border.primary,
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary, marginBottom: 16 },
    emptyText: { fontSize: 14, color: colors.text.muted, textAlign: 'center', padding: 20 },

    // Stats
    statItem: { marginBottom: 16 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    statCourse: { fontSize: 16, color: colors.text.primary },
    statPercentage: { fontSize: 16, fontWeight: '600', color: colors.primary },
    progressBarContainer: { height: 8, backgroundColor: colors.border.primary, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },

    // Schedule
    daysContainer: { flexDirection: 'row', marginBottom: 16 },
    dayChip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        backgroundColor: colors.background.primary, marginRight: 8,
        borderWidth: 1, borderColor: colors.border.primary,
    },
    dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    dayChipText: { fontSize: 14, color: colors.text.muted },
    dayChipTextActive: { color: colors.white },
    scheduleItem: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border.primary,
    },
    scheduleTimeContainer: { flexDirection: 'row', alignItems: 'center', width: 80, gap: 4 },
    scheduleTime: { fontSize: 15, color: colors.primary, fontWeight: '500' },
    scheduleInfo: { flex: 1, marginLeft: 12 },
    scheduleCourse: { fontSize: 16, color: colors.text.primary },
    scheduleLocation: { fontSize: 14, color: colors.text.muted },

    // Quick actions
    quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
    actionButton: {
        alignItems: 'center', backgroundColor: colors.background.secondary, padding: 16,
        borderRadius: 16, width: '30%', borderWidth: 1, borderColor: colors.border.primary,
    },
    actionText: { fontSize: 13, color: colors.text.primary, marginTop: 8, textAlign: 'center' },

    // PDF banner
    pdfBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#EF444415', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12, marginTop: 10,
        borderWidth: 1, borderColor: '#EF444430',
    },
    pdfBannerText: { flex: 1, fontSize: 13, color: '#EF4444', fontWeight: '600' },

    // Quiz banner
    quizBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#8B5CF615', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12, marginTop: 10,
        borderWidth: 1, borderColor: '#8B5CF630',
    },
    quizBannerText: { flex: 1, fontSize: 13, color: '#8B5CF6', fontWeight: '700' },
});
