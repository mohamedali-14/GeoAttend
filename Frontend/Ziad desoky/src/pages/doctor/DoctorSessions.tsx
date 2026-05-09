/**
 * DoctorSessions — Session management connected to real backend API
 * Falls back to localStorage if backend is unreachable
 */
import { useState, useEffect, useRef } from "react";
import {
  PlayCircle, StopCircle, MapPin, Users, Clock, Wifi,
  CheckCircle, XCircle, AlertTriangle, Radio, QrCode,
  Navigation, X, ChevronDown, Download, Loader2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMockData, type Course } from "../../context/MockDataContext";
import { useSocket, type AttendanceEvent } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import ConnectionStatus from "../../components/ConnectionStatus";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import {
  apiCreateSession, apiStartSession, apiEndSession,
  apiGetSessions, apiGetSessionSummary,
  apiExportSessionPDF, apiExportSessionExcel,
} from "../../services/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Session {
  id: string; courseId: string; courseName: string; courseCode: string;
  startTime: string; endTime?: string; isActive: boolean;
  geoEnabled: boolean; centerLat: number | null; centerLng: number | null;
  radiusMeters: number; attendees: AttendanceEvent[];
  backendId?: string; // real Firestore ID if saved to backend
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
}
function elapsed(startIso: string) {
  const diff = Date.now() - new Date(startIso).getTime();
  return `${String(Math.floor(diff/60000)).padStart(2,"0")}:${String(Math.floor((diff%60000)/1000)).padStart(2,"0")}`;
}

