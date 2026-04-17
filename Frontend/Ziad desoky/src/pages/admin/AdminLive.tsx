/**
 * AdminLive v2 — Redesigned Live Dashboard
 * Layout: Header → Stats Bar → Active Sessions (full cards) → Split: Feed + Session Log
 * Features: search feed, live attendance %, kick, end/cancel, filter by course/doctor/status
 */
import { useState, useEffect, useMemo } from "react";
import {
  Radio, Users, CheckCircle, Navigation, Trash2, PlayCircle,
  StopCircle, UserX, X, MapPin, Clock, AlertTriangle, UserCheck,
  Filter, Search, LogOut, Save, Activity, TrendingUp, Eye
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { useMockData } from "../../context/MockDataContext";
import ConnectionStatus from "../../components/ConnectionStatus";
import { useToast } from "../../context/ToastContext";

/* ─────────────────────────── helpers ──────────────────────────────────── */
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return new Date(iso).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
}
function elapsed(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const m = Math.floor(s / 60), h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m ${s % 60}s`;
}

/* ─────────────────────────── types ────────────────────────────────────── */
interface AdminSession {
  id: string; courseId: string; courseName: string; courseCode: string;
  doctorId: string; startTime: string; endTime?: string; isActive: boolean;
  geoEnabled: boolean; centerLat: number | null; centerLng: number | null;
  radiusMeters: number; startedByAdmin?: boolean;
}
type FeedStatus = "all" | "present" | "left" | "kicked";

/* ─────────────────────────── sub-components ───────────────────────────── */

// ── Start Session Modal ──────────────────────────────────────────────────────
function StartSessionModal({ onStart, onClose }: {
  onStart: (d: { courseId: string; doctorId: string; geoEnabled: boolean; radiusMeters: number; lat: number | null; lng: number | null }) => void;
  onClose: () => void;
}) {
  const { courses, users, enrollments } = useMockData();
  const toast = useToast();
  const doctors = users.filter(u => u.role === "DOCTOR" && !u.isBanned);
  const [selCourse, setSelCourse] = useState(courses[0]?.id || "");
  const [selDoctor, setSelDoctor] = useState("");
  const [geo, setGeo]             = useState(false);
  const [radius, setR]            = useState("50");
  const [coords, setC]            = useState<{ lat: number; lng: number } | null>(null);
  const [fetching, setF]          = useState(false);

  useEffect(() => {
    const c = courses.find(c => c.id === selCourse);
    if (c) setSelDoctor(c.doctorId);
  }, [selCourse]);

  const enrolledCount = enrollments.filter(e => e.courseId === selCourse).length;

  const capture = () => {
    setF(true);
    navigator.geolocation.getCurrentPosition(
      p => { setC({ lat: p.coords.latitude, lng: p.coords.longitude }); setF(false); toast.success("Location captured!"); },
      () => { toast.error("Could not get location"); setF(false); }
    );
  };

  const inp = "w-full bg-[#0B1120] border border-slate-700 text-white p-3 rounded-xl focus:outline-none focus:border-purple-500 text-sm transition-all";
  const lbl = "block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F1A2E] border border-purple-900/40 rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-purple-400"/>Start New Session
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="w-5 h-5"/></button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Course picker */}
          <div>
            <label className={lbl}>Select Course *</label>
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
              {courses.map(c => {
                const cnt = enrollments.filter(e => e.courseId === c.id).length;
                const dr  = users.find(u => u.id === c.doctorId);
                return (
                  <button key={c.id} type="button" onClick={() => setSelCourse(c.id)}
                    className={`p-3.5 rounded-xl border text-left text-sm transition-all flex items-center justify-between gap-3 ${selCourse === c.id ? "border-purple-500/60 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.15)]" : "border-slate-700/60 hover:border-slate-600 bg-[#111827]"}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold truncate ${selCourse === c.id ? "text-purple-300" : "text-white"}`}>{c.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{c.code}{dr ? ` • Dr. ${dr.firstName} ${dr.lastName}` : ""}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-semibold ${cnt === 0 ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-300"}`}>{cnt} students</span>
                  </button>
                );
              })}
            </div>
            {enrolledCount === 0 && selCourse && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>No enrolled students in this course</p>
            )}
          </div>

          {/* Doctor override */}
          <div>
            <label className={lbl}>Assign Doctor</label>
            <select value={selDoctor} onChange={e => setSelDoctor(e.target.value)} className={inp}>
              <option value="">— Auto from course —</option>
              {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName} ({d.department})</option>)}
            </select>
          </div>

          {/* Geo toggle */}
          <div className="bg-[#111827] border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-400"/>
                <span className="text-white font-semibold text-sm">Geo-Attendance</span>
              </div>
              <button onClick={() => { setGeo(v => !v); setC(null); }}
                className={`relative w-11 h-6 rounded-full transition-colors ${geo ? "bg-purple-500" : "bg-slate-600"}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${geo ? "translate-x-6" : "translate-x-1"}`}/>
              </button>
            </div>
            <p className="text-slate-500 text-xs">Students must be within the radius to mark attendance</p>
            {geo && (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <label className={lbl}>Radius (meters)</label>
                  <input type="number" value={radius} onChange={e => setR(e.target.value)} className={inp} min="10" max="500" placeholder="50"/>
                </div>
                <button onClick={capture} disabled={fetching}
                  className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border transition-all disabled:opacity-60 ${coords ? "border-[#00D084]/40 bg-[#00D084]/10 text-[#00D084]" : "border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"}`}>
                  <MapPin className="w-4 h-4"/>{fetching ? "Getting location..." : coords ? "✓ Captured — Re-capture" : "Capture My Location"}
                </button>
                {coords && <p className="text-xs text-slate-500 text-center">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 font-semibold text-sm hover:bg-slate-700 transition-all">Cancel</button>
          <button onClick={() => {
            const course = courses.find(c => c.id === selCourse);
            if (!course) return;
            if (enrolledCount === 0) { toast.error("No enrolled students!"); return; }
            if (geo && !coords) { toast.error("Capture location first"); return; }
            onStart({ courseId: selCourse, doctorId: selDoctor || course.doctorId, geoEnabled: geo, radiusMeters: parseInt(radius) || 50, lat: coords?.lat ?? null, lng: coords?.lng ?? null });
          }} disabled={enrolledCount === 0}
            className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            <PlayCircle className="w-4 h-4"/>Start Session
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Clear Confirm Modal ──────────────────────────────────────────────────────
function ClearModal({ onClear, onClose }: { onClear: (m: "all" | "keep_present") => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F1A2E] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-400"/>Clear Feed</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 flex flex-col gap-3">
          <button onClick={() => { onClear("keep_present"); onClose(); }}
            className="w-full p-4 rounded-xl border border-[#00D084]/30 bg-[#00D084]/5 hover:bg-[#00D084]/10 text-left transition-all group">
            <p className="text-[#00D084] font-semibold flex items-center gap-2"><UserCheck className="w-4 h-4"/>Keep Present Students Only</p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">Clears the feed but keeps currently present students visible</p>
          </button>
          <button onClick={() => { onClear("all"); onClose(); }}
            className="w-full p-4 rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-left transition-all">
            <p className="text-red-400 font-semibold flex items-center gap-2"><Trash2 className="w-4 h-4"/>Clear Everything</p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">Removes all events from the feed completely</p>
          </button>
        </div>
        <div className="px-5 py-4 border-t border-slate-800">
          <button onClick={onClose} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 font-semibold text-sm transition-all">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── End Session Modal ────────────────────────────────────────────────────────
function EndSessionModal({ session, onEnd, onCancel, onClose }: {
  session: AdminSession; onEnd: () => void; onCancel: () => void; onClose: () => void;
}) {
  const { attendanceEvents } = useSocket();
  const presentCount = attendanceEvents.filter(e => e.sessionId === session.id && (e.status === "present" || !e.status)).length;
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F1A2E] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <StopCircle className="w-8 h-8 text-orange-400"/>
          </div>
          <div className="text-center">
            <h2 className="text-white font-bold text-xl">End Session?</h2>
            <p className="text-slate-400 text-sm mt-1">{session.courseName} — {session.courseCode}</p>
            <div className="flex items-center justify-center gap-4 mt-3 text-sm">
              <span className="text-[#00D084]"><span className="font-bold text-lg">{presentCount}</span> present</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Started {fmtTime(session.startTime)}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 w-full">
            <button onClick={() => { onCancel(); onClose(); }}
              className="w-full py-3 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
              <Save className="w-4 h-4"/>End & Save Attendance
            </button>
            <button onClick={() => { onEnd(); onClose(); }}
              className="w-full py-3 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
              <Trash2 className="w-4 h-4"/>Cancel Session (Discard)
            </button>
            <button onClick={onClose} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-sm font-semibold transition-all">Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Kick Confirm ─────────────────────────────────────────────────────────────
function KickModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F1A2E] border border-slate-700 rounded-2xl w-full max-w-xs shadow-2xl p-6 text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <UserX className="w-7 h-7 text-red-400"/>
        </div>
        <div>
          <h2 className="text-white font-bold text-lg">Kick Student?</h2>
          <p className="text-slate-400 text-sm mt-1">Remove <span className="text-white font-semibold">{name}</span> from the active session?</p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 text-sm font-semibold">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm transition-all">
            <UserX className="w-4 h-4"/>Kick
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── main page ────────────────────────────────── */
export default function AdminLive() {
  const { attendanceEvents, sessionEvents, emitSession, clearEvents, kickStudent } = useSocket();
  const { courses, users, enrollments } = useMockData();
  const toast = useToast();

  const [showStart,    setShowStart]    = useState(false);
  const [showClear,    setShowClear]    = useState(false);
  const [kickTarget,   setKickTarget]   = useState<{ sessionId: string; studentId: string; name: string } | null>(null);
  const [endTarget,    setEndTarget]    = useState<AdminSession | null>(null);
  const [feedStatus,   setFeedStatus]   = useState<FeedStatus>("all");
  const [feedSearch,   setFeedSearch]   = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterDoctor, setFilterDoctor] = useState("all");
  const [elapsedTick,  setElapsedTick]  = useState(0);

  // Tick every second for elapsed timers
  useEffect(() => {
    const iv = setInterval(() => setElapsedTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  // Admin-started sessions
  const [adminSessions, setAdminSessions] = useState<AdminSession[]>(() => {
    try { return JSON.parse(localStorage.getItem("geo_admin_sessions") || "[]"); } catch { return []; }
  });
  useEffect(() => {
    localStorage.setItem("geo_admin_sessions", JSON.stringify(adminSessions));
  }, [adminSessions]);

  // All active sessions (admin + doctor)
  const [allActive, setAllActive] = useState<AdminSession[]>([]);
  useEffect(() => {
    const load = () => {
      const active: AdminSession[] = adminSessions.filter(s => s.isActive);
      const raw = localStorage.getItem("geo_active_session");
      if (raw) {
        try {
          const ds = JSON.parse(raw);
          if (!active.find(s => s.id === ds.id)) {
            const course = courses.find(c => c.id === ds.courseId);
            active.push({ id: ds.id, courseId: ds.courseId, courseName: ds.courseName, courseCode: ds.courseCode || course?.code || "", doctorId: course?.doctorId || "", startTime: ds.startTime, isActive: true, geoEnabled: ds.geoEnabled, centerLat: ds.centerLat, centerLng: ds.centerLng, radiusMeters: ds.radiusMeters });
          }
        } catch { }
      }
      setAllActive(active);
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [adminSessions, courses]);

  const doctors = users.filter(u => u.role === "DOCTOR");

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalEnrolledInActive = useMemo(() => {
    return allActive.reduce((sum, sess) => {
      return sum + enrollments.filter(e => e.courseId === sess.courseId).length;
    }, 0);
  }, [allActive, enrollments]);

  const presentNow  = attendanceEvents.filter(e => e.status === "present" || !e.status).length;
  const leftKicked  = attendanceEvents.filter(e => e.status === "left" || e.status === "kicked").length;
  const attendancePct = totalEnrolledInActive > 0 ? Math.round((presentNow / totalEnrolledInActive) * 100) : 0;

  // ── Feed filter ───────────────────────────────────────────────────────────
  const filteredFeed = useMemo(() => {
    return attendanceEvents.filter(e => {
      const matchStatus =
        feedStatus === "all"     ? true :
        feedStatus === "present" ? (e.status === "present" || !e.status) :
        feedStatus === "left"    ? e.status === "left" :
        feedStatus === "kicked"  ? e.status === "kicked" : true;
      const matchCourse = filterCourse === "all" ? true : e.courseId === filterCourse;
      // Find doctorId from active sessions OR from courses (for past events)
      const sessDoc     = allActive.find(s => s.id === e.sessionId)?.doctorId
                        ?? courses.find(c => c.id === e.courseId)?.doctorId;
      const matchDoctor = filterDoctor === "all" ? true : sessDoc === filterDoctor;
      const q = feedSearch.toLowerCase();
      const matchSearch = !feedSearch || e.studentName.toLowerCase().includes(q) || e.studentId.includes(q);
      return matchStatus && matchCourse && matchDoctor && matchSearch;
    });
  }, [attendanceEvents, feedStatus, filterCourse, filterDoctor, feedSearch, allActive]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStart = (data: { courseId: string; doctorId: string; geoEnabled: boolean; radiusMeters: number; lat: number | null; lng: number | null }) => {
    const course = courses.find(c => c.id === data.courseId);
    if (!course) return;
    const newSession: AdminSession = {
      id: "ADMIN_" + Math.random().toString(36).slice(2, 9),
      courseId: data.courseId, courseName: course.name, courseCode: course.code,
      doctorId: data.doctorId || course.doctorId,
      startTime: new Date().toISOString(), isActive: true,
      geoEnabled: data.geoEnabled, centerLat: data.lat, centerLng: data.lng,
      radiusMeters: data.radiusMeters, startedByAdmin: true,
    };
    setAdminSessions(p => [newSession, ...p]);
    setShowStart(false);

    // Write to geo_active_session so student + doctor pick it up immediately
    const activePayload = { id: newSession.id, courseId: data.courseId, courseName: course.name, courseCode: course.code, geoEnabled: data.geoEnabled, centerLat: data.lat, centerLng: data.lng, radiusMeters: data.radiusMeters, startTime: newSession.startTime };
    localStorage.setItem("geo_active_session", JSON.stringify(activePayload));

    // Also write to doctor's session list so it appears in their history
    const doctorId = data.doctorId || course.doctorId;
    if (doctorId) {
      try {
        const key = "geo_sessions_" + doctorId;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const doctorSession = { ...newSession, attendees: [] };
        localStorage.setItem(key, JSON.stringify([doctorSession, ...existing]));
      } catch { }
    }

    // Emit session started event (visible in all session logs)
    emitSession({ sessionId: newSession.id, courseId: data.courseId, courseName: course.name, action: "started", timestamp: newSession.startTime, doctorId });
    toast.success("Session started for " + course.name);
  };

  const handleEnd = (session: AdminSession) => {
    const endTime = new Date().toISOString();
    setAdminSessions(p => p.map(s => s.id === session.id ? { ...s, isActive: false, endTime } : s));

    // Remove from active session
    const raw = localStorage.getItem("geo_active_session");
    if (raw) { try { if (JSON.parse(raw).id === session.id) localStorage.removeItem("geo_active_session"); } catch { } }

    // Update doctor's session list — mark as ended + save attendees
    if (session.doctorId) {
      try {
        const key = "geo_sessions_" + session.doctorId;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const updated = existing.map((s: any) =>
          s.id === session.id ? { ...s, isActive: false, endTime } : s
        );
        // If session wasn't in doctor's list yet, add it
        if (!existing.find((s: any) => s.id === session.id)) {
          updated.unshift({ ...session, isActive: false, endTime, attendees: [] });
        }
        localStorage.setItem(key, JSON.stringify(updated));
      } catch { }
    }

    // Emit ended event — visible in all session logs
    emitSession({ sessionId: session.id, courseId: session.courseId, courseName: session.courseName, action: "ended", timestamp: endTime });
    toast.success("Session ended and attendance saved");
  };

  const handleCancel = (session: AdminSession) => {
    const endTime = new Date().toISOString();
    setAdminSessions(p => p.map(s => s.id === session.id ? { ...s, isActive: false, endTime } : s));

    // Remove from active session
    const raw = localStorage.getItem("geo_active_session");
    if (raw) { try { if (JSON.parse(raw).id === session.id) localStorage.removeItem("geo_active_session"); } catch { } }

    // Remove from doctor's session list entirely (cancelled = no record)
    if (session.doctorId) {
      try {
        const key = "geo_sessions_" + session.doctorId;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const filtered = existing.filter((s: any) => s.id !== session.id);
        localStorage.setItem(key, JSON.stringify(filtered));
      } catch { }
    }

    // Emit cancelled event
    emitSession({ sessionId: session.id, courseId: session.courseId, courseName: session.courseName, action: "ended", timestamp: endTime });
    toast.warning("Session cancelled — attendance discarded");
  };

  const confirmKick = () => {
    if (!kickTarget) return;
    kickStudent(kickTarget.sessionId, kickTarget.studentId);
    toast.success(kickTarget.name + " has been kicked");
  };

  const hasFilters = filterCourse !== "all" || filterDoctor !== "all" || feedSearch;

  /* ─── render ─── */
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {showStart  && <StartSessionModal onStart={handleStart} onClose={() => setShowStart(false)}/>}
      {showClear  && <ClearModal onClear={clearEvents} onClose={() => setShowClear(false)}/>}
      {kickTarget && <KickModal name={kickTarget.name} onConfirm={confirmKick} onClose={() => setKickTarget(null)}/>}
      {endTarget  && <EndSessionModal session={endTarget} onEnd={() => handleEnd(endTarget)} onCancel={() => handleCancel(endTarget)} onClose={() => setEndTarget(null)}/>}

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-purple-400"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Live Dashboard</h1>
            <p className="text-slate-400 text-xs mt-0.5">Real-time session monitoring & control</p>
          </div>
          <ConnectionStatus/>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(attendanceEvents.length > 0 || sessionEvents.length > 0) && (
            <button onClick={() => setShowClear(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-all">
              <Trash2 className="w-4 h-4"/>Clear Feed
            </button>
          )}
          <button onClick={() => setShowStart(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)]">
            <PlayCircle className="w-4 h-4"/>Start Session
          </button>
        </div>
      </div>

      {/* ══ STATS BAR ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Active Sessions", value: allActive.length,
            sub: allActive.length === 0 ? "No sessions running" : allActive.map(s => s.courseCode).join(", "),
            icon: <Radio className="w-5 h-5"/>, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20",
          },
          {
            label: "Students Present", value: presentNow,
            sub: totalEnrolledInActive > 0 ? `of ${totalEnrolledInActive} enrolled` : "No active sessions",
            icon: <Users className="w-5 h-5"/>, color: "text-[#00D084]", bg: "bg-[#00D084]/10 border-[#00D084]/20",
          },
          {
            label: "Attendance Rate", value: totalEnrolledInActive > 0 ? attendancePct + "%" : "—",
            sub: totalEnrolledInActive > 0 ? (attendancePct >= 70 ? "Good turnout" : attendancePct >= 50 ? "Moderate" : "Low attendance") : "No active sessions",
            icon: <TrendingUp className="w-5 h-5"/>,
            color: totalEnrolledInActive === 0 ? "text-slate-400" : attendancePct >= 70 ? "text-[#00D084]" : attendancePct >= 50 ? "text-yellow-400" : "text-red-400",
            bg: "bg-blue-500/10 border-blue-500/20",
          },
          {
            label: "Left / Kicked", value: leftKicked,
            sub: leftKicked === 0 ? "No early exits" : leftKicked + " student(s) left",
            icon: <LogOut className="w-5 h-5"/>, color: leftKicked > 0 ? "text-red-400" : "text-slate-400",
            bg: "bg-red-500/10 border-red-500/20",
          },
        ].map(s => (
          <div key={s.label} className={`border rounded-2xl p-5 ${s.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{s.label}</p>
              <span className={`${s.color} opacity-70`}>{s.icon}</span>
            </div>
            <p className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</p>
            <p className="text-slate-500 text-xs truncate">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ══ ACTIVE SESSIONS ══════════════════════════════════════════════════ */}
      {allActive.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white font-bold flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 text-purple-400 animate-pulse"/>
            Active Sessions
            <span className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">{allActive.length} live</span>
          </h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {allActive.map(session => {
              const sessAttendees  = attendanceEvents.filter(e => e.sessionId === session.id);
              const present        = sessAttendees.filter(e => e.status === "present" || !e.status);
              const leftEarly      = sessAttendees.filter(e => e.status === "left");
              const kicked         = sessAttendees.filter(e => e.status === "kicked");
              const enrolled       = enrollments.filter(e => e.courseId === session.courseId).length;
              const pct            = enrolled > 0 ? Math.round((present.length / enrolled) * 100) : 0;
              const doctor         = users.find(u => u.id === session.doctorId);
              return (
                <div key={session.id} className="bg-[#0F1A2E] border border-purple-500/20 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.08)]">
                  {/* Card header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse flex-shrink-0"/>
                      <div className="min-w-0">
                        <h3 className="text-white font-bold truncate">{session.courseName}</h3>
                        <p className="text-slate-400 text-xs">
                          {session.courseCode}
                          {doctor && ` • Dr. ${doctor.firstName} ${doctor.lastName}`}
                          {session.startedByAdmin && <span className="ml-1.5 text-purple-400">[Admin]</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-500 hidden sm:block">{elapsed(session.startTime)}</span>
                      <button onClick={() => setEndTarget(session)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-semibold transition-all">
                        <StopCircle className="w-3.5 h-3.5"/>End
                      </button>
                    </div>
                  </div>

                  {/* Mini stats */}
                  <div className="grid grid-cols-4 divide-x divide-slate-800/60 border-b border-slate-800/60">
                    {[
                      { l: "Present",   v: present.length,   c: "text-[#00D084]"  },
                      { l: "Left",      v: leftEarly.length, c: "text-yellow-400" },
                      { l: "Kicked",    v: kicked.length,    c: "text-red-400"    },
                      { l: "Rate",      v: pct + "%",        c: pct>=70?"text-[#00D084]":pct>=50?"text-yellow-400":"text-red-400" },
                    ].map(s => (
                      <div key={s.l} className="text-center py-3">
                        <p className={`text-base font-bold ${s.c}`}>{s.v}</p>
                        <p className="text-slate-500 text-xs">{s.l}</p>
                      </div>
                    ))}
                  </div>

                  {/* Attendance progress bar */}
                  <div className="px-5 py-3 border-b border-slate-800/60">
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>{present.length} present of {enrolled} enrolled</span>
                      <span className={pct >= 70 ? "text-[#00D084]" : pct >= 50 ? "text-yellow-400" : "text-red-400"}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-[#00D084]" : pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                        style={{ width: pct + "%" }}/>
                    </div>
                  </div>

                  {/* Student list */}
                  <div className="max-h-52 overflow-y-auto">
                    {sessAttendees.length === 0 ? (
                      <div className="py-8 text-center text-slate-600">
                        <Users className="w-6 h-6 mx-auto mb-1.5 opacity-40"/>
                        <p className="text-xs">Waiting for students...</p>
                      </div>
                    ) : sessAttendees.map((e, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-2.5 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${e.status === "kicked" ? "bg-red-500/20 text-red-300" : e.status === "left" ? "bg-yellow-500/20 text-yellow-400" : "bg-[#00D084]/20 text-[#00D084]"}`}>
                          {e.studentName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{e.studentName}</p>
                          <p className="text-slate-500 text-xs">{fmtTime(e.timestamp)}{e.leftAt ? " → " + fmtTime(e.leftAt) : ""}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {e.status === "kicked"
                            ? <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">Kicked</span>
                            : e.status === "left"
                            ? <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><LogOut className="w-3 h-3"/>Left</span>
                            : <span className="text-xs text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><CheckCircle className="w-3 h-3"/>Present</span>
                          }
                          {(e.status === "present" || !e.status) && (
                            <button onClick={() => setKickTarget({ sessionId: session.id, studentId: e.studentId, name: e.studentName })}
                              className="p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Kick">
                              <UserX className="w-3.5 h-3.5"/>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ FEED + SESSION LOG ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Attendance Feed (3/5 width) ── */}
        <div className="lg:col-span-3 bg-[#0F1A2E] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          {/* Feed header */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2 flex-wrap">
            <Radio className="w-4 h-4 text-purple-400 animate-pulse flex-shrink-0"/>
            <h2 className="text-white font-bold">Attendance Feed</h2>
            {attendanceEvents.length > 0 && (
              <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">{filteredFeed.length} events</span>
            )}
          </div>

          {/* Filter bar */}
          <div className="px-5 py-3 border-b border-slate-800 bg-[#111827]/50 flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-36">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
              <input value={feedSearch} onChange={e => setFeedSearch(e.target.value)} placeholder="Search student name or ID..."
                className="w-full bg-[#0B1120] border border-slate-700 text-white text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-purple-500 transition-all"/>
            </div>
            {/* Status filter */}
            <div className="flex gap-1">
              {(["all","present","left","kicked"] as FeedStatus[]).map(f => (
                <button key={f} onClick={() => setFeedStatus(f)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${feedStatus === f
                    ? f === "all"     ? "text-white bg-slate-700 border-slate-600"
                    : f === "present" ? "text-[#00D084] bg-[#00D084]/10 border-[#00D084]/30"
                    : f === "left"    ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
                    : "text-red-400 bg-red-500/10 border-red-500/30"
                    : "text-slate-500 border-transparent hover:border-slate-700"}`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Course + Doctor dropdowns */}
          <div className="px-5 py-2.5 border-b border-slate-800/60 flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500"/>
              <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
                className="bg-[#0B1120] border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500">
                <option value="all">All Courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </div>
            <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}
              className="bg-[#0B1120] border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500">
              <option value="all">All Doctors</option>
              {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setFilterCourse("all"); setFilterDoctor("all"); setFeedSearch(""); setFeedStatus("all"); }}
                className="text-xs text-slate-400 hover:text-white border border-slate-700 px-2 py-1 rounded-lg transition-all hover:border-slate-600">
                Clear filters
              </button>
            )}
          </div>

          {/* Feed entries */}
          <div className="overflow-y-auto flex-1 max-h-[420px]">
            {filteredFeed.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">{feedSearch ? "No students match your search" : "Waiting for students to join sessions..."}</p>
              </div>
            ) : filteredFeed.map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${e.status === "kicked" ? "bg-red-500/20 text-red-300" : e.status === "left" ? "bg-yellow-500/20 text-yellow-400" : "bg-[#00D084]/20 text-[#00D084]"}`}>
                  {e.studentName.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{e.studentName}</p>
                  <p className="text-slate-500 text-xs">{courses.find(c => c.id === e.courseId)?.name || "Unknown course"}</p>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                  {e.status === "kicked"
                    ? <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><UserX className="w-3 h-3"/>Kicked</span>
                    : e.status === "left"
                    ? <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><LogOut className="w-3 h-3"/>Left</span>
                    : e.geoStatus === "outside"
                    ? <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><Navigation className="w-3 h-3"/>Outside</span>
                    : <span className="text-xs text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Present</span>
                  }
                  <p className="text-slate-600 text-xs">{timeAgo(e.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Session Log (2/5 width) ── */}
        <div className="lg:col-span-2 bg-[#0F1A2E] border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
            <Clock className="w-4 h-4 text-blue-400"/>
            <h2 className="text-white font-bold">Session Log</h2>
            {sessionEvents.length > 0 && (
              <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full ml-auto">{sessionEvents.length}</span>
            )}
          </div>
          <div className="overflow-y-auto flex-1 max-h-[480px]">
            {sessionEvents.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">No session events yet</p>
              </div>
            ) : sessionEvents.map((e, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 border-b border-slate-800/40 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${e.action === "started" ? "bg-[#00D084]" : "bg-red-400"}`}/>
                <div className="flex-1">
                  <p className="text-white text-sm">
                    <span className={`font-bold ${e.action === "started" ? "text-[#00D084]" : "text-red-400"}`}>
                      {e.action === "started" ? "Started" : "Ended"}
                    </span>
                    {" · "}{e.courseName}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">{timeAgo(e.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
