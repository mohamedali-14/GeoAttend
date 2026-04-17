import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, MapPin, Settings, UserCircle, Calendar, ChevronRight,
  CheckCircle, XCircle, Clock, BookOpen, UserPlus, UserMinus,
  AlertTriangle, Navigation, Radio, Bell, ClipboardList, Home, QrCode, X, FileQuestion
} from "lucide-react";import { useAuth } from "../../context/AuthContext";
import { useMockData } from "../../context/MockDataContext";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import { useQuiz } from "../../context/QuizContext";
import ProfileSettingsModal from "../shared/ProfileSettingsModal";
import ConnectionStatus from "../../components/ConnectionStatus";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const DAYS = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"] as const;
type Day = typeof DAYS[number];
const DAY_COLOR: Record<Day,string> = {
  Saturday: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  Sunday:   "text-blue-400   bg-blue-500/10   border-blue-500/20",
  Monday:   "text-[#00D084]  bg-[#00D084]/10  border-[#00D084]/20",
  Tuesday:  "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  Wednesday:"text-pink-400   bg-pink-500/10   border-pink-500/20",
  Thursday: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

type Tab = "home" | "courses" | "schedule" | "attendance";


function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) + " min";
}

// ── QR Scanner Modal (simple camera-based) ───────────────────────────────────
function QRScannerModal({ onClose, onScanned }: { onClose: () => void; onScanned: (data: string) => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><QrCode className="w-5 h-5 text-[#00D084]"/>Scan QR Code</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="w-64 h-64 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center gap-3">
            <QrCode className="w-16 h-16 text-slate-600"/>
            <p className="text-slate-500 text-sm text-center px-4">Point your camera at the QR code shown by your doctor</p>
          </div>
          <p className="text-slate-400 text-xs text-center">Camera access required. Make sure the QR is well-lit.</p>
          {/* Demo button for testing */}
          <button
            onClick={() => { const qr = "GEOATTEND|demo-session-id|demo-course|" + new Date().toISOString(); onScanned(qr); }}
            className="w-full py-2.5 bg-[#00D084]/10 hover:bg-[#00D084]/20 border border-[#00D084]/30 text-[#00D084] font-semibold rounded-lg text-sm">
            📷 Simulate Scan (Demo)
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Course Session List Helper ────────────────────────────────────────────────
function CourseSessionList({ courseId, userId, users, attendanceEvents }: {
  courseId: string; userId: string;
  users: any[]; attendanceEvents: any[];
}) {
  const all: any[] = [];
  users.filter((u: any) => u.role === "DOCTOR").forEach((doctor: any) => {
    try {
      const raw = localStorage.getItem("geo_sessions_" + doctor.id);
      if (raw) { const s = JSON.parse(raw); all.push(...s.filter((x: any) => x.courseId === courseId && !x.isActive)); }
    } catch { }
  });
  try {
    const ar = localStorage.getItem("geo_admin_sessions");
    if (ar) { const s = JSON.parse(ar); all.push(...s.filter((x: any) => x.courseId === courseId && !x.isActive)); }
  } catch { }
  const seen = new Set<string>();
  const csess = all.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
    .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  if (csess.length === 0) return <p className="text-slate-500 text-sm text-center py-6">No sessions recorded yet.</p>;

  return (
    <div className="divide-y divide-slate-800/60">
      {csess.map((sess: any, idx: number) => {
        const myEntry = attendanceEvents.find((e: any) => e.sessionId === sess.id && e.studentId === userId);
        const myStatus = myEntry?.status || (myEntry ? "present" : "absent");
        const sessDate = new Date(sess.startTime).toLocaleDateString("en-EG", { month: "short", day: "numeric" });
        const sessTime = new Date(sess.startTime).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
        return (
          <div key={sess.id} className="flex items-center gap-3 px-5 py-3">
            {myStatus === "present"
              ? <CheckCircle className="w-5 h-5 text-[#00D084] flex-shrink-0"/>
              : myStatus === "left"
              ? <LogOut className="w-5 h-5 text-yellow-400 flex-shrink-0"/>
              : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0"/>}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">Session #{String(csess.length - idx).padStart(2, "0")}</p>
              <p className="text-slate-500 text-xs">{sessDate} • {sessTime}</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              myStatus === "present" ? "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20" :
              myStatus === "left"    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
              myStatus === "kicked"  ? "bg-red-500/10 text-red-300 border-red-500/20" :
                                      "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>
              {myStatus === "present" ? "Present" : myStatus === "left" ? "Left Early" : myStatus === "kicked" ? "Kicked" : "Absent"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Quiz Alert Banner ─────────────────────────────────────────────────────────
function QuizAlertBanner({ navigate, userId, enrolledCourseIds }: { navigate: (p: string) => void; userId: string; enrolledCourseIds: string[] }) {
  const { getActiveSessionsForStudent } = useQuiz();
  const activeQuizzes = getActiveSessionsForStudent(enrolledCourseIds, userId);
  if (activeQuizzes.length === 0) return null;
  return (
    <div className="mb-6 bg-blue-600/10 border border-blue-500/30 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0"/>
        <div>
          <p className="text-white font-semibold text-sm">
            {activeQuizzes.length === 1 ? "Active Quiz Available!" : `${activeQuizzes.length} Active Quizzes Available!`}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">{activeQuizzes[0].title} — {activeQuizzes[0].courseName}</p>
        </div>
      </div>
      <button onClick={() => navigate("/quiz")}
        className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all">
        Take Quiz →
      </button>
    </div>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { courses, schedules, enrollments, attendance, lectures, users, enrollStudent, unenrollStudent } = useMockData();
  const { emitAttendance, studentLeave, attendanceEvents } = useSocket();
  const toast = useToast();

  const [showSettings, setShowSettings]   = useState(false);
  const [tab, setTab]                     = useState<Tab>("home");
  const [activeDay, setActiveDay]         = useState<Day>("Sunday");
  const [activeSession, setActiveSession] = useState<any>(null);
  const [hasMarked, setHasMarked]         = useState(false); // ← مهم: تسجيل حضور فعلاً
  const [distanceWarning, setDistanceWarning] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selAttCourse, setSelAttCourse]   = useState<string | null>(null);
  const geoInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Enrolled courses ──────────────────────────────────────────────────────
  const myCourseIds  = enrollments.filter(e => e.studentId === user?.id).map(e => e.courseId);
  const myCourses    = courses.filter(c => myCourseIds.includes(c.id));
  const mySchedules  = schedules.filter(s => myCourseIds.includes(s.courseId));
  const daySchedules = mySchedules.filter(s => s.day === activeDay).sort((a,b) => a.startTime.localeCompare(b.startTime));

  // ── Pick up active session — poll + cross-tab storage ───────────────────
  useEffect(() => {
    const check = () => {
      try {
        const raw = localStorage.getItem("geo_active_session");
        const session = raw ? JSON.parse(raw) : null;
        setActiveSession(session);
        if (!session) {
          setHasMarked(false);
          setDistanceWarning(false);
        }
      } catch { /* ignore parse errors */ }
    };
    check();
    // Poll every 2s so same-tab changes (admin ending session) are detected fast
    const iv = setInterval(check, 2000);
    // Also react to cross-tab changes
    window.addEventListener("storage", check);
    return () => { clearInterval(iv); window.removeEventListener("storage", check); };
  }, []);

  // ── Kick detection — لو الأدمن طرد الطالب ───────────────────────────────
  useEffect(() => {
    if (!user) return;
    let lastKickTs = 0; // track last processed kick timestamp
    const checkKick = () => {
      try {
        const raw = localStorage.getItem("geo_rt_kick");
        if (!raw) return;
        const kick = JSON.parse(raw);
        const kickTs = kick._ts || 0;
        // Only process new kick events, and only if it's for this student
        if (kickTs <= lastKickTs) return;
        if (kick.studentId !== user.id) return;
        lastKickTs = kickTs;
        // Kicked! Clear session state
        setHasMarked(false);
        setDistanceWarning(false);
        setActiveSession(null);
        toast.error("❌ You have been removed from the session by the admin.");
      } catch { }
    };
    const iv = setInterval(checkKick, 2000);
    return () => clearInterval(iv);
  }, [user]);

  // ── Distance tracking — بس بعد ما الطالب سجل حضوره ────────────────────────
  useEffect(() => {
    // وقف الـ tracking لو مش مسجل أو مفيش session geo
    if (!hasMarked || !activeSession?.geoEnabled || !activeSession?.centerLat) {
      if (geoInterval.current) { clearInterval(geoInterval.current); geoInterval.current = null; }
      setDistanceWarning(false);
      return;
    }
    const checkGeo = () => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const dist = haversine(
          pos.coords.latitude, pos.coords.longitude,
          activeSession.centerLat, activeSession.centerLng
        );
        const outside = dist > activeSession.radiusMeters;
        setDistanceWarning(outside);
        if (outside) toast.warning("⚠️ You left the lecture area!");
      });
    };
    geoInterval.current = setInterval(checkGeo, 15000);
    return () => { if (geoInterval.current) clearInterval(geoInterval.current); };
  }, [hasMarked, activeSession]);

  const handleMarkAttendance = () => {
    if (!activeSession || !user) return;

    // لو مش في session مرتبطة بكورس مسجل فيه
    if (!myCourseIds.includes(activeSession.courseId)) {
      toast.error("You are not enrolled in this course!");
      return;
    }

    const doMark = (geoStatus: "inside" | "no_geo") => {
      emitAttendance({
        sessionId:   activeSession.id,
        studentId:   user.id,
        studentName: `${user.firstName} ${user.lastName}`,
        courseId:    activeSession.courseId,
        timestamp:   new Date().toISOString(),
        geoStatus,
      });
      setHasMarked(true);
      toast.success("✅ Attendance recorded!");
    };

    if (!activeSession.geoEnabled || !activeSession.centerLat) {
      doMark("no_geo");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = haversine(
          pos.coords.latitude, pos.coords.longitude,
          activeSession.centerLat, activeSession.centerLng
        );
        if (dist > activeSession.radiusMeters) {
          toast.error(`❌ You are ${Math.round(dist)}m away. Must be within ${activeSession.radiusMeters}m.`);
          return;
        }
        doMark("inside");
      },
      () => toast.error("Could not get your location. Allow location access.")
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
    const parts = data.split("|");
    const sessionId = parts[1];
    if (activeSession?.id === sessionId) {
      handleMarkAttendance();
    } else {
      toast.error("QR code does not match the active session");
    }
  };

  // Attendance stats
  const allLectures  = lectures.filter(l => myCourseIds.includes(l.courseId||"") && ["COMPLETED","ACTIVE"].includes(l.status));
  const myAttendance = attendance.filter(a => a.studentId === user?.id);
  const overallPct   = allLectures.length > 0 ? Math.round((myAttendance.length / allLectures.length) * 100) : null;

  const getStats = (courseId: string) => {
    const total   = lectures.filter(l => l.courseId===courseId && ["COMPLETED","ACTIVE"].includes(l.status)).length;
    const present = attendance.filter(a => a.studentId===user?.id && a.courseId===courseId).length;
    return { total, present, pct: total>0 ? Math.round((present/total)*100) : null };
  };

  const navItems: {id:Tab;label:string;icon:React.ReactNode}[] = [
    { id:"home",       label:"Home",           icon:<Home className="w-5 h-5"/> },
    { id:"courses",    label:"Browse Courses", icon:<BookOpen className="w-5 h-5"/> },
    { id:"schedule",   label:"My Schedule",    icon:<Calendar className="w-5 h-5"/> },
    { id:"attendance", label:"Attendance",     icon:<ClipboardList className="w-5 h-5"/> },
  ];

  return (
    <div className="flex h-screen bg-[#0B1120] font-sans overflow-hidden" dir="ltr">
      {showSettings && <ProfileSettingsModal onClose={() => setShowSettings(false)}/>}
      {showQRScanner && <QRScannerModal onClose={() => setShowQRScanner(false)} onScanned={handleQRScanned}/>}

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-[#111827] border-r border-slate-800 hidden md:flex flex-col justify-between">
        <div>
          <div className="h-20 flex items-center px-8 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="bg-[#00D084] p-1.5 rounded-lg"><MapPin className="text-gray-900 w-5 h-5"/></div>
              <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
            </div>
          </div>
          <nav className="p-4 flex flex-col gap-1 mt-4">
            {navItems.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-sm ${
                  tab===n.id ? "bg-[#00D084]/10 text-[#00D084] border border-[#00D084]/20"
                             : "text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent"
                }`}>
                {n.icon}{n.label}
                {tab===n.id && <ChevronRight className="w-3.5 h-3.5 ml-auto"/>}
              </button>
            ))}
            <button onClick={() => navigate("/quiz")}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-sm text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent">
              <FileQuestion className="w-5 h-5"/>Quizzes
            </button>
            <button onClick={() => setShowSettings(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm border border-transparent">
              <Settings className="w-5 h-5"/>Settings & Profile
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
            <UserCircle className="w-4 h-4 text-slate-500 flex-shrink-0"/>
          </button>
          <button onClick={() => { logout(); navigate("/"); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm">
            <LogOut className="w-5 h-5"/>Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto">

          {/* ═══════════ HOME ═══════════ */}
          {tab === "home" && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-white mb-1">Welcome, {user?.firstName} 👋</h1>
                  <p className="text-slate-400 text-sm">{myCourses.length} enrolled courses • {overallPct !== null ? `${overallPct}% attendance` : "No lectures yet"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ConnectionStatus/>
                  <button onClick={() => setShowSettings(true)} className="p-2 text-slate-400 hover:text-[#00D084] hover:bg-[#00D084]/10 rounded-lg transition-colors">
                    <UserCircle className="w-5 h-5"/>
                  </button>
                  <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                    <Bell className="w-5 h-5"/>
                    <span className="absolute top-1 right-1 w-2 h-2 bg-[#00D084] rounded-full"/>
                  </button>
                </div>
              </div>

              {/* Distance Warning — بس لو سجل حضور وبعدين اتحرك */}
              {distanceWarning && hasMarked && (
                <div className="mb-6 flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-5 py-4 animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0"/>
                  <div>
                    <p className="text-yellow-300 font-semibold text-sm">⚠️ You left the lecture area!</p>
                    <p className="text-yellow-400/70 text-xs">Please return to the lecture hall to maintain your attendance.</p>
                  </div>
                </div>
              )}

              {/* Active Session Card */}
              {activeSession ? (
                <div className="mb-8 bg-[#00D084]/5 border border-[#00D084]/30 rounded-2xl overflow-hidden">
                  <div className="px-6 py-5 border-b border-[#00D084]/20">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00D084] animate-pulse"/>
                      <h2 className="text-white font-bold text-lg">Live Session</h2>
                    </div>
                    <p className="text-2xl font-serif font-bold text-white">{activeSession.courseName}</p>
                    <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                      {activeSession.courseCode}
                      {activeSession.geoEnabled
                        ? <span className="flex items-center gap-1 text-blue-400"><Navigation className="w-3 h-3"/>Geo-Attendance ({activeSession.radiusMeters}m)</span>
                        : <span className="text-slate-500">No location required</span>
                      }
                    </p>
                  </div>

                  {/* Not enrolled warning */}
                  {!myCourseIds.includes(activeSession.courseId) && (
                    <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
                      <p className="text-red-400 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4"/>You are not enrolled in this course. Enroll first to mark attendance.
                      </p>
                    </div>
                  )}

                  <div className="px-6 py-5 flex flex-col sm:flex-row gap-3">
                    {!hasMarked ? (
                      <>
                        <button onClick={handleMarkAttendance}
                          disabled={!myCourseIds.includes(activeSession.courseId)}
                          className="flex-1 bg-[#00D084] hover:bg-[#00B070] disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,208,132,0.3)]">
                          <Radio className="w-5 h-5"/>Mark Attendance (Geo)
                        </button>
                        <button onClick={() => setShowQRScanner(true)}
                          disabled={!myCourseIds.includes(activeSession.courseId)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all">
                          <QrCode className="w-5 h-5"/>Scan QR Code
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3 flex-1">
                        <div className="flex-1 flex items-center justify-center gap-3 py-3 bg-[#00D084]/10 border border-[#00D084]/20 rounded-xl">
                          <CheckCircle className="w-6 h-6 text-[#00D084]"/>
                          <span className="text-[#00D084] font-bold text-lg">Attendance Recorded ✓</span>
                        </div>
                        <button onClick={handleLeaveSession}
                          className="px-5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all">
                          <LogOut className="w-5 h-5"/>Leave Session
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-8 bg-slate-800/30 border border-slate-700/50 rounded-2xl px-6 py-8 text-center">
                  <Radio className="w-10 h-10 text-slate-600 mx-auto mb-3"/>
                  <p className="text-slate-400 font-medium">No active session right now</p>
                  <p className="text-slate-600 text-sm mt-1">Your doctor will start a session when the lecture begins</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label:"Enrolled",     value:myCourses.length,          color:"text-white"      },
                  { label:"Lectures",     value:allLectures.length,         color:"text-blue-400"   },
                  { label:"Attended",     value:myAttendance.length,        color:"text-[#00D084]"  },
                  { label:"Overall %",    value:overallPct!=null?`${overallPct}%`:"—",
                    color: overallPct!=null&&overallPct<75?"text-red-400":"text-yellow-400" },
                ].map(s => (
                  <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Quiz Alert Banner */}
              <QuizAlertBanner navigate={navigate} userId={user?.id || ""} enrolledCourseIds={myCourseIds} />

              {/* My Courses summary */}
              <h2 className="text-white font-semibold mb-4">My Courses</h2>
              {myCourses.length === 0
                ? <div className="text-center py-12 text-slate-500 bg-[#111827] border border-slate-800 rounded-xl">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30"/>
                    <p>Not enrolled in any courses yet.</p>
                    <button onClick={() => setTab("courses")} className="mt-3 text-[#00D084] text-sm underline">Browse Courses →</button>
                  </div>
                : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myCourses.map(c => {
                      const stats   = getStats(c.id);
                      const doctor  = users.find(u => u.id === c.doctorId);
                      const pctColor = stats.pct===null?"text-slate-400":stats.pct>=75?"text-[#00D084]":stats.pct>=50?"text-yellow-400":"text-red-400";
                      return (
                        <div key={c.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{c.code}</span>
                              <h3 className="text-white font-bold mt-1.5 truncate">{c.name}</h3>
                              {doctor && <p className="text-slate-400 text-sm">Dr. {doctor.firstName} {doctor.lastName}</p>}
                            </div>
                            <span className={`text-2xl font-bold ${pctColor} ml-2`}>{stats.pct!==null?`${stats.pct}%`:"—"}</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${stats.pct===null?"bg-slate-600":stats.pct>=75?"bg-[#00D084]":stats.pct>=50?"bg-yellow-400":"bg-red-400"}`}
                              style={{width:stats.pct!==null?`${stats.pct}%`:"0%"}}/>
                          </div>
                          <p className="text-slate-500 text-xs mt-2">{stats.present} / {stats.total} lectures attended</p>
                        </div>
                      );
                    })}
                  </div>
              }
            </>
          )}

          {/* ═══════════ BROWSE COURSES ═══════════ */}
          {tab === "courses" && (
            <>
              <div className="mb-8 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-serif font-bold text-white mb-2">Browse Courses</h1>
                <p className="text-slate-400 text-sm">Enroll in available courses to receive lecture updates.</p>
              </div>
              {courses.length === 0
                ? <div className="text-center py-20 text-slate-500"><BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30"/><p>No courses available yet.</p></div>
                : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courses.map(c => {
                      const isEnrolled   = myCourseIds.includes(c.id);
                      const doctor       = users.find(u => u.id === c.doctorId);
                      const slotCount    = schedules.filter(s => s.courseId===c.id).length;
                      const enrolledCount= enrollments.filter(e => e.courseId===c.id).length;
                      return (
                        <div key={c.id} className={`bg-[#111827] border rounded-xl p-5 transition-all flex flex-col gap-3 ${isEnrolled?"border-[#00D084]/30":"border-slate-800 hover:border-slate-700"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{c.code}</span>
                                {isEnrolled && <span className="text-xs font-semibold text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">✓ Enrolled</span>}
                              </div>
                              <h3 className="text-white font-bold text-base truncate">{c.name}</h3>
                              {doctor && <p className="text-slate-400 text-sm mt-0.5">Dr. {doctor.firstName} {doctor.lastName}</p>}
                            </div>
                            <button onClick={() => isEnrolled ? unenrollStudent(c.id, user!.id) : enrollStudent(c.id, user!.id)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all flex-shrink-0 ${
                                isEnrolled ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                           : "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20 hover:bg-[#00D084]/20"
                              }`}>
                              {isEnrolled ? <><UserMinus className="w-4 h-4"/>Unenroll</> : <><UserPlus className="w-4 h-4"/>Enroll</>}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                            {c.department && <span>🏛️ {c.department}</span>}
                            {c.location   && <span>📍 {c.location}</span>}
                            <span>⏱️ {c.creditHours} cr. hrs</span>
                            <span>📅 {slotCount} slots/week</span>
                            <span>👥 {enrolledCount} enrolled</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
            </>
          )}

          {/* ═══════════ SCHEDULE ═══════════ */}
          {tab === "schedule" && (
            <>
              <div className="mb-6 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-serif font-bold text-white mb-2">Weekly Schedule</h1>
                <p className="text-slate-400 text-sm">Your lecture timetable.</p>
              </div>
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {DAYS.map(d => {
                  const count = mySchedules.filter(s=>s.day===d).length;
                  return (
                    <button key={d} onClick={() => setActiveDay(d)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex-shrink-0 border ${activeDay===d?DAY_COLOR[d]:"bg-[#111827] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"}`}>
                      {d}
                      {count>0 && <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${activeDay===d?"bg-white/20":"bg-slate-700"}`}>{count}</span>}
                    </button>
                  );
                })}
              </div>
              {daySchedules.length === 0
                ? <div className="text-center py-20 text-slate-500"><Calendar className="w-12 h-12 mx-auto mb-4 opacity-30"/><p className="text-lg font-medium">No classes on {activeDay}</p></div>
                : <div className="flex flex-col gap-4">
                    {daySchedules.map(s => {
                      const course = myCourses.find(c=>c.id===s.courseId);
                      const doctor = course ? users.find(u=>u.id===course.doctorId) : null;
                      if (!course) return null;
                      return (
                        <div key={s.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex items-center gap-4 hover:border-slate-700 transition-all">
                          <div className={`flex-shrink-0 text-center px-4 py-3 rounded-xl border ${DAY_COLOR[activeDay]}`}>
                            <p className="text-xs font-semibold opacity-70">START</p>
                            <p className="text-lg font-bold">{s.startTime}</p>
                            <div className="flex items-center justify-center gap-1 mt-1 opacity-60">
                              <ChevronRight className="w-3 h-3"/><span className="text-xs">{s.endTime}</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{course.code}</span>
                            <h3 className="text-white font-bold mt-1 truncate">{course.name}</h3>
                            {doctor && <p className="text-slate-400 text-sm">Dr. {doctor.firstName} {doctor.lastName}</p>}
                            {s.location && <p className="text-slate-500 text-xs mt-1 flex items-center gap-1"><MapPin className="w-3 h-3"/>{s.location}</p>}
                          </div>
                          <div className="flex-shrink-0 text-slate-400 text-xs flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5"/>
                             {calcDuration(s.startTime, s.endTime)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
            </>
          )}

          {/* ═══════════ ATTENDANCE ═══════════ */}
          {tab === "attendance" && (
            <>
              <div className="mb-8 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-serif font-bold text-white mb-2">Attendance Report</h1>
                <p className="text-slate-400 text-sm">Detailed attendance per course.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label:"Enrolled Courses", value:myCourses.length,      color:"text-white"      },
                  { label:"Total Lectures",   value:allLectures.length,    color:"text-blue-400"   },
                  { label:"Attended",         value:myAttendance.length,   color:"text-[#00D084]"  },
                  { label:"Overall %", value:overallPct!==null?`${overallPct}%`:"—",
                    color:overallPct!==null&&overallPct<75?"text-red-400":"text-yellow-400" },
                ].map(s => (
                  <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              {myCourses.length === 0
                ? <div className="text-center py-20 text-slate-500"><ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30"/><p>No courses enrolled yet.</p></div>
                : selAttCourse === null
                  ? (
                    /* ── Course Selection Grid ── */
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {myCourses.map(c => {
                        const stats    = getStats(c.id);
                        const pctColor = stats.pct===null?"text-slate-400":stats.pct>=75?"text-[#00D084]":stats.pct>=50?"text-yellow-400":"text-red-400";
                        const barColor = stats.pct===null?"bg-slate-600":stats.pct>=75?"bg-[#00D084]":stats.pct>=50?"bg-yellow-400":"bg-red-400";
                        return (
                          <button key={c.id} onClick={() => setSelAttCourse(c.id)}
                            className="bg-[#111827] border border-slate-800 hover:border-[#00D084]/40 rounded-2xl p-5 text-left transition-all group hover:shadow-[0_0_20px_rgba(0,208,132,0.08)]">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{c.code}</span>
                                <h3 className="text-white font-bold mt-2 text-base">{c.name}</h3>
                                <p className="text-slate-500 text-xs mt-0.5">{c.department}</p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-[#00D084] transition-colors flex-shrink-0 mt-1"/>
                            </div>
                            <div className="mb-2 flex justify-between items-center">
                              <span className="text-slate-400 text-xs">Sessions attended</span>
                              <span className={`text-2xl font-bold ${pctColor}`}>{stats.pct!==null?`${stats.pct}%`:"—"}</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${barColor}`} style={{width:stats.pct!==null?`${stats.pct}%`:"0%"}}/>
                            </div>
                            <p className="text-slate-500 text-xs mt-2">{stats.present} of {stats.total} sessions attended</p>
                          </button>
                        );
                      })}
                    </div>
                  )
                  : (() => {
                    /* ── Course Detail View ── */
                    const c = myCourses.find(x => x.id === selAttCourse)!;
                    if (!c) return null;
                    const stats    = getStats(c.id);
                    const pctColor = stats.pct===null?"text-slate-400":stats.pct>=75?"text-[#00D084]":stats.pct>=50?"text-yellow-400":"text-red-400";
                    const barColor = stats.pct===null?"bg-slate-600":stats.pct>=75?"bg-[#00D084]":stats.pct>=50?"bg-yellow-400":"bg-red-400";
                    return (
                      <div>
                        {/* Back button + course header */}
                        <div className="flex items-center gap-3 mb-6">
                          <button onClick={() => setSelAttCourse(null)}
                            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700">
                            <ChevronRight className="w-4 h-4 rotate-180"/>
                          </button>
                          <div>
                            <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full mr-2">{c.code}</span>
                            <span className="text-white font-bold text-lg">{c.name}</span>
                          </div>
                        </div>
                        {/* Stats bar */}
                        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 mb-6">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-slate-400 text-sm">Attendance Rate</span>
                            <span className={`text-3xl font-bold ${pctColor}`}>{stats.pct!==null?`${stats.pct}%`:"—"}</span>
                          </div>
                          <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                            <div className={`h-full rounded-full ${barColor}`} style={{width:stats.pct!==null?`${stats.pct}%`:"0%"}}/>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>{stats.present} sessions attended</span>
                            <span>{stats.total} total sessions</span>
                          </div>
                          {stats.pct!==null&&stats.pct<75&&(
                            <div className="mt-3 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0"/>
                              <span className="text-xs font-semibold">Below 75% — attendance at risk!</span>
                            </div>
                          )}
                        </div>
                        {/* Session list */}
                        <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
                          <div className="px-5 py-4 border-b border-slate-800">
                            <h3 className="text-white font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-[#00D084]"/>Session History</h3>
                          </div>
                          <CourseSessionList courseId={c.id} userId={user?.id || ""} users={users} attendanceEvents={attendanceEvents} />
                        </div>
                      </div>
                    );
                  })()
              }
            </>
          )}

        </div>
      </main>
    </div>
  );
}
