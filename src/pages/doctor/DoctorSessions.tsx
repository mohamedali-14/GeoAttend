/**
 * DoctorSessions — Session management with Geo-Attendance + Real-time live view
 * Doctor can: Start session, enable geo-radius, see students join live
 */
import { useState, useEffect, useRef } from "react";
import {
  PlayCircle, StopCircle, MapPin, Users, Clock, Wifi,
  CheckCircle, XCircle, AlertTriangle, Radio, QrCode,
  Navigation, X, ChevronDown,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMockData, type Course } from "../../context/MockDataContext";
import { useSocket, type AttendanceEvent } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import ConnectionStatus from "../../components/ConnectionStatus";

// ── Types ────────────────────────────────────────────────────────────────────
interface Session {
  id: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  geoEnabled: boolean;
  centerLat: number | null;
  centerLng: number | null;
  radiusMeters: number;
  attendees: AttendanceEvent[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
}

function elapsed(startIso: string) {
  const diff = Date.now() - new Date(startIso).getTime();
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

// ── Start Session Modal ───────────────────────────────────────────────────────
function StartSessionModal({
  courses, onStart, onClose,
}: {
  courses: Course[];
  onStart: (data: { courseId: string; geoEnabled: boolean; radiusMeters: number; lat: number | null; lng: number | null }) => void;
  onClose: () => void;
}) {
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || "");
  const [geoEnabled, setGeoEnabled]         = useState(false);
  const [radius, setRadius]                 = useState("50");
  const [fetchingGeo, setFetchingGeo]       = useState(false);
  const [geoCoords, setGeoCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError]             = useState("");
  const toast = useToast();

  const fetchLocation = () => {
    setFetchingGeo(true); setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setFetchingGeo(false);
        toast.success("Location captured!");
      },
      () => { setGeoError("Could not get location. Please allow location access."); setFetchingGeo(false); }
    );
  };

  const handleStart = () => {
    if (!selectedCourse) { toast.error("Please select a course"); return; }
    if (geoEnabled && !geoCoords) { toast.error("Please capture location first"); return; }
    onStart({
      courseId: selectedCourse,
      geoEnabled,
      radiusMeters: parseInt(radius) || 50,
      lat: geoCoords?.lat ?? null,
      lng: geoCoords?.lng ?? null,
    });
  };

  const inp = "w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500 transition-all text-sm";
  const lbl = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-[#00D084]" />Start New Session
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          {/* Course select */}
          <div>
            <label className={lbl}>Select Course *</label>
            <div className="relative">
              <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className={inp}>
                <option value="">-- Choose a course --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Geo toggle */}
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#00D084]" />
                <span className="text-white font-medium text-sm">Geo-Attendance</span>
              </div>
              <button onClick={() => { setGeoEnabled(v => !v); setGeoCoords(null); setGeoError(""); }}
                className={`relative w-11 h-6 rounded-full transition-colors ${geoEnabled ? "bg-[#00D084]" : "bg-slate-600"}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${geoEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
            <p className="text-slate-400 text-xs">Students must be within the radius to attend</p>

            {geoEnabled && (
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <label className={lbl}>Radius (meters)</label>
                  <input type="number" value={radius} onChange={e => setRadius(e.target.value)} className={inp} placeholder="50" min="10" max="500" />
                </div>
                <button onClick={fetchLocation} disabled={fetchingGeo}
                  className="w-full py-2.5 bg-[#00D084]/10 hover:bg-[#00D084]/20 border border-[#00D084]/30 text-[#00D084] font-semibold rounded-lg flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-60">
                  <MapPin className="w-4 h-4" />
                  {fetchingGeo ? "Getting location..." : geoCoords ? "✓ Location captured — Re-capture" : "Capture My Location"}
                </button>
                {geoCoords && <p className="text-xs text-slate-500 text-center">{geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)}</p>}
                {geoError && <p className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{geoError}</p>}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-lg border border-slate-700">Cancel</button>
          <button onClick={handleStart}
            className="flex-1 py-2.5 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold rounded-lg flex items-center justify-center gap-2 transition-all">
            <PlayCircle className="w-4 h-4" />Start Session
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Live Session Card ─────────────────────────────────────────────────────────
function LiveSessionCard({ session, onEnd }: { session: Session; onEnd: (id: string) => void }) {
  const [elapsed_,    setElapsed]    = useState(elapsed(session.startTime));
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!session.isActive) return;
    const iv = setInterval(() => setElapsed(elapsed(session.startTime)), 1000);
    return () => clearInterval(iv);
  }, [session.startTime, session.isActive]);

  const present  = session.attendees.filter(a => a.geoStatus !== "outside").length;
  const outside  = session.attendees.filter(a => a.geoStatus === "outside").length;

  return (
    <div className="bg-[#111827] border border-[#00D084]/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,208,132,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00D084] animate-pulse" />
          <div>
            <h3 className="text-white font-bold">{session.courseName}</h3>
            <p className="text-slate-400 text-xs">{session.courseCode} • Started {formatTime(session.startTime)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[#00D084] text-sm bg-[#00D084]/10 border border-[#00D084]/20 px-3 py-1 rounded-full">
            {elapsed_}
          </span>
          {session.geoEnabled && (
            <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full flex items-center gap-1">
              <Navigation className="w-3 h-3" />{session.radiusMeters}m
            </span>
          )}
          <button onClick={() => onEnd(session.id)}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-lg text-sm flex items-center gap-1.5 transition-all">
            <StopCircle className="w-4 h-4" />End
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 px-5 py-4">
        {[
          { label: "Present",  value: present,                    color: "text-[#00D084]", bg: "bg-[#00D084]/10 border-[#00D084]/20" },
          { label: "Outside",  value: outside,                    color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
          { label: "Total",    value: session.attendees.length,   color: "text-white",      bg: "bg-slate-800/50 border-slate-700" },
        ].map(s => (
          <div key={s.label} className={`flex-1 text-center rounded-xl border py-3 ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toggle attendee list */}
      <button onClick={() => setShowDetails(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 border-t border-slate-800 text-slate-400 hover:text-white text-sm transition-colors">
        <span className="flex items-center gap-2"><Users className="w-4 h-4" />Attendees ({session.attendees.length})</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
      </button>

      {showDetails && (
        <div className="px-5 pb-4 flex flex-col gap-2 max-h-64 overflow-y-auto">
          {session.attendees.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Waiting for students to join...</p>
          ) : session.attendees.map((a, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-800/50 last:border-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                {a.studentName.slice(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{a.studentName}</p>
                <p className="text-slate-500 text-xs">{formatTime(a.timestamp)}</p>
              </div>
              {a.geoStatus === "outside" ? (
                <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />Outside
                </span>
              ) : (
                <span className="text-xs text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />Present
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ended Session Card ────────────────────────────────────────────────────────
function EndedSessionCard({ session }: { session: Session }) {
  const [show, setShow] = useState(false);
  const present = session.attendees.filter(a => a.geoStatus !== "outside").length;
  const pct     = session.attendees.length > 0 ? Math.round((present / session.attendees.length) * 100) : 0;

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="text-white font-semibold">{session.courseName}</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {formatTime(session.startTime)} → {session.endTime ? formatTime(session.endTime) : "—"} • {session.attendees.length} attended
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${pct >= 70 ? "text-[#00D084]" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
            {pct}%
          </span>
          <button onClick={() => setShow(v => !v)}
            className="text-slate-400 hover:text-white text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <Users className="w-4 h-4" />View
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${show ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
      {show && (
        <div className="border-t border-slate-800 px-5 pb-4 pt-2 flex flex-col gap-1.5 max-h-48 overflow-y-auto">
          {session.attendees.map((a, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                {a.studentName.slice(0,2).toUpperCase()}
              </div>
              <span className="text-white text-sm flex-1">{a.studentName}</span>
              <span className="text-slate-500 text-xs">{formatTime(a.timestamp)}</span>
              {a.geoStatus === "outside"
                ? <XCircle className="w-4 h-4 text-yellow-400" />
                : <CheckCircle className="w-4 h-4 text-[#00D084]" />}
            </div>
          ))}
        </div>
      )}
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
  const [sessions, setSessions]             = useState<Session[]>(() => {
    try { return JSON.parse(localStorage.getItem("geo_sessions_" + (user?.id || "")) || "[]"); } catch { return []; }
  });

  // Persist sessions
  useEffect(() => {
    localStorage.setItem("geo_sessions_" + (user?.id || ""), JSON.stringify(sessions));
  }, [sessions, user?.id]);

  // Listen to real-time attendance events
  useEffect(() => {
    if (attendanceEvents.length === 0) return;
    const latest = attendanceEvents[0];
    setSessions(prev => prev.map(s => {
      if (s.id !== latest.sessionId || !s.isActive) return s;
      const alreadyIn = s.attendees.some(a => a.studentId === latest.studentId);
      if (alreadyIn) return s;
      toast.info(`${latest.studentName} joined the session`);
      return { ...s, attendees: [...s.attendees, latest] };
    }));
  }, [attendanceEvents]);

  const activeSession = sessions.find(s => s.isActive);

  const handleStart = ({ courseId, geoEnabled, radiusMeters, lat, lng }: {
    courseId: string; geoEnabled: boolean; radiusMeters: number; lat: number | null; lng: number | null;
  }) => {
    if (activeSession) { toast.warning("End the current session first"); return; }
    const course = myCourses.find(c => c.id === courseId);
    if (!course) return;
    const newSession: Session = {
      id:           Math.random().toString(36).slice(2),
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
    emitSession({ sessionId: newSession.id, courseId, courseName: course.name, action: "started", timestamp: newSession.startTime });
    toast.success(`Session started for ${course.name}`);

    // Save active session info for students to pick up
    localStorage.setItem("geo_active_session", JSON.stringify({
      id: newSession.id, courseId, courseName: course.name, courseCode: course.code,
      geoEnabled, centerLat: lat, centerLng: lng, radiusMeters,
      startTime: newSession.startTime,
    }));
  };

  const handleEnd = (sessionId: string) => {
    const s = sessions.find(x => x.id === sessionId);
    if (!s) return;
    setSessions(prev => prev.map(x => x.id === sessionId ? { ...x, isActive: false, endTime: new Date().toISOString() } : x));
    emitSession({ sessionId, courseId: s.courseId, courseName: s.courseName, action: "ended", timestamp: new Date().toISOString() });
    localStorage.removeItem("geo_active_session");
    toast.success("Session ended");
  };

  const liveSessions   = sessions.filter(s => s.isActive);
  const endedSessions  = sessions.filter(s => !s.isActive);

  return (
    <div>
      {/* Header */}
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
              <PlayCircle className="w-5 h-5" />Start Session
            </button>
          )}
        </div>
      </div>

      {/* No courses warning */}
      {myCourses.length === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-yellow-300 text-sm">You have no courses yet. Go to <strong>My Courses</strong> and add a course first.</p>
        </div>
      )}

      {/* Live sessions */}
      {liveSessions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Radio className="w-4 h-4 text-[#00D084] animate-pulse" />Live Now
          </h2>
          <div className="flex flex-col gap-4">
            {liveSessions.map(s => <LiveSessionCard key={s.id} session={s} onEnd={handleEnd} />)}
          </div>
        </div>
      )}

      {/* Past sessions */}
      {endedSessions.length > 0 && (
        <div>
          <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wider flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" />Past Sessions
          </h2>
          <div className="flex flex-col gap-3">
            {endedSessions.map(s => <EndedSessionCard key={s.id} session={s} />)}
          </div>
        </div>
      )}

      {liveSessions.length === 0 && endedSessions.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <QrCode className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No sessions yet. Start one for your students to attend!</p>
        </div>
      )}

      {showStartModal && (
        <StartSessionModal courses={myCourses} onStart={handleStart} onClose={() => setShowStartModal(false)} />
      )}
    </div>
  );
}
