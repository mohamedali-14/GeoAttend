import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    LogOut, MapPin, Settings, UserCircle, Calendar, ChevronRight,
    CheckCircle, XCircle, Clock, BookOpen, UserPlus, UserMinus,
    AlertTriangle, Navigation, Radio, Bell, ClipboardList, Home,
    FileQuestion, TrendingUp, Award, Trophy, BarChart2, History,
    Zap, Star, QrCode,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMockData } from "../../context/MockDataContext";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import { useQuiz } from "../../context/QuizContext";
import ProfileSettingsModal from "../shared/ProfileSettingsModal";
import ConnectionStatus from "../../components/ConnectionStatus";
import {
    QRScannerModal, CourseSessionList, QuizAlertBanner,
    AttendanceTrendChart, QuizPerformanceChart, BadgesPanel,
    AttendanceHistoryList, QuizHistoryPanel,
    DAYS, DAY_COLOR, type Tab, calcDuration, haversine,
    getLocalSessions, didStudentAttend,
} from "./components";
import type { Day } from "./components/studentUtils";

// ── useStudentStats hook ───────────────────────────────────────────────────────
function useStudentStats(userId: string, myCourses: any[], users: any[], submissions: any[]) {
    return useMemo(() => {
        const localSessions = getLocalSessions(users);
        const myCourseSessions = localSessions.filter(s =>
            myCourses.some(c => c.id === s.courseId) && !s.isActive
        );
        const totalLectures = myCourseSessions.length;
        const attended = myCourseSessions.filter(s => didStudentAttend(s, userId)).length;
        const overallPct = totalLectures > 0 ? Math.round((attended / totalLectures) * 100) : null;
        const avgQuizScore = submissions.length > 0
            ? Math.round(submissions.reduce((s, q) => s + q.score, 0) / submissions.length)
            : null;
        const streak = (() => {
            const times = myCourseSessions
                .filter(s => didStudentAttend(s, userId) && s.startTime)
                .map(s => new Date(s.startTime).getTime())
                .filter(t => !isNaN(t))
                .sort((a, b) => b - a);
            let str = 0;
            for (let i = 0; i < times.length - 1; i++) {
                if ((times[i] - times[i + 1]) / (1000 * 60 * 60 * 24) <= 7) str++; else break;
            }
            return times.length > 0 ? str + 1 : 0;
        })();
        const perfectCourses = myCourses.filter(c => {
            const sessions = myCourseSessions.filter(s => s.courseId === c.id);
            return sessions.length > 0 && sessions.every(s => didStudentAttend(s, userId));
        }).length;
        return {
            totalLectures, attended, overallPct, avgQuizScore,
            streak, perfectCourses,
            totalCourses: myCourses.length,
            totalQuizzes: submissions.length
        };
    }, [userId, myCourses, users, submissions]);
}

