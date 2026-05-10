/**
 * DoctorLiveDashboard — Live view for doctor's own active session
 */
import { useState, useEffect } from "react";
import { apiExportSessionPDF, apiExportSessionExcel, apiGetSessions, apiGetSessionSummary } from "../../services/api";
import {
  Radio, Users, CheckCircle, UserX, LogOut, Clock,
  Navigation, Search, Activity, X, Download, Shuffle
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { useMockData } from "../../context/MockDataContext";
import ConnectionStatus from "../../components/ConnectionStatus";
import { useToast } from "../../context/ToastContext";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

function elapsed(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  const m = Math.floor(s / 60), h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  return `${m}m ${s % 60}s`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
}

type FeedFilter = "all" | "present" | "left" | "kicked";

export default function DoctorLiveDashboard() {
  const { user }                                         = useAuth();
  const { attendanceEvents, kickStudent }                = useSocket();
  const { courses, enrollments, users }                  = useMockData();
  const toast                                            = useToast();

  const [tick,     setTick]     = useState(0);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<FeedFilter>("all");
  const [kickConf, setKickConf] = useState<{ studentId: string; name: string } | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const [backendAttendees, setBackendAttendees] = useState<any[]>([]);

  // Real-time synchronization using Firestore (Direct linking like Omar Shabaan)
  useEffect(() => {
    if (!user) return;
    
    // 1. Listen for ALL sessions to find the active one belonging to this doctor
    //    Check both professorId and doctorId fields (created by different code paths)
    const sessionsQuery = collection(db, "sessions");
    const unsubSessions = onSnapshot(sessionsQuery, (snap) => {
        let zombies: string[] = [];
        try { zombies = JSON.parse(localStorage.getItem("geo_zombie_sessions") || "[]"); } catch {}

        const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const active = sessions.find((s: any) => 
            (s.status === "ACTIVE" || s.isActive) &&
            (s.professorId === user.id || s.doctorId === user.id) &&
            !zombies.includes(s.id)
        );
        setActiveSession(active || null);
    });

    return () => {
        unsubSessions();
    };
  }, [user]);

  // 2. Listen for attendance of active session (separate effect - runs when activeSession changes)
  useEffect(() => {
    if (!activeSession) { setBackendAttendees([]); return; }
    const attQ = query(collection(db, "attendance"), where("sessionId", "==", activeSession.id));
    const unsubSummary = onSnapshot(attQ, (snap) => {
        const attendees = snap.docs.map(d => ({
            sessionId: activeSession.id,
            studentId: d.data().studentId,
            studentName: d.data().studentName || "Student",
            timestamp: d.data().timestamp || new Date().toISOString(),
            status: d.data().status || "present",
            leftAt: d.data().leftAt,
        }));
        setBackendAttendees(attendees);
    });
    return () => unsubSummary();
  }, [activeSession?.id]);

  const enrolled        = activeSession ? enrollments.filter(e => e.courseId === activeSession.courseId).length : 0;
  
  // Merge backend attendees with local socket events (for kicked/left overrides)
  const combinedEvents = [...backendAttendees];
  attendanceEvents.forEach(localEv => {
      if (localEv.sessionId !== activeSession?.id) return;
      const idx = combinedEvents.findIndex(be => be.studentId === localEv.studentId);
      if (idx >= 0) {
          if (localEv.status === "kicked" || localEv.status === "left") {
              combinedEvents[idx] = localEv;
          }
      } else {
          combinedEvents.push(localEv);
      }
  });

  const myEvents        = activeSession ? combinedEvents : [];
  const presentStudents = myEvents.filter(e => e.status === "present" || !e.status);
  const leftStudents    = myEvents.filter(e => e.status === "left");
  const kickedStudents  = myEvents.filter(e => e.status === "kicked");
  const pct             = enrolled > 0 ? Math.round((presentStudents.length / enrolled) * 100) : 0;

  const filteredEvents = myEvents.filter(e => {
    const matchF = filter === "all" ? true : filter === "present" ? (e.status === "present" || !e.status) : e.status === filter;
    const matchS = !search || e.studentName.toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  const handleKick = (studentId: string, name: string) => {
    if (!activeSession) return;
    kickStudent(activeSession.id, studentId);
    toast.success(name + " has been kicked");
    setKickConf(null);
  };

  const handleRandomCheck = () => {
    if (!activeSession) return;
    // Broadcast random check via localStorage for students on same network
    localStorage.setItem("geo_random_check", JSON.stringify({
      sessionId: activeSession.id,
      timestamp: new Date().toISOString(),
      _ts: Date.now(),
    }));
    toast.success("Random Check sent! Students have 2 minutes to respond.");
  };

  return (
    <div>
      {/* Kick confirm modal */}
      {kickConf && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-xs p-6 text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <UserX className="w-7 h-7 text-red-400"/>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Kick Student?</h2>
              <p className="text-slate-400 text-sm mt-1">Remove <span className="text-white font-semibold">{kickConf.name}</span>?</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setKickConf(null)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 text-sm font-semibold">Cancel</button>
              <button onClick={() => handleKick(kickConf.studentId, kickConf.name)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm">
                <UserX className="w-4 h-4"/>Kick
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-slate-800 pb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00D084]/10 border border-[#00D084]/30 flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#00D084]"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Live Dashboard</h1>
            <p className="text-slate-400 text-xs mt-0.5">Monitor your active session in real-time</p>
          </div>
        </div>
        <ConnectionStatus/>
      </div>

      {!activeSession ? (
        <div className="text-center py-24 text-slate-500">
          <div className="w-20 h-20 rounded-2xl bg-slate-800/50 border border-slate-700 flex items-center justify-center mx-auto mb-4">
            <Radio className="w-10 h-10 opacity-30"/>
          </div>
          <p className="text-lg font-semibold text-slate-400">No Active Session</p>
          <p className="text-sm mt-2 text-slate-600">Start a session from the Sessions tab to see live attendance here.</p>
        </div>
      ) : (
        <>
          {/* Active Session Banner */}
          <div className="bg-[#0F1A2E] border border-[#00D084]/25 rounded-2xl p-5 mb-6 shadow-[0_0_25px_rgba(0,208,132,0.06)]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#00D084] animate-pulse flex-shrink-0"/>
                <div>
                  <h2 className="text-white font-bold text-xl">{activeSession.courseName}</h2>
                  <p className="text-slate-400 text-sm">{activeSession.courseCode} • Started {fmtTime(activeSession.startTime)}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[#00D084] font-mono text-lg font-bold">{elapsed(activeSession.startTime)}</p>
                <p className="text-slate-500 text-xs">elapsed</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">👥 {enrolled} enrolled</span>
              {activeSession.geoEnabled && (
                <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-1">
                  <Navigation className="w-3 h-3"/>Geo {activeSession.radiusMeters}m
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { l:"Present", v:presentStudents.length, c:"text-[#00D084]",  b:"bg-[#00D084]/10 border-[#00D084]/20" },
                { l:"Left",    v:leftStudents.length,    c:"text-yellow-400", b:"bg-yellow-500/10 border-yellow-500/20" },
                { l:"Kicked",  v:kickedStudents.length,  c:"text-red-400",    b:"bg-red-500/10 border-red-500/20" },
                { l:"Rate",    v:pct+"%", c:pct>=70?"text-[#00D084]":pct>=50?"text-yellow-400":"text-red-400", b:"bg-slate-800/60 border-slate-700" },
              ].map(s => (
                <div key={s.l} className={`text-center rounded-xl border py-3 ${s.b}`}>
                  <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>{presentStudents.length} present of {enrolled} enrolled</span>
                <span className={pct>=70?"text-[#00D084]":pct>=50?"text-yellow-400":"text-red-400"}>{pct}%</span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${pct>=70?"bg-[#00D084]":pct>=50?"bg-yellow-400":"bg-red-400"}`} style={{width:pct+"%"}}/>
              </div>
            </div>
          </div>

          {/* Student Feed */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden mb-4">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
              <Radio className="w-4 h-4 text-[#00D084] animate-pulse"/>
              <h2 className="text-white font-bold">Student Activity</h2>
              {myEvents.length > 0 && <span className="ml-auto text-xs bg-[#00D084]/20 text-[#00D084] border border-[#00D084]/30 px-2 py-0.5 rounded-full">{filteredEvents.length} students</span>}
            </div>
            <div className="px-5 py-3 border-b border-slate-800 flex gap-2 flex-wrap items-center">
              <div className="relative flex-1 min-w-36">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student..."
                  className="w-full bg-[#0B1120] border border-slate-700 text-white text-xs pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-[#00D084]"/>
              </div>
              <div className="flex gap-1">
                {(["all","present","left","kicked"] as FeedFilter[]).map(f => (
                  <button key={f} onClick={()=>setFilter(f)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${filter===f
                      ? f==="all"?"bg-slate-700 text-white border-slate-600":f==="present"?"bg-[#00D084]/10 text-[#00D084] border-[#00D084]/30":f==="left"?"bg-yellow-500/10 text-yellow-400 border-yellow-500/30":"bg-red-500/10 text-red-400 border-red-500/30"
                      : "text-slate-500 border-transparent hover:border-slate-700"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto max-h-[460px]">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-16 text-slate-600"><Users className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-sm">{search?"No students match":"Waiting for students to join..."}</p></div>
              ) : filteredEvents.map((e,i) => {
                const st = e.status==="kicked"?"kicked":e.status==="left"?"left":"present";
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                    {users.find(u => u.id === e.studentId)?.profilePicture ? (
                      <img src={users.find(u => u.id === e.studentId)!.profilePicture} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-slate-700 flex-shrink-0" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${st==="present"?"bg-[#00D084]/20 text-[#00D084]":st==="left"?"bg-yellow-500/20 text-yellow-400":"bg-red-500/20 text-red-400"}`}>
                        {e.studentName.slice(0,2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold">{e.studentName}</p>
                      <p className="text-slate-500 text-xs">Joined {fmtTime(e.timestamp)}{e.leftAt&&" · Left "+fmtTime(e.leftAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {st==="kicked"?<span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full flex items-center gap-1"><UserX className="w-3 h-3"/>Kicked</span>
                        :st==="left"?<span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full flex items-center gap-1"><LogOut className="w-3 h-3"/>Left</span>
                        :<span className="text-xs text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Present</span>}
                      {st==="present"&&<button onClick={()=>setKickConf({studentId:e.studentId,name:e.studentName})} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><X className="w-3.5 h-3.5"/></button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session Actions */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-wrap gap-3 items-center">
            <span className="text-slate-400 text-sm font-semibold mr-auto">Session Actions</span>
            <button onClick={handleRandomCheck}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-semibold rounded-xl transition-all">
              <Shuffle className="w-4 h-4"/>Random Check
            </button>
            <button onClick={()=>activeSession&&apiExportSessionPDF(activeSession.id).catch(()=>toast.warning("Export requires backend connection"))}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold rounded-xl transition-all">
              <Download className="w-4 h-4"/>Export PDF
            </button>
            <button onClick={()=>activeSession&&apiExportSessionExcel(activeSession.id).catch(()=>toast.warning("Export requires backend connection"))}
              className="flex items-center gap-2 px-4 py-2 bg-[#00D084]/10 hover:bg-[#00D084]/20 border border-[#00D084]/30 text-[#00D084] text-sm font-semibold rounded-xl transition-all">
              <Download className="w-4 h-4"/>Export Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
