/**
 * DoctorSessionHistory — Doctor's own session history
 * Same layout as AdminSessionHistory but filtered to doctor's sessions only
 * Doctor can view: All / Present / Absent / Left Early per session
 */
import { useState } from "react";
import {
  Clock, ChevronRight, CheckCircle, XCircle, UserX, LogOut,
  BookOpen, Users, Calendar, X, Search, Radio
} from "lucide-react";
import { useMockData } from "../../context/MockDataContext";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
}

interface StoredSession {
  id: string; courseId: string; courseName: string; courseCode: string;
  doctorId?: string; startTime: string; endTime?: string; isActive: boolean;
  geoEnabled: boolean; radiusMeters: number;
  attendees?: StoredAttendee[];
}
interface StoredAttendee {
  studentId: string; studentName: string; timestamp: string;
  geoStatus?: string; status?: string; leftAt?: string;
}

type ViewFilter = "all" | "present" | "absent" | "left_early";

export default function DoctorSessionHistory() {
  const { user }                            = useAuth();
  const { courses, users, enrollments }     = useMockData();
  const { attendanceEvents }                = useSocket();

  const [selCourse,    setSelCourse]    = useState<string | null>(null);
  const [selSession,   setSelSession]   = useState<StoredSession | null>(null);
  const [viewFilter,   setViewFilter]   = useState<ViewFilter>("all");
  const [search,       setSearch]       = useState("");

  const myCourses = courses.filter(c => c.doctorId === user?.id);

  // Load this doctor's sessions from localStorage
  const loadDoctorSessions = (): StoredSession[] => {
    const all: StoredSession[] = [];
    try {
      const raw = localStorage.getItem("geo_sessions_" + user?.id);
      if (raw) {
        const sessions = JSON.parse(raw) as StoredSession[];
        all.push(...sessions.filter(s => !s.isActive));
      }
    } catch { }
    // Also include admin-started sessions for this doctor's courses
    try {
      const adminRaw = localStorage.getItem("geo_admin_sessions");
      if (adminRaw) {
        const adminSessions = JSON.parse(adminRaw) as StoredSession[];
        const myCourseIds   = myCourses.map(c => c.id);
        all.push(...adminSessions.filter(s => !s.isActive && myCourseIds.includes(s.courseId)));
      }
    } catch { }
    const seen = new Set<string>();
    return all
      .filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  };

  const allSessions    = loadDoctorSessions();
  const courseSessions = selCourse ? allSessions.filter(s => s.courseId === selCourse) : allSessions;

  // Get attendees for a session
  const getSessionAttendees = (session: StoredSession): StoredAttendee[] => {
    // Try stored attendees first (saved when session ended)
    if (session.attendees && session.attendees.length > 0) {
      // Normalize: AttendanceEvent has status directly, StoredAttendee maps "left" differently
      return session.attendees.map((a: any) => ({
        studentId:   a.studentId,
        studentName: a.studentName,
        timestamp:   a.timestamp,
        geoStatus:   a.geoStatus,
        status:      a.status || "present",
        leftAt:      a.leftAt,
      }));
    }
    // Fallback: SocketContext live events
    return attendanceEvents
      .filter(e => e.sessionId === session.id)
      .map(e => ({
        studentId:   e.studentId, studentName: e.studentName,
        timestamp:   e.timestamp, geoStatus:   e.geoStatus,
        status:      e.status || "present", leftAt: e.leftAt,
      }));
  };

  const getEnrolledStudents = (courseId: string) => {
    const ids = enrollments.filter(e => e.courseId === courseId).map(e => e.studentId);
    return users.filter(u => ids.includes(u.id));
  };

  const getAttendeeStatus = (a: StoredAttendee) => {
    if (a.status === "kicked") return "kicked";
    if (a.status === "left")   return "left_early";
    return "present";
  };

  const buildStudentList = (session: StoredSession) => {
    const attendees    = getSessionAttendees(session);
    const enrolled     = getEnrolledStudents(session.courseId);
    const attendeeMap  = new Map(attendees.map(a => [a.studentId, a]));
    return enrolled.map(student => {
      const att = attendeeMap.get(student.id);
      return {
        student,
        status:    att ? getAttendeeStatus(att) : "absent",
        timestamp: att?.timestamp,
        leftAt:    att?.leftAt,
        geoStatus: att?.geoStatus,
      };
    });
  };

  const filterBtns: { id: ViewFilter; label: string; color: string; activeBg: string }[] = [
    { id: "all",        label: "All",        color: "text-white",       activeBg: "bg-slate-700 border-slate-600"         },
    { id: "present",    label: "Present",    color: "text-[#00D084]",   activeBg: "bg-[#00D084]/10 border-[#00D084]/30"   },
    { id: "absent",     label: "Absent",     color: "text-red-400",     activeBg: "bg-red-500/10 border-red-500/30"       },
    { id: "left_early", label: "Left Early", color: "text-yellow-400",  activeBg: "bg-yellow-500/10 border-yellow-500/30" },
  ];

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
          <span>{allSessions.length} sessions total</span>
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

      {/* Main layout: List + Detail */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Session List (left) ── */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400"/>Completed Sessions
              </h2>
              <span className="text-xs text-slate-500">{courseSessions.length}</span>
            </div>
            <div className="overflow-y-auto max-h-[600px]">
              {courseSessions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">No completed sessions yet</p>
                </div>
              ) : courseSessions.map((s, idx) => {
                const attendees  = getSessionAttendees(s);
                const enrolled   = getEnrolledStudents(s.courseId).length;
                const present    = attendees.filter(a => a.status !== "left" && a.status !== "kicked").length;
                const pct        = enrolled > 0 ? Math.round((present / enrolled) * 100) : 0;
                const isSelected = selSession?.id === s.id;
                return (
                  <button key={s.id} onClick={() => setSelSession(s)}
                    className={`w-full text-left px-5 py-4 border-b border-slate-800/50 last:border-0 transition-all hover:bg-slate-800/40 ${isSelected ? "bg-blue-500/10 border-l-2 border-l-blue-500" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{s.courseName}</p>
                        <p className="text-blue-400 text-xs font-mono">{s.courseCode} #{String(courseSessions.length - idx).padStart(2, "0")}</p>
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

        {/* ── Session Detail (right) ── */}
        {selSession ? (() => {
          const students  = buildStudentList(selSession);
          const present   = students.filter(s => s.status === "present");
          const absent    = students.filter(s => s.status === "absent");
          const leftEarly = students.filter(s => s.status === "left_early");
          const kicked    = students.filter(s => s.status === "kicked");
          const pct       = students.length > 0 ? Math.round((present.length / students.length) * 100) : 0;

          const filtered = students.filter(s => {
            const matchFilter =
              viewFilter === "all"        ? true :
              viewFilter === "present"    ? s.status === "present" :
              viewFilter === "absent"     ? s.status === "absent" :
              viewFilter === "left_early" ? (s.status === "left_early" || s.status === "kicked") : true;
            const q = search.toLowerCase();
            const matchSearch = !search
              || s.student.firstName.toLowerCase().includes(q)
              || s.student.lastName.toLowerCase().includes(q)
              || ((s.student as any).studentID || "").includes(q);
            return matchFilter && matchSearch;
          });

          return (
            <div className="flex-1 bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
              {/* Detail Header */}
              <div className="px-6 py-5 border-b border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-white font-bold text-xl">{selSession.courseName}</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/>Started: {fmt(selSession.startTime)}</span>
                    {selSession.endTime && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/>Ended: {fmt(selSession.endTime)}</span>}
                    {selSession.geoEnabled && <span className="text-blue-400">📍 Geo ({selSession.radiusMeters}m)</span>}
                  </div>
                </div>
                <button onClick={() => setSelSession(null)} className="text-slate-400 hover:text-white flex-shrink-0"><X className="w-5 h-5"/></button>
              </div>

              {/* Stats row */}
              <div className="flex gap-4 px-6 py-4 border-b border-slate-800 flex-wrap">
                {[
                  { l: "Total",      v: students.length,              c: "text-white",      b: "bg-slate-800/50 border-slate-700"          },
                  { l: "Present",    v: present.length,               c: "text-[#00D084]",  b: "bg-[#00D084]/10 border-[#00D084]/20"       },
                  { l: "Absent",     v: absent.length,                c: "text-red-400",    b: "bg-red-500/10 border-red-500/20"           },
                  { l: "Left Early", v: leftEarly.length+kicked.length, c: "text-yellow-400", b: "bg-yellow-500/10 border-yellow-500/20"   },
                  { l: "Rate",       v: pct + "%",                    c: pct>=70?"text-[#00D084]":pct>=50?"text-yellow-400":"text-red-400",
                    b: "bg-blue-500/10 border-blue-500/20" },
                ].map(s => (
                  <div key={s.l} className={`flex-1 min-w-[70px] text-center rounded-xl border py-3 ${s.b}`}>
                    <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Filter + Search row */}
              <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-2 flex-wrap">
                <div className="flex gap-1">
                  {filterBtns.map(f => (
                    <button key={f.id} onClick={() => setViewFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${viewFilter === f.id ? f.color + " " + f.activeBg : "text-slate-500 border-transparent hover:border-slate-700"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="relative ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or ID..."
                    className="bg-[#1E293B] border border-slate-700 text-white pl-8 pr-4 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500 w-52"/>
                </div>
              </div>

              {/* Student rows */}
              <div className="overflow-y-auto max-h-[440px]">
                {filtered.length === 0 ? (
                  <p className="text-slate-500 text-center py-10 text-sm">No students match filter</p>
                ) : filtered.map(({ student, status, timestamp, leftAt }) => (
                  <div key={student.id} className="flex items-center gap-3 px-6 py-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      status === "present"    ? "bg-[#00D084]/20 text-[#00D084]" :
                      status === "absent"     ? "bg-red-500/20 text-red-400" :
                      status === "kicked"     ? "bg-red-500/30 text-red-300" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{student.firstName} {student.lastName}</p>
                      <p className="text-slate-500 text-xs">ID: {(student as any).studentID || "N/A"}</p>
                    </div>
                    {/* Status + time */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {status === "present"
                        ? <span className="text-xs text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Present</span>
                        : status === "absent"
                        ? <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3"/>Absent</span>
                        : status === "kicked"
                        ? <span className="text-xs text-red-300 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"><UserX className="w-3 h-3"/>Kicked</span>
                        : <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><LogOut className="w-3 h-3"/>Left Early</span>
                      }
                      {timestamp && <p className="text-slate-600 text-xs">{fmtTime(timestamp)}{leftAt ? " → " + fmtTime(leftAt) : ""}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })() : (
          <div className="flex-1 bg-[#111827]/50 border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center py-20 text-slate-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30"/>
            <p className="font-medium">Select a session to view details</p>
            <p className="text-sm mt-1 text-slate-600">Click any session from the list on the left</p>
          </div>
        )}
      </div>
    </div>
  );
}