export default function StudentDashboard() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { courses, schedules, enrollments, users, enrollStudent, unenrollStudent } = useMockData();
    const { emitAttendance, studentLeave, attendanceEvents } = useSocket();
    const { sessions: quizSessions, submissions: allSubmissions, getStudentSubmissions } = useQuiz();
    const toast = useToast();

    const mySubmissions = useMemo(() => user ? getStudentSubmissions(user.id) : [], [user, getStudentSubmissions, allSubmissions]);
    const myCourseIds = enrollments.filter(e => e.studentId === user?.id).map(e => e.courseId);
    const myCourses = courses.filter(c => myCourseIds.includes(c.id));
    const stats = useStudentStats(user?.id || "", myCourses, users, mySubmissions);

    const [showSettings, setShowSettings] = useState(false);
    const [tab, setTab] = useState<Tab>("home");
    const [activeDay, setActiveDay] = useState<Day>("Sunday");
    const [activeSession, setActiveSession] = useState<any>(null);
    const [hasMarked, setHasMarked] = useState(false);
    const [distanceWarning, setDistanceWarning] = useState(false);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [selAttCourse, setSelAttCourse] = useState<string | null>(null);
    const geoInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const mySchedules = schedules.filter(s => myCourseIds.includes(s.courseId));
    const daySchedules = mySchedules.filter(s => s.day === activeDay).sort((a, b) => a.startTime.localeCompare(b.startTime));

    const localSessions = useMemo(() => getLocalSessions(users), [users, attendanceEvents]);
    const myLocalSessions = useMemo(() =>
            localSessions.filter(s => myCourseIds.includes(s.courseId) && !s.isActive),
        [localSessions, myCourseIds]
    );
    const totalSessions = myLocalSessions.length;
    const totalAttended = myLocalSessions.filter(s => didStudentAttend(s, user?.id || "")).length;
    const overallPct = totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : null;

    const getStats = (courseId: string) => {
        const courseSessions = localSessions.filter(s => s.courseId === courseId && !s.isActive);
        const total = courseSessions.length;
        const present = courseSessions.filter(s => didStudentAttend(s, user?.id || "")).length;
        return { total, present, pct: total > 0 ? Math.round((present / total) * 100) : null };
    };

    useEffect(() => {
        const check = () => {
            try {
                const raw = localStorage.getItem("geo_active_session");
                const session = raw ? JSON.parse(raw) : null;
                setActiveSession(session);
                if (!session) { setHasMarked(false); setDistanceWarning(false); }
            } catch { }
        };
        check();
        const iv = setInterval(check, 2000);
        window.addEventListener("storage", check);
        return () => { clearInterval(iv); window.removeEventListener("storage", check); };
    }, []);

    useEffect(() => {
        if (!user) return;
        let lastKickTs = 0;
        const checkKick = () => {
            try {
                const raw = localStorage.getItem("geo_rt_kick");
                if (!raw) return;
                const kick = JSON.parse(raw);
                const kickTs = kick._ts || 0;
                if (kickTs <= lastKickTs || kick.studentId !== user.id) return;
                lastKickTs = kickTs;
                setHasMarked(false);
                setDistanceWarning(false);
                setActiveSession(null);
                toast.error("You have been removed from the session by the admin.");
            } catch { }
        };
        const iv = setInterval(checkKick, 2000);
        return () => clearInterval(iv);
    }, [user]);

    useEffect(() => {
        if (!hasMarked || !activeSession?.geoEnabled || !activeSession?.centerLat) {
            if (geoInterval.current) { clearInterval(geoInterval.current); geoInterval.current = null; }
            setDistanceWarning(false);
            return;
        }
        const checkGeo = () => {
            navigator.geolocation.getCurrentPosition((pos) => {
                const dist = haversine(pos.coords.latitude, pos.coords.longitude, activeSession.centerLat, activeSession.centerLng);
                const outside = dist > activeSession.radiusMeters;
                setDistanceWarning(outside);
                if (outside) toast.warning("You left the lecture area!");
            });
        };
        geoInterval.current = setInterval(checkGeo, 15000);
        return () => { if (geoInterval.current) clearInterval(geoInterval.current); };
    }, [hasMarked, activeSession]);

    const handleMarkAttendance = () => {
        if (!activeSession || !user) return;
        if (!myCourseIds.includes(activeSession.courseId)) {
            toast.error("You are not enrolled in this course!");
            return;
        }
        const doMark = (geoStatus: "inside" | "no_geo") => {
            emitAttendance({
                sessionId: activeSession.id,
                studentId: user.id,
                studentName: `${user.firstName} ${user.lastName}`,
                courseId: activeSession.courseId,
                timestamp: new Date().toISOString(),
                geoStatus
            });
            setHasMarked(true);
            toast.success("Attendance recorded!");
        };
        if (!activeSession.geoEnabled || !activeSession.centerLat) { doMark("no_geo"); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const dist = haversine(pos.coords.latitude, pos.coords.longitude, activeSession.centerLat, activeSession.centerLng);
                if (dist > activeSession.radiusMeters) {
                    toast.error(`You are ${Math.round(dist)}m away. Must be within ${activeSession.radiusMeters}m.`);
                    return;
                }
                doMark("inside");
            },
            () => toast.error("Could not get your location.")
        );
    };

    const handleLeaveSession = () => {
        if (!activeSession || !user || !hasMarked) return;
        studentLeave(activeSession.id, user.id);
        setHasMarked(false);
        setDistanceWarning(false);
        toast.info("You have left the session");
    };

    const handleQRScanned = (data: string) => {
        setShowQRScanner(false);
        if (!data.startsWith("GEOATTEND|")) { toast.error("Invalid QR Code"); return; }
        if (activeSession?.id === data.split("|")[1]) handleMarkAttendance();
        else toast.error("QR code does not match the active session");
    };

    const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "home", label: "Home", icon: <Home className="w-5 h-5" /> },
        { id: "courses", label: "Browse Courses", icon: <BookOpen className="w-5 h-5" /> },
        { id: "schedule", label: "My Schedule", icon: <Calendar className="w-5 h-5" /> },
        { id: "attendance", label: "Attendance", icon: <ClipboardList className="w-5 h-5" /> },
        { id: "history", label: "History", icon: <History className="w-5 h-5" /> },
        { id: "stats", label: "My Stats", icon: <BarChart2 className="w-5 h-5" /> },
        { id: "achievements", label: "Achievements", icon: <Trophy className="w-5 h-5" /> },
        { id: "quiz-history", label: "Quiz History", icon: <FileQuestion className="w-5 h-5" /> },
    ];

    return (
        <div className="flex h-screen bg-[#0B1120] font-sans overflow-hidden" dir="ltr">
            {showSettings && <ProfileSettingsModal onClose={() => setShowSettings(false)} />}
            {showQRScanner && <QRScannerModal onClose={() => setShowQRScanner(false)} onScanned={handleQRScanned} />}

            {/* Sidebar */}
            <aside className="w-64 bg-[#111827] border-r border-slate-800 hidden md:flex flex-col justify-between">
                <div>
                    <div className="h-20 flex items-center px-8 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <div className="bg-[#00D084] p-1.5 rounded-lg"><MapPin className="text-gray-900 w-5 h-5" /></div>
                            <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
                        </div>
                    </div>
                    <nav className="p-4 flex flex-col gap-1 mt-4">
                        {navItems.map(n => (
                            <button key={n.id} onClick={() => setTab(n.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-sm ${
                                        tab === n.id ? "bg-[#00D084]/10 text-[#00D084] border border-[#00D084]/20"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent"
                                    }`}>
                                {n.icon}{n.label}
                                {tab === n.id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                            </button>
                        ))}
                        <button onClick={() => navigate("/quiz")}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-sm text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent">
                            <FileQuestion className="w-5 h-5" />Take a Quiz
                        </button>
                        <button onClick={() => setShowSettings(true)}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm border border-transparent">
                            <Settings className="w-5 h-5" />Settings & Profile
                        </button>
                    </nav>
                </div>
                <div className="p-4 border-t border-slate-800">
                    <button onClick={() => setShowSettings(true)}
                            className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-slate-800/50 hover:bg-[#00D084]/10 transition-all text-left">
                        <div className="bg-[#00D084] w-10 h-10 rounded-full flex items-center justify-center text-gray-900 font-bold shadow-[0_0_10px_rgba(0,208,132,0.4)] flex-shrink-0 text-sm">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div className="overflow-hidden flex-1 min-w-0">
                            <h3 className="text-white font-medium text-sm truncate">{user?.firstName} {user?.lastName}</h3>
                            <p className="text-slate-400 text-xs">ID: {(user as any)?.studentID || "N/A"}</p>
                        </div>
                        <UserCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    </button>
                    <button onClick={() => { logout(); navigate("/"); }}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm">
                        <LogOut className="w-5 h-5" />Logout
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-y-auto p-6 md:p-10 pb-24 md:pb-10">
                <div className="max-w-5xl mx-auto">

                    {/* HOME */}
                    {tab === "home" && (
                        <>
                            <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
                                <div>
                                    <h1 className="text-3xl font-serif font-bold text-white mb-1">Welcome, {user?.firstName}</h1>
                                    <p className="text-slate-400 text-sm">{myCourses.length} enrolled courses
                                        • {overallPct !== null ? `${overallPct}% attendance` : "No sessions yet"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ConnectionStatus />
                                    <button onClick={() => setShowSettings(true)}
                                            className="p-2 text-slate-400 hover:text-[#00D084] hover:bg-[#00D084]/10 rounded-lg transition-colors">
                                        <UserCircle className="w-5 h-5" />
                                    </button>
                                    <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                        <Bell className="w-5 h-5" />
                                        <span className="absolute top-1 right-1 w-2 h-2 bg-[#00D084] rounded-full" />
                                    </button>
                                </div>
                            </div>

                            {distanceWarning && hasMarked && (
                                <div className="mb-6 flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-5 py-4 animate-pulse">
                                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-yellow-300 font-semibold text-sm">You left the lecture area!</p>
                                        <p className="text-yellow-400/70 text-xs">Please return to the lecture hall.</p>
                                    </div>
                                </div>
                            )}

                            {activeSession ? (
                                <div className="mb-8 bg-[#00D084]/5 border border-[#00D084]/30 rounded-2xl overflow-hidden">
                                    <div className="px-6 py-5 border-b border-[#00D084]/20">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="w-2.5 h-2.5 rounded-full bg-[#00D084] animate-pulse" />
                                            <h2 className="text-white font-bold text-lg">Live Session</h2>
                                        </div>
                                        <p className="text-2xl font-serif font-bold text-white">{activeSession.courseName}</p>
                                        <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                                            {activeSession.courseCode}
                                            {activeSession.geoEnabled
                                                ? <span className="flex items-center gap-1 text-blue-400"><Navigation className="w-3 h-3" />Geo-Attendance ({activeSession.radiusMeters}m)</span>
                                                : <span className="text-slate-500">No location required</span>}
                                        </p>
                                    </div>
                                    {!myCourseIds.includes(activeSession.courseId) && (
                                        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
                                            <p className="text-red-400 text-sm flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />You are not enrolled in this course.</p>
                                        </div>
                                    )}
                                    <div className="px-6 py-5 flex flex-col sm:flex-row gap-3">
                                        {!hasMarked ? (
                                            <>
                                                <button onClick={handleMarkAttendance}
                                                        disabled={!myCourseIds.includes(activeSession.courseId)}
                                                        className="flex-1 bg-[#00D084] hover:bg-[#00B070] disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,208,132,0.3)]">
                                                    <Radio className="w-5 h-5" />Mark Attendance
                                                </button>
                                                <button onClick={() => setShowQRScanner(true)}
                                                        disabled={!myCourseIds.includes(activeSession.courseId)}
                                                        className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all">
                                                    <QrCode className="w-5 h-5" />Scan QR Code
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col sm:flex-row gap-3 flex-1">
                                                <div className="flex-1 flex items-center justify-center gap-3 py-3 bg-[#00D084]/10 border border-[#00D084]/20 rounded-xl">
                                                    <CheckCircle className="w-6 h-6 text-[#00D084]" />
                                                    <span className="text-[#00D084] font-bold text-lg">Attendance Recorded</span>
                                                </div>
                                                <button onClick={handleLeaveSession}
                                                        className="px-5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all">
                                                    <LogOut className="w-5 h-5" />Leave Session
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-8 bg-slate-800/30 border border-slate-700/50 rounded-2xl px-6 py-8 text-center">
                                    <Radio className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400 font-medium">No active session right now</p>
                                    <p className="text-slate-600 text-sm mt-1">Your doctor will start a session when the lecture begins</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: "Enrolled", value: myCourses.length, color: "text-white" },
                                    { label: "Sessions", value: totalSessions, color: "text-blue-400" },
                                    { label: "Attended", value: totalAttended, color: "text-[#00D084]" },
                                    { label: "Overall %", value: overallPct != null ? `${overallPct}%` : "—", color: overallPct != null && overallPct < 75 ? "text-red-400" : "text-yellow-400" },
                                ].map(s => (
                                    <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4">
                                        <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            <QuizAlertBanner navigate={navigate} userId={user?.id || ""} enrolledCourseIds={myCourseIds} />

                            <h2 className="text-white font-semibold mb-4">My Courses</h2>
                            {myCourses.length === 0
                                ? <div className="text-center py-12 text-slate-500 bg-[#111827] border border-slate-800 rounded-xl">
                                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>Not enrolled in any courses yet.</p>
                                    <button onClick={() => setTab("courses")} className="mt-3 text-[#00D084] text-sm underline">Browse Courses</button>
                                </div>
                                : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {myCourses.map(c => {
                                        const cStats = getStats(c.id);
                                        const doctor = users.find(u => u.id === c.doctorId);
                                        const pctColor = cStats.pct === null ? "text-slate-400" : cStats.pct >= 75 ? "text-[#00D084]" : cStats.pct >= 50 ? "text-yellow-400" : "text-red-400";
                                        return (
                                            <div key={c.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{c.code}</span>
                                                        <h3 className="text-white font-bold mt-1.5 truncate">{c.name}</h3>
                                                        {doctor && <p className="text-slate-400 text-sm">Dr. {doctor.firstName} {doctor.lastName}</p>}
                                                    </div>
                                                    <span className={`text-2xl font-bold ${pctColor} ml-2`}>{cStats.pct !== null ? `${cStats.pct}%` : "—"}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${cStats.pct === null ? "bg-slate-600" : cStats.pct >= 75 ? "bg-[#00D084]" : cStats.pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                                                         style={{ width: cStats.pct !== null ? `${cStats.pct}%` : "0%" }} />
                                                </div>
                                                <p className="text-slate-500 text-xs mt-2">{cStats.present} / {cStats.total} sessions attended</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            }
                        </>
                    )}

                    {/* BROWSE COURSES */}
                    {tab === "courses" && (
                        <>
                            <div className="mb-8 border-b border-slate-800 pb-6">
                                <h1 className="text-3xl font-serif font-bold text-white mb-2">Browse Courses</h1>
                                <p className="text-slate-400 text-sm">Enroll in available courses to receive lecture updates.</p>
                            </div>
                            {courses.length === 0
                                ? <div className="text-center py-20 text-slate-500"><BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No courses available yet.</p></div>
                                : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {courses.map(c => {
                                        const isEnrolled = myCourseIds.includes(c.id);
                                        const doctor = users.find(u => u.id === c.doctorId);
                                        const slotCount = schedules.filter(s => s.courseId === c.id).length;
                                        const enrolledCount = enrollments.filter(e => e.courseId === c.id).length;
                                        return (
                                            <div key={c.id} className={`bg-[#111827] border rounded-xl p-5 transition-all flex flex-col gap-3 ${isEnrolled ? "border-[#00D084]/30" : "border-slate-800 hover:border-slate-700"}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{c.code}</span>
                                                            {isEnrolled && <span className="text-xs font-semibold text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">Enrolled</span>}
                                                        </div>
                                                        <h3 className="text-white font-bold text-base truncate">{c.name}</h3>
                                                        {doctor && <p className="text-slate-400 text-sm mt-0.5">Dr. {doctor.firstName} {doctor.lastName}</p>}
                                                    </div>
                                                    <button
                                                        onClick={() => isEnrolled ? unenrollStudent(c.id, user!.id) : enrollStudent(c.id, user!.id)}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all flex-shrink-0 ${
                                                            isEnrolled ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                                                : "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20 hover:bg-[#00D084]/20"
                                                        }`}>
                                                        {isEnrolled ? <><UserMinus className="w-4 h-4" />Unenroll</> : <><UserPlus className="w-4 h-4" />Enroll</>}
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                                                    {c.department && <span>{c.department}</span>}
                                                    {c.location && <span>{c.location}</span>}
                                                    <span>{c.creditHours} cr. hrs</span>
                                                    <span>{slotCount} slots/week</span>
                                                    <span>{enrolledCount} enrolled</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            }
                        </>
                    )}

                    {/* SCHEDULE */}
                    {tab === "schedule" && (
                        <>
                            <div className="mb-6 border-b border-slate-800 pb-6">
                                <h1 className="text-3xl font-serif font-bold text-white mb-2">Weekly Schedule</h1>
                                <p className="text-slate-400 text-sm">Your lecture timetable.</p>
                            </div>
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                                {DAYS.map(d => {
                                    const count = mySchedules.filter(s => s.day === d).length;
                                    return (
                                        <button key={d} onClick={() => setActiveDay(d)}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex-shrink-0 border ${activeDay === d ? DAY_COLOR[d] : "bg-[#111827] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"}`}>
                                            {d}
                                            {count > 0 && <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${activeDay === d ? "bg-white/20" : "bg-slate-700"}`}>{count}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            {daySchedules.length === 0
                                ? <div className="text-center py-20 text-slate-500"><Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No classes on {activeDay}</p></div>
                                : <div className="flex flex-col gap-4">
                                    {daySchedules.map(s => {
                                        const course = myCourses.find(c => c.id === s.courseId);
                                        const doctor = course ? users.find(u => u.id === course.doctorId) : null;
                                        if (!course) return null;
                                        return (
                                            <div key={s.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex items-center gap-4">
                                                <div className={`flex-shrink-0 text-center px-4 py-3 rounded-xl border ${DAY_COLOR[activeDay]}`}>
                                                    <p className="text-xs font-semibold opacity-70">START</p>
                                                    <p className="text-lg font-bold">{s.startTime}</p>
                                                    <div className="flex items-center justify-center gap-1 mt-1 opacity-60">
                                                        <ChevronRight className="w-3 h-3" /><span className="text-xs">{s.endTime}</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{course.code}</span>
                                                    <h3 className="text-white font-bold mt-1 truncate">{course.name}</h3>
                                                    {doctor && <p className="text-slate-400 text-sm">Dr. {doctor.firstName} {doctor.lastName}</p>}
                                                    {s.location && <p className="text-slate-500 text-xs mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</p>}
                                                </div>
                                                <div className="flex-shrink-0 text-slate-400 text-xs flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />{calcDuration(s.startTime, s.endTime)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            }
                        </>
                    )}

                    {/* ATTENDANCE */}
                    {tab === "attendance" && (
                        <>
                            <div className="mb-8 border-b border-slate-800 pb-6">
                                <h1 className="text-3xl font-serif font-bold text-white mb-2">Attendance Report</h1>
                                <p className="text-slate-400 text-sm">Detailed attendance per course.</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: "Enrolled Courses", value: myCourses.length, color: "text-white" },
                                    { label: "Total Sessions", value: totalSessions, color: "text-blue-400" },
                                    { label: "Attended", value: totalAttended, color: "text-[#00D084]" },
                                    { label: "Overall %", value: overallPct !== null ? `${overallPct}%` : "—", color: overallPct !== null && overallPct < 75 ? "text-red-400" : "text-yellow-400" },
                                ].map(s => (
                                    <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4">
                                        <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>
                            {myCourses.length === 0
                                ? <div className="text-center py-20 text-slate-500"><ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No courses enrolled yet.</p></div>
                                : selAttCourse === null
                                    ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {myCourses.map(c => {
                                                const cStats = getStats(c.id);
                                                const pctColor = cStats.pct === null ? "text-slate-400" : cStats.pct >= 75 ? "text-[#00D084]" : cStats.pct >= 50 ? "text-yellow-400" : "text-red-400";
                                                const barColor = cStats.pct === null ? "bg-slate-600" : cStats.pct >= 75 ? "bg-[#00D084]" : cStats.pct >= 50 ? "bg-yellow-400" : "bg-red-400";
                                                return (
                                                    <button key={c.id} onClick={() => setSelAttCourse(c.id)}
                                                            className="bg-[#111827] border border-slate-800 hover:border-[#00D084]/40 rounded-2xl p-5 text-left transition-all group">
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div>
                                                                <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{c.code}</span>
                                                                <h3 className="text-white font-bold mt-2">{c.name}</h3>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-[#00D084] transition-colors flex-shrink-0 mt-1" />
                                                        </div>
                                                        <div className="mb-2 flex justify-between items-center">
                                                            <span className="text-slate-400 text-xs">Sessions attended</span>
                                                            <span className={`text-2xl font-bold ${pctColor}`}>{cStats.pct !== null ? `${cStats.pct}%` : "—"}</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${barColor}`} style={{ width: cStats.pct !== null ? `${cStats.pct}%` : "0%" }} />
                                                        </div>
                                                        <p className="text-slate-500 text-xs mt-2">{cStats.present} of {cStats.total} sessions attended</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )
                                    : (() => {
                                        const c = myCourses.find(x => x.id === selAttCourse)!;
                                        if (!c) return null;
                                        const cStats = getStats(c.id);
                                        const pctColor = cStats.pct === null ? "text-slate-400" : cStats.pct >= 75 ? "text-[#00D084]" : cStats.pct >= 50 ? "text-yellow-400" : "text-red-400";
                                        const barColor = cStats.pct === null ? "bg-slate-600" : cStats.pct >= 75 ? "bg-[#00D084]" : cStats.pct >= 50 ? "bg-yellow-400" : "bg-red-400";
                                        return (
                                            <div>
                                                <div className="flex items-center gap-3 mb-6">
                                                    <button onClick={() => setSelAttCourse(null)}
                                                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700">
                                                        <ChevronRight className="w-4 h-4 rotate-180" />
                                                    </button>
                                                    <div>
                                                        <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full mr-2">{c.code}</span>
                                                        <span className="text-white font-bold text-lg">{c.name}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 mb-6">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-slate-400 text-sm">Attendance Rate</span>
                                                        <span className={`text-3xl font-bold ${pctColor}`}>{cStats.pct !== null ? `${cStats.pct}%` : "—"}</span>
                                                    </div>
                                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                                                        <div className={`h-full rounded-full ${barColor}`} style={{ width: cStats.pct !== null ? `${cStats.pct}%` : "0%" }} />
                                                    </div>
                                                    <div className="flex justify-between text-xs text-slate-500">
                                                        <span>{cStats.present} sessions attended</span>
                                                        <span>{cStats.total} total sessions</span>
                                                    </div>
                                                    {cStats.pct !== null && cStats.pct < 75 && (
                                                        <div className="mt-3 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                                            <span className="text-xs font-semibold">Below 75% — attendance at risk!</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
                                                    <div className="px-5 py-4 border-b border-slate-800">
                                                        <h3 className="text-white font-semibold flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-[#00D084]" />Session History</h3>
                                                    </div>
                                                    <CourseSessionList courseId={c.id} userId={user?.id || ""} users={users} attendanceEvents={attendanceEvents} />
                                                </div>
                                            </div>
                                        );
                                    })()
                            }
                        </>
                    )}

                    {/* HISTORY */}
                    {tab === "history" && (
                        <>
                            <div className="mb-8 border-b border-slate-800 pb-6">
                                <h1 className="text-3xl font-serif font-bold text-white mb-2">Attendance History</h1>
                                <p className="text-slate-400 text-sm">Full record of all your sessions — present and absent.</p>
                            </div>
                            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5">
                                <AttendanceHistoryList userId={user?.id || ""} courses={myCourses} users={users} attendanceEvents={attendanceEvents} />
                            </div>
                        </>
                    )}

                    {/* STATS */}
                    {tab === "stats" && (
                        <>
                            <div className="mb-8 border-b border-slate-800 pb-6">
                                <h1 className="text-3xl font-serif font-bold text-white mb-2">My Stats</h1>
                                <p className="text-slate-400 text-sm">Detailed performance overview and trends.</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                {[
                                    { label: "Overall Attendance", value: stats.overallPct !== null ? `${stats.overallPct}%` : "—", color: stats.overallPct !== null && stats.overallPct < 75 ? "text-red-400" : "text-[#00D084]", icon: <ClipboardList className="w-5 h-5" /> },
                                    { label: "Sessions Attended", value: stats.attended, color: "text-blue-400", icon: <CheckCircle className="w-5 h-5" /> },
                                    { label: "Avg Quiz Score", value: stats.avgQuizScore !== null ? `${stats.avgQuizScore}%` : "—", color: "text-yellow-400", icon: <FileQuestion className="w-5 h-5" /> },
                                    { label: "Attendance Streak", value: `${stats.streak}`, color: "text-orange-400", icon: <TrendingUp className="w-5 h-5" /> },
                                ].map(s => (
                                    <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                                        <div className={`${s.color} opacity-70`}>{s.icon}</div>
                                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                        <p className="text-slate-400 text-xs">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 mb-6">
                                <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
                                    <BarChart2 className="w-4 h-4 text-[#00D084]" />Attendance by Course
                                </h2>
                                <p className="text-slate-500 text-xs mb-4">Hover bars to see details</p>
                                <AttendanceTrendChart myCourses={myCourses} userId={user?.id || ""} users={users} />
                            </div>
                            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 mb-6">
                                <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
                                    <FileQuestion className="w-4 h-4 text-[#00D084]" />Quiz Performance Over Time
                                </h2>
                                <p className="text-slate-500 text-xs mb-4">Your last 8 quiz submissions</p>
                                <QuizPerformanceChart submissions={mySubmissions} sessions={quizSessions} />
                            </div>
                            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
                                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-[#00D084]" />Course Breakdown
                                </h2>
                                {myCourses.length === 0
                                    ? <p className="text-slate-500 text-sm text-center py-6">No enrolled courses.</p>
                                    : <div className="flex flex-col gap-3">
                                        {myCourses.map(c => {
                                            const cStats = getStats(c.id);
                                            const barClr = cStats.pct === null ? "bg-slate-600" : cStats.pct >= 75 ? "bg-[#00D084]" : cStats.pct >= 50 ? "bg-yellow-400" : "bg-red-400";
                                            const txtClr = cStats.pct === null ? "text-slate-400" : cStats.pct >= 75 ? "text-[#00D084]" : cStats.pct >= 50 ? "text-yellow-400" : "text-red-400";
                                            return (
                                                <div key={c.id} className="flex items-center gap-4">
                                                    <div className="w-16 text-right"><span className="text-xs font-bold text-slate-400 truncate block">{c.code}</span></div>
                                                    <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${barClr} transition-all`} style={{ width: cStats.pct !== null ? `${cStats.pct}%` : "0%" }} />
                                                    </div>
                                                    <span className={`text-sm font-bold w-12 text-right ${txtClr}`}>{cStats.pct !== null ? `${cStats.pct}%` : "—"}</span>
                                                    <span className="text-slate-500 text-xs w-16 text-right hidden sm:block">{cStats.present}/{cStats.total}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                }
                            </div>
                        </>
                    )}

                    {/* ACHIEVEMENTS */}
                    {tab === "achievements" && (
                        <>
                            <div className="mb-8 border-b border-slate-800 pb-6">
                                <h1 className="text-3xl font-serif font-bold text-white mb-2">Achievements</h1>
                                <p className="text-slate-400 text-sm">Earn badges by attending lectures, acing quizzes, and staying consistent.</p>
                            </div>
                            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
                                <BadgesPanel stats={stats} myCourses={myCourses} />
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                {[
                                    { icon: <Trophy className="w-6 h-6 text-yellow-400" />, label: "Badges Earned", value: `${[stats.totalCourses >= 1, stats.attended >= 1, stats.attended >= 10, stats.attended >= 25, (stats.overallPct ?? 0) >= 75, (stats.overallPct ?? 0) >= 90, stats.perfectCourses >= 1, stats.totalQuizzes >= 1, (stats.avgQuizScore ?? 0) >= 80, stats.streak >= 3, stats.totalCourses >= 3, stats.streak >= 7].filter(Boolean).length} / 12` },
                                    { icon: <Zap className="w-6 h-6 text-orange-400" />, label: "Current Streak", value: `${stats.streak} sessions` },
                                    { icon: <Star className="w-6 h-6 text-[#00D084]" />, label: "Perfect Courses", value: `${stats.perfectCourses}` },
                                ].map(s => (
                                    <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4 text-center">
                                        <div className="flex justify-center mb-2">{s.icon}</div>
                                        <p className="text-white font-bold text-lg">{s.value}</p>
                                        <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* QUIZ HISTORY */}
                    {tab === "quiz-history" && (
                        <>
                            <div className="mb-8 border-b border-slate-800 pb-6">
                                <h1 className="text-3xl font-serif font-bold text-white mb-2">Quiz History</h1>
                                <p className="text-slate-400 text-sm">All your quiz submissions with detailed answer breakdowns.</p>
                            </div>
                            {mySubmissions.length > 0 && (
                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    {[
                                        { label: "Quizzes Taken", value: mySubmissions.length, color: "text-blue-400" },
                                        { label: "Best Score", value: `${Math.max(...mySubmissions.map(s => s.score))}%`, color: "text-[#00D084]" },
                                        { label: "Average Score", value: `${Math.round(mySubmissions.reduce((a, s) => a + s.score, 0) / mySubmissions.length)}%`, color: "text-yellow-400" },
                                    ].map(s => (
                                        <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4 text-center">
                                            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                            <p className="text-slate-400 text-xs mt-1">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <QuizHistoryPanel submissions={allSubmissions} sessions={quizSessions} userId={user?.id || ""} />
                        </>
                    )}

                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111827] border-t border-slate-800 z-40 px-2 py-2">
                <div className="flex items-center justify-around">
                    {([
                        { id: "home", icon: <Home className="w-5 h-5" />, label: "Home" },
                        { id: "attendance", icon: <ClipboardList className="w-5 h-5" />, label: "Attend" },
                        { id: "history", icon: <History className="w-5 h-5" />, label: "History" },
                        { id: "stats", icon: <BarChart2 className="w-5 h-5" />, label: "Stats" },
                        { id: "quiz-history", icon: <FileQuestion className="w-5 h-5" />, label: "Quizzes" },
                    ] as { id: Tab; icon: React.ReactNode; label: string }[]).map(n => (
                        <button key={n.id} onClick={() => setTab(n.id)}
                                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                                    tab === n.id ? "text-[#00D084]" : "text-slate-500 hover:text-slate-300"
                                }`}>
                            {n.icon}
                            <span className="text-[10px] font-medium">{n.label}</span>
                            {tab === n.id && <span className="w-1 h-1 rounded-full bg-[#00D084]" />}
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
}