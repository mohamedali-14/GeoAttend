/**
 * DoctorSessionHistory — reads sessions & attendance directly from Firestore
 */
import { useState, useEffect } from "react";
import {
  Clock, CheckCircle, XCircle, LogOut, UserX,
  BookOpen, Users, Calendar, X, Search, Radio
} from "lucide-react";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useMockData } from "../../context/MockDataContext";

function fmt(val: any) {
  if (!val) return "—";
  const d = val?.toDate ? val.toDate() : new Date(val);
  return d.toLocaleString("en-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(val: any) {
  if (!val) return "—";
  const d = val?.toDate ? val.toDate() : new Date(val);
  return d.toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
}

type ViewFilter = "all" | "present" | "absent" | "left_early";

export default function DoctorSessionHistory() {
  const { user } = useAuth();
  const { courses, enrollments, users } = useMockData();

  const [sessions, setSessions] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, any[]>>({});
  const [selCourse, setSelCourse] = useState<string | null>(null);
  const [selSession, setSelSession] = useState<any | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const myCourses = courses.filter(c => c.doctorId === user?.id);

  // ── Load doctor's ENDED sessions from Firestore ──────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    const q = query(
      collection(db, "sessions"),
      where("professorId", "==", user.id)
    );
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((s: any) => s.status === "ENDED" || s.status === "ended" || s.isActive === false)
        .sort((a: any, b: any) => {
          const tA = a.startTime?.toDate?.()?.getTime() || new Date(a.startTime || 0).getTime();
          const tB = b.startTime?.toDate?.()?.getTime() || new Date(b.startTime || 0).getTime();
          return tB - tA;
        });
      setSessions(all);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user?.id]);

  // ── Load attendance for selected session ─────────────────────────────────────
  useEffect(() => {
    if (!selSession) return;
    if (attendanceMap[selSession.id]) return; // already loaded

    getDocs(query(collection(db, "attendance"), where("sessionId", "==", selSession.id))).then(snap => {
      const att = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAttendanceMap(prev => ({ ...prev, [selSession.id]: att }));
    }).catch(() => {});
  }, [selSession]);

  const courseSessions = selCourse ? sessions.filter(s => s.courseId === selCourse) : sessions;

  const getAttendees = (sess: any) => attendanceMap[sess.id] || [];

  const getEnrolledStudents = (courseId: string) => {
    const ids = enrollments.filter(e => e.courseId === courseId).map(e => e.studentId);
    return users.filter(u => ids.includes(u.id));
  };

  const getStatus = (att: any) => {
    if (!att) return "absent";
    if (att.status === "kicked") return "kicked";
    if (att.status === "left") return "left_early";
    return "present";
  };

  const buildStudentList = (sess: any) => {
    const attendees = getAttendees(sess);
    const enrolled = getEnrolledStudents(sess.courseId);
    const attMap = new Map(attendees.map((a: any) => [a.studentId, a]));
    return enrolled.map(stu => {
      const att = attMap.get(stu.id) as any;
      return { student: stu, status: getStatus(att), timestamp: att?.timestamp, leftAt: att?.leftAt, geoStatus: att?.geoStatus };
    });
  };

  const filterBtns: { id: ViewFilter; label: string; activeBg: string }[] = [
    { id: "all",        label: "All",        activeBg: "bg-slate-700 border-slate-600"         },
    { id: "present",    label: "Present",    activeBg: "bg-[#00D084]/10 border-[#00D084]/30"   },
    { id: "absent",     label: "Absent",     activeBg: "bg-red-500/10 border-red-500/30"       },
    { id: "left_early", label: "Left Early", activeBg: "bg-yellow-500/10 border-yellow-500/30" },
  ];

  const studentList = selSession ? buildStudentList(selSession) : [];
  const filtered = studentList.filter(r => {
    if (viewFilter !== "all" && r.status !== viewFilter) return false;
    const q = search.toLowerCase();
    const name = `${(r.student as any).firstName || ""} ${(r.student as any).lastName || ""}`.toLowerCase();
    return !q || name.includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white mb-1">Session History</h1>
          <p className="text-slate-400 text-sm">All your completed sessions with full attendance breakdown.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Radio className="w-4 h-4 text-blue-400"/>
          <span>{sessions.length} sessions total</span>
        </div>
      </div>

      {/* Course Filter */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Filter by Course</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setSelCourse(null); setSelSession(null); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${!selCourse ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "border-slate-800 text-slate-400 hover:border-slate-700"}`}>
            All Courses
          </button>
          {myCourses.map(c => (
            <button key={c.id} onClick={() => { setSelCourse(c.id); setSelSession(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${selCourse === c.id ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "border-slate-800 text-slate-400 hover:border-slate-700"}`}>
              {c.code} — {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Session List */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400"/>Completed Sessions
              </h2>
              <span className="text-xs text-slate-500">{courseSessions.length}</span>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {loading ? (
                <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
              ) : courseSessions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">No completed sessions yet</p>
                </div>
              ) : courseSessions.map((s: any, idx) => {
                const isSelected = selSession?.id === s.id;
                const course = myCourses.find(c => c.id === s.courseId);
                const enrolled = getEnrolledStudents(s.courseId).length;
                const atts = getAttendees(s);
                const present = atts.filter((a: any) => a.status !== "left" && a.status !== "kicked").length;
                const pct = enrolled > 0 ? Math.round((present / enrolled) * 100) : 0;
                return (
                  <button key={s.id} onClick={() => { setSelSession(s); setViewFilter("all"); setSearch(""); }}
                    className={`w-full text-left px-5 py-4 border-b border-slate-800/50 last:border-0 transition-all hover:bg-slate-800/40 ${isSelected ? "bg-blue-500/10 border-l-2 border-l-blue-500" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{s.courseName || course?.name || "—"}</p>
                        <p className="text-blue-400 text-xs font-mono">{s.courseCode || course?.code} #{String(courseSessions.length - idx).padStart(2, "0")}</p>
                        <p className="text-slate-500 text-xs mt-1">{fmt(s.startTime)}</p>
                        {s.endTime && <p className="text-slate-600 text-xs">→ {fmt(s.endTime)}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${pct >= 70 ? "text-[#00D084]" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>{pct}%</p>
                        <p className="text-slate-500 text-xs">{present}/{enrolled}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="flex-1 min-w-0">
          {!selSession ? (
            <div className="bg-[#111827] border border-slate-800 rounded-xl flex items-center justify-center h-64">
              <div className="text-center text-slate-500">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">Select a session to view details</p>
              </div>
            </div>
          ) : (
            <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
              {/* Session header */}
              <div className="px-6 py-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-white font-bold text-lg">{selSession.courseName}</h2>
                  <p className="text-slate-400 text-xs mt-0.5">{fmt(selSession.startTime)} {selSession.endTime ? `→ ${fmt(selSession.endTime)}` : ""}</p>
                </div>
                <button onClick={() => setSelSession(null)} className="text-slate-400 hover:text-white self-start sm:self-auto"><X className="w-5 h-5"/></button>
              </div>

              {/* Stats */}
              <div className="flex gap-3 px-6 py-4 border-b border-slate-800">
                {(() => {
                  const list = buildStudentList(selSession);
                  const presentC = list.filter(r => r.status === "present").length;
                  const absentC  = list.filter(r => r.status === "absent").length;
                  const leftC    = list.filter(r => r.status === "left_early").length;
                  const kickedC  = list.filter(r => r.status === "kicked").length;
                  return [
                    { l: "Present", v: presentC,  c: "text-[#00D084]",  b: "bg-[#00D084]/10 border-[#00D084]/20" },
                    { l: "Absent",  v: absentC,   c: "text-red-400",    b: "bg-red-500/10 border-red-500/20"     },
                    { l: "Left",    v: leftC,      c: "text-yellow-400", b: "bg-yellow-500/10 border-yellow-500/20" },
                    { l: "Kicked",  v: kickedC,    c: "text-orange-400", b: "bg-orange-500/10 border-orange-500/20" },
                    { l: "Total",   v: list.length, c: "text-white",     b: "bg-slate-800/50 border-slate-700" },
                  ].map(s => (
                    <div key={s.l} className={`flex-1 text-center rounded-xl border py-2.5 ${s.b}`}>
                      <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                      <p className="text-slate-400 text-xs">{s.l}</p>
                    </div>
                  ));
                })()}
              </div>

              {/* Filter + Search */}
              <div className="px-6 py-3 border-b border-slate-800 flex gap-2 flex-wrap items-center">
                {filterBtns.map(f => (
                  <button key={f.id} onClick={() => setViewFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${viewFilter === f.id ? f.activeBg + " text-white" : "border-transparent text-slate-500 hover:border-slate-700"}`}>
                    {f.label}
                  </button>
                ))}
                <div className="relative flex-1 min-w-32">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
                    className="w-full bg-[#1E293B] border border-slate-700 text-white pl-9 pr-4 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500"/>
                </div>
              </div>

              {/* Student list */}
              <div className="overflow-y-auto max-h-[400px] divide-y divide-slate-800/50">
                {filtered.length === 0 ? (
                  <p className="text-slate-500 text-center py-8 text-sm">No students match</p>
                ) : filtered.map((r, i) => {
                  const name = `${(r.student as any).firstName || ""} ${(r.student as any).lastName || ""}`.trim() || (r.student as any).fullName || "Student";
                  return (
                    <div key={i} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-800/30 transition-colors">
                      {(r.student as any).profilePicture ? (
                        <img src={(r.student as any).profilePicture} alt="Profile"
                          className={`w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 ${
                            r.status === "present" ? "border-[#00D084]/40"
                            : r.status === "kicked" ? "border-orange-500/40"
                            : r.status === "left_early" ? "border-yellow-500/40"
                            : "border-red-500/40"}`} />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          r.status === "present" ? "bg-[#00D084]/20 text-[#00D084]"
                          : r.status === "kicked" ? "bg-orange-500/20 text-orange-400"
                          : r.status === "left_early" ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"}` }>
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{name}</p>
                        <p className="text-slate-500 text-xs">
                          {r.timestamp ? `Joined ${fmtTime(r.timestamp)}` : "Absent"}
                          {r.leftAt ? ` · Left ${fmtTime(r.leftAt)}` : ""}
                        </p>
                      </div>
                      {r.status === "kicked"     && <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><UserX className="w-3 h-3"/>Kicked</span>}
                      {r.status === "left_early" && <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><LogOut className="w-3 h-3"/>Left Early</span>}
                      {r.status === "present"    && <span className="text-xs text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Present</span>}
                      {r.status === "absent"     && <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3"/>Absent</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