// ── Start Session Modal ───────────────────────────────────────────────────────
function StartSessionModal({
  courses, onStart, onClose,
}: {
  courses: Course[];
  onStart: (d: { courseId: string; geoEnabled: boolean; radiusMeters: number; lat: number|null; lng: number|null; randomCheckEnabled: boolean; selfieEnabled: boolean }) => void;
  onClose: () => void;
}) {
  const [sel, setSel]                 = useState(courses[0]?.id || "");
  const [geoEnabled, setGeo]          = useState(false);
  const [radius, setRadius]           = useState("50");
  const [fetching, setFetching]       = useState(false);
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [geoErr, setGeoErr]           = useState("");
  const [randomCheck, setRandomCheck] = useState(false);
  const [selfie, setSelfie]           = useState(false);
  const toast = useToast();

  const inp = "w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500 transition-all text-sm";
  const lbl = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";

  const fetchLoc = () => {
    setFetching(true); setGeoErr("");
    navigator.geolocation.getCurrentPosition(
      p => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setFetching(false); toast.success("Location captured!"); },
      () => { setGeoErr("Could not get location. Allow location access."); setFetching(false); }
    );
  };

  const handleStart = () => {
    if (!sel) { toast.error("Select a course"); return; }
    if (geoEnabled && !coords) { toast.error("Capture location first"); return; }
    onStart({ courseId: sel, geoEnabled, radiusMeters: parseInt(radius)||50, lat: coords?.lat??null, lng: coords?.lng??null, randomCheckEnabled: randomCheck, selfieEnabled: selfie });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 sticky top-0 bg-[#111827]">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><PlayCircle className="w-5 h-5 text-[#00D084]"/>Start New Session</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          {/* Course */}
          <div>
            <label className={lbl}>Select Course *</label>
            <div className="flex flex-col gap-2">
              {courses.map(c => (
                <button key={c.id} type="button" onClick={() => setSel(c.id)}
                  className={`p-3 rounded-xl border text-left text-sm transition-all ${sel===c.id?"border-[#00D084]/50 bg-[#00D084]/10 text-[#00D084]":"border-slate-700 text-slate-300 hover:border-slate-600"}`}>
                  {c.name} <span className="opacity-60">({c.code})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Geo */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2"><Navigation className="w-4 h-4 text-[#00D084]"/><span className="text-white font-medium text-sm">Geo-Attendance</span></div>
              <button onClick={() => { setGeo(v => !v); setCoords(null); setGeoErr(""); }}
                className={`relative w-11 h-6 rounded-full transition-colors ${geoEnabled?"bg-[#00D084]":"bg-slate-600"}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${geoEnabled?"translate-x-6":"translate-x-1"}`}/>
              </button>
            </div>
            <p className="text-slate-400 text-xs">Students must be within radius to mark attendance</p>
            {geoEnabled && (
              <div className="mt-3 flex flex-col gap-3">
                <div><label className={lbl}>Radius (meters)</label><input type="number" value={radius} onChange={e=>setRadius(e.target.value)} className={inp} min="10" max="500"/></div>
                <button onClick={fetchLoc} disabled={fetching} className="w-full py-2.5 bg-[#00D084]/10 hover:bg-[#00D084]/20 border border-[#00D084]/30 text-[#00D084] font-semibold rounded-lg flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                  <MapPin className="w-4 h-4"/>{fetching?"Getting location...":coords?"✓ Captured — Re-capture":"Capture My Location"}
                </button>
                {coords && <p className="text-xs text-slate-500 text-center">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
                {geoErr && <p className="text-xs text-red-400">{geoErr}</p>}
              </div>
            )}
          </div>

          {/* Random Check */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium text-sm">Random Check-in</p>
              <p className="text-slate-400 text-xs">Send random presence checks to students</p>
            </div>
            <button onClick={() => setRandomCheck(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${randomCheck?"bg-orange-500":"bg-slate-600"}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${randomCheck?"translate-x-6":"translate-x-1"}`}/>
            </button>
          </div>

          {/* Selfie */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-medium text-sm">Selfie Verification</p>
              <p className="text-slate-400 text-xs">Require students to submit a selfie</p>
            </div>
            <button onClick={() => setSelfie(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${selfie?"bg-purple-500":"bg-slate-600"}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${selfie?"translate-x-6":"translate-x-1"}`}/>
            </button>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-800 sticky bottom-0 bg-[#111827]">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">Cancel</button>
          <button onClick={handleStart} className="flex-1 py-2.5 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold rounded-lg flex items-center justify-center gap-2">
            <PlayCircle className="w-4 h-4"/>Start Session
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Live Session Card ─────────────────────────────────────────────────────────
function LiveSessionCard({ session, onEnd }: { session: Session; onEnd: (id: string) => void }) {
  const [e_, setE]        = useState(elapsed(session.startTime));
  const [loading, setL]   = useState(false);
  useEffect(() => {
    const iv = setInterval(() => setE(elapsed(session.startTime)), 1000);
    return () => clearInterval(iv);
  }, [session.startTime]);

  const present = session.attendees.filter(a => a.status !== "left" && a.status !== "kicked").length;

  return (
    <div className="bg-[#111827] border border-[#00D084]/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,208,132,0.08)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00D084] animate-pulse"/>
          <div>
            <h3 className="text-white font-bold">{session.courseName}</h3>
            <p className="text-slate-400 text-xs">{session.courseCode} • Started {formatTime(session.startTime)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[#00D084] text-sm bg-[#00D084]/10 border border-[#00D084]/20 px-3 py-1 rounded-full">{e_}</span>
          {session.geoEnabled && <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full flex items-center gap-1"><Navigation className="w-3 h-3"/>{session.radiusMeters}m</span>}
          <button onClick={async () => { setL(true); try { await onEnd(session.id); } finally { setL(false); } }}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-1.5 transition-all">
            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <StopCircle className="w-4 h-4"/>}End Session
          </button>
        </div>
      </div>
      <div className="flex gap-4 px-5 py-4">
        {[
          { l:"Present",  v:present,                          c:"text-[#00D084]", b:"bg-[#00D084]/10 border-[#00D084]/20" },
          { l:"Left/Out", v:session.attendees.length-present, c:"text-yellow-400", b:"bg-yellow-500/10 border-yellow-500/20" },
          { l:"Total",    v:session.attendees.length,         c:"text-white",     b:"bg-slate-800/50 border-slate-700" },
        ].map(s => (
          <div key={s.l} className={`flex-1 text-center rounded-xl border py-3 ${s.b}`}>
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-slate-400 text-xs mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>
      {session.attendees.length > 0 && (
        <div className="border-t border-slate-800 divide-y divide-slate-800/50 max-h-48 overflow-y-auto">
          {session.attendees.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-2.5">
              {a.status === "kicked" ? <XCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>
                : a.status === "left" ? <ChevronDown className="w-4 h-4 text-yellow-400 flex-shrink-0"/>
                : <CheckCircle className="w-4 h-4 text-[#00D084] flex-shrink-0"/>}
              <span className="text-white text-sm flex-1">{a.studentName}</span>
              <span className="text-slate-500 text-xs">{formatTime(a.timestamp)}</span>
              {a.geoStatus === "inside" && <span className="text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">GPS ✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ended Session Card ────────────────────────────────────────────────────────
function EndedSessionCard({ session }: { session: Session }) {
  const [exporting, setExporting] = useState<"pdf"|"excel"|null>(null);
  const toast = useToast();
  const present = session.attendees.filter(a => a.status !== "kicked").length;
  const pct = session.attendees.length > 0 ? Math.round((present/session.attendees.length)*100) : 0;

  const handleExport = async (type: "pdf"|"excel") => {
    if (!session.backendId) { toast.warning("Export only available for sessions saved to backend"); return; }
    setExporting(type);
    try {
      if (type === "pdf") await apiExportSessionPDF(session.backendId);
      else await apiExportSessionExcel(session.backendId);
      toast.success(`${type.toUpperCase()} exported!`);
    } catch { toast.error("Export failed"); }
    finally { setExporting(null); }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl px-5 py-4 hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-white font-semibold">{session.courseName}</h3>
          <p className="text-slate-400 text-xs">{formatTime(session.startTime)}{session.endTime ? ` → ${formatTime(session.endTime)}` : ""} • {session.attendees.length} attended</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${pct>=70?"text-[#00D084]":pct>=50?"text-yellow-400":"text-red-400"}`}>{session.attendees.length>0?`${pct}%`:"—"}</span>
          {session.backendId && (
            <div className="flex gap-1">
              <button onClick={() => handleExport("pdf")} disabled={!!exporting}
                className="text-xs px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 flex items-center gap-1 transition-all">
                {exporting==="pdf"?<Loader2 className="w-3 h-3 animate-spin"/>:<Download className="w-3 h-3"/>}PDF
              </button>
              <button onClick={() => handleExport("excel")} disabled={!!exporting}
                className="text-xs px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 flex items-center gap-1 transition-all">
                {exporting==="excel"?<Loader2 className="w-3 h-3 animate-spin"/>:<Download className="w-3 h-3"/>}Excel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DoctorSessions() {
  const { user }  = useAuth();
  const { courses } = useMockData();
  const { isConnected, attendanceEvents, emitSession } = useSocket();
  const toast = useToast();

  const myCourses = courses.filter(c => c.doctorId === user?.id);

  const [showStartModal, setShowStartModal] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Helper: map a raw backend session to local Session type
  const mapBackendSession = (s: any): Session => {
    // Check if this session was force-ended locally (persists across refreshes)
    let isZombie = false;
    try { isZombie = JSON.parse(localStorage.getItem("geo_zombie_sessions") || "[]").includes(s.id); } catch {}
    
    return {
      id:           s.id,
      backendId:    s.id,
      courseId:     s.courseId || "",
      courseName:   s.courseName || s.title || s.courseId || "",
      courseCode:   s.courseCode || "",
      startTime:    s.actualStartTime || s.startTime || s.createdAt || new Date().toISOString(),
      endTime:      s.actualEndTime   || s.endTime   || undefined,
      isActive:     isZombie ? false : (s.status === "ACTIVE" || s.isActive === true),
      geoEnabled:   s.geoEnabled ?? false,
      centerLat:    s.location?.lat ?? s.centerLat ?? null,
      centerLng:    s.location?.lng ?? s.centerLng ?? null,
      radiusMeters: s.radiusMeters || s.radius || 50,
      attendees:    [],
    };
  };

  // Real-time synchronization using Firestore (Direct linking like Omar Shabaan)
  useEffect(() => {
    if (!user) return;

    // 1. Listen for ALL sessions and filter locally for both professorId and doctorId
    const unsubSessions = onSnapshot(collection(db, "sessions"), (snap) => {
      const allSessions = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      // Filter: this doctor owns the session (check both fields)
      const mySessions = allSessions.filter(s => 
        s.professorId === user.id || s.doctorId === user.id
      );
      const backendSessions = mySessions.map(s => ({
        ...s,
        backendId: s.id,
        isActive: s.isActive ?? (s.status === "ACTIVE"),
        startTime: s.startTime || s.createdAt || new Date().toISOString(),
      })).map(mapBackendSession);

      setSessions(prev => {
        let zombies: string[] = [];
        try { zombies = JSON.parse(localStorage.getItem("geo_zombie_sessions") || "[]"); } catch {}

        // Merge: keep local-only sessions that haven't been synced to backend yet
        const merged = backendSessions.map(bs => {
          const isZombie = forceEndedRef.current?.has(bs.id) || zombies.includes(bs.id);
          const finalSession = { ...bs, isActive: isZombie ? false : bs.isActive };
          const local = prev.find(p => p.id === bs.id);
          return { ...finalSession, attendees: local?.attendees || [] };
        });
        
        const backendIds = new Set(backendSessions.map(s => s.id));
        const localOnly = prev.filter(s => !backendIds.has(s.id));
        return [...merged, ...localOnly];
      });

      const active = backendSessions.find(s => s.isActive);
      if (active) localStorage.setItem("geo_active_session", JSON.stringify(active));
      else localStorage.removeItem("geo_active_session");
    });

    // 2. Listen for ALL attendance (filter locally by session ID)
    const unsubAttendance = onSnapshot(collection(db, "attendance"), (snap) => {
      const allAtt = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setSessions(prev => prev.map(s => {
        const myAtt = allAtt.filter(a => a.sessionId === s.id);
        return { ...s, attendees: myAtt };
      }));
    });

    return () => {
      unsubSessions();
      unsubAttendance();
    };
  }, [user]);

  // Real-time attendance events
  useEffect(() => {
    if (attendanceEvents.length === 0) return;
    const latest = attendanceEvents[0];
    setSessions(prev => prev.map(s => {
      if (s.id !== latest.sessionId || !s.isActive) return s;
      const exists = s.attendees.some(a => a.studentId === latest.studentId);
      if (!exists) {
        toast.info(`${latest.studentName} joined`);
        return { ...s, attendees: [...s.attendees, { ...latest, status: "present" }] };
      }
      return { ...s, attendees: s.attendees.map(a => a.studentId === latest.studentId ? { ...a, status: latest.status, leftAt: latest.leftAt } : a) };
    }));
  }, [attendanceEvents]);

  const activeSession = sessions.find(s => s.isActive);

  const handleStart = async ({ courseId, geoEnabled, radiusMeters, lat, lng, randomCheckEnabled, selfieEnabled }: {
    courseId: string; geoEnabled: boolean; radiusMeters: number; lat: number|null; lng: number|null;
    randomCheckEnabled: boolean; selfieEnabled: boolean;
  }) => {
    if (activeSession) { toast.warning("End the current session first"); return; }
    const course = myCourses.find(c => c.id === courseId);
    if (!course) return;

    const localId = Math.random().toString(36).slice(2);
    let backendId: string | undefined;

    // Try to save to backend
    try {
      const res: any = await apiCreateSession({
        courseId,
        location: lat && lng ? { lat, lng } : null,
        radiusMeters,
        geoEnabled,
        randomCheckEnabled,
        selfieEnabled,
      } as any);
      backendId = res.sessionId || res.id;
      if (backendId) {
        await apiStartSession(backendId);
      }
    } catch {
      toast.warning("Backend unreachable — session saved locally only");
    }

    const newSession: Session = {
      id:           backendId || localId,
      backendId,
      courseId,
      courseName:   course.name,
      courseCode:   course.code,
      startTime:    new Date().toISOString(),
      isActive:     true,
      geoEnabled,
      centerLat:    lat,
      centerLng:    lng,
      radiusMeters,
      attendees:    [],
    };

    setSessions(prev => [newSession, ...prev]);
    setShowStartModal(false);
    emitSession({ 
      sessionId: newSession.id, courseId, courseName: course.name, 
      action: "started", timestamp: newSession.startTime,
      geoEnabled, centerLat: lat, centerLng: lng, radiusMeters,
      randomCheckEnabled, selfieEnabled,
      doctorId: user?.id,
    });

    // Broadcast active session for students
    localStorage.setItem("geo_active_session", JSON.stringify({
      id: newSession.id, courseId, courseName: course.name, courseCode: course.code,
      geoEnabled, centerLat: lat, centerLng: lng, radiusMeters,
      startTime: newSession.startTime,
    }));

    toast.success(`Session started for ${course.name}`);
  };

  // Track sessions that we force ended locally so Firestore quota errors don't revert them to active
  const forceEndedRef = useRef<Set<string>>(new Set());

  const handleEnd = async (sessionId: string) => {
    const s = sessions.find(x => x.id === sessionId);
    if (!s) return;
    const endTime = new Date().toISOString();

    // Mark as locally ended forever
    forceEndedRef.current.add(sessionId);
    try {
      const zombies = JSON.parse(localStorage.getItem("geo_zombie_sessions") || "[]");
      if (!zombies.includes(sessionId)) zombies.push(sessionId);
      localStorage.setItem("geo_zombie_sessions", JSON.stringify(zombies));
    } catch {}

    // Update UI immediately
    setSessions(prev => prev.map(x => x.id === sessionId ? { ...x, isActive: false, endTime } : x));
    emitSession({ sessionId, courseId: s.courseId, courseName: s.courseName, action: "ended", timestamp: endTime });
    localStorage.removeItem("geo_active_session");
    toast.success("Session ended");

    // Try to end on backend (always try with all available IDs)
    const idsToTry = [...new Set([s.backendId, s.id].filter(Boolean))];
    for (const id of idsToTry) {
      try { await apiEndSession(id); break; } catch { }
    }
  };

  const liveSessions  = sessions.filter(s => s.isActive);
  const endedSessions = sessions.filter(s => !s.isActive);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white mb-1">Sessions</h1>
          <p className="text-slate-400 text-sm">Start a live attendance session for your students.</p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus />
          {!activeSession && (
            <button onClick={() => setShowStartModal(true)}
              className="bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,208,132,0.3)]">
              <PlayCircle className="w-5 h-5"/>Start Session
            </button>
          )}
        </div>
      </div>

      {myCourses.length === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0"/>
          <p className="text-yellow-300 text-sm">No courses yet. Go to <strong>My Courses</strong> and add one first.</p>
        </div>
      )}

      {liveSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4"><Radio className="w-4 h-4 text-[#00D084] animate-pulse"/>Live Now</h2>
          <div className="flex flex-col gap-4">{liveSessions.map(s => <LiveSessionCard key={s.id} session={s} onEnd={handleEnd}/>)}</div>
        </div>
      )}

      {endedSessions.length > 0 && (
        <div>
          <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wider flex items-center gap-2 mb-3"><Clock className="w-4 h-4"/>Past Sessions</h2>
          <div className="flex flex-col gap-3">{endedSessions.map(s => <EndedSessionCard key={s.id} session={s}/>)}</div>
        </div>
      )}

      {liveSessions.length === 0 && endedSessions.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <Radio className="w-12 h-12 mx-auto mb-4 opacity-30"/>
          <p>No sessions yet. Start one for your students to attend!</p>
        </div>
      )}

      {showStartModal && <StartSessionModal courses={myCourses} onStart={handleStart} onClose={() => setShowStartModal(false)}/>}
    </div>
  );
}
