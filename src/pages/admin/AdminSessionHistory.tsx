/**
 * AdminSessionHistory — All past sessions with full attendance breakdown
 * Admin can: view / edit attendance status / remove student from session
 */
import { useState, useCallback } from "react";
import {
  Clock, ChevronRight, CheckCircle, XCircle, UserX, LogOut,
  BookOpen, Users, Calendar, X, Search, Edit3, Trash2,
  Save, AlertTriangle, ChevronDown
} from "lucide-react";
import { useMockData } from "../../context/MockDataContext";
import { useSocket } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";

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

// Override map: sessionId → studentId → new status (or "removed")
type OverrideStatus = "present" | "absent" | "left_early" | "kicked" | "removed";
type OverrideMap = Record<string, Record<string, OverrideStatus>>;

type ViewFilter = "all" | "present" | "absent" | "left_early";

// ── Edit Status Dropdown ─────────────────────────────────────────────────────
function StatusDropdown({ current, onChange, onRemove }: {
  current: string; onChange: (s: OverrideStatus) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const options: { v: OverrideStatus; label: string; color: string }[] = [
    { v: "present",    label: "Present",    color: "text-[#00D084]"  },
    { v: "absent",     label: "Absent",     color: "text-red-400"    },
    { v: "left_early", label: "Left Early", color: "text-yellow-400" },
    { v: "kicked",     label: "Kicked",     color: "text-red-300"    },
  ];
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit status">
        <Edit3 className="w-4 h-4"/>
      </button>
      {open && (
        <div className="absolute right-0 bottom-8 z-[9999] bg-[#1E293B] border border-slate-700 rounded-xl shadow-2xl min-w-[160px] overflow-hidden">
          <p className="text-xs text-slate-500 px-3 pt-2 pb-1 font-semibold uppercase tracking-wider">Set Status</p>
          {options.map(o => (
            <button key={o.v} onClick={() => { onChange(o.v); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 ${o.color} ${current === o.v ? "bg-slate-700/50 font-semibold" : ""}`}>
              {current === o.v && <span className="text-xs">✓</span>}{o.label}
            </button>
          ))}
          <div className="border-t border-slate-700 mt-1">
            <button onClick={() => { onRemove(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5"/>Remove from session
            </button>
          </div>
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>}
    </div>
  );
}

// ── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ studentName, onConfirm, onClose }: {
  studentName: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <Trash2 className="w-7 h-7 text-red-400"/>
        </div>
        <div className="text-center">
          <h2 className="text-white font-bold text-lg">Remove Student?</h2>
          <p className="text-slate-400 text-sm mt-1">Remove <span className="text-white font-semibold">{studentName}</span> from this session record?</p>
          <p className="text-slate-500 text-xs mt-1">This will mark them as absent for this session.</p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 text-sm">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4"/>Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSessionHistory() {
  const { courses, users, enrollments } = useMockData();
  const { attendanceEvents }            = useSocket();
  const toast                           = useToast();

  const [selCourse,    setSelCourse]    = useState<string | null>(null);
  const [selSession,   setSelSession]   = useState<StoredSession | null>(null);
  const [viewFilter,   setViewFilter]   = useState<ViewFilter>("all");
  const [search,       setSearch]       = useState("");
  const [overrides,    setOverrides]    = useState<OverrideMap>({});
  const [pendingDelete, setPendingDelete] = useState<{ studentId: string; studentName: string } | null>(null);
  const [unsaved,      setUnsaved]      = useState(false);

  // Load all sessions
  const loadAllSessions = (): StoredSession[] => {
    const all: StoredSession[] = [];
    try {
      const adminRaw = localStorage.getItem("geo_admin_sessions");
      if (adminRaw) all.push(...(JSON.parse(adminRaw) as StoredSession[]).filter(s => !s.isActive));
    } catch { }
    users.filter(u => u.role === "DOCTOR").forEach(doctor => {
      try {
        const raw = localStorage.getItem("geo_sessions_" + doctor.id);
        if (raw) all.push(...(JSON.parse(raw) as StoredSession[]).filter(s => !s.isActive));
      } catch { }
    });
    const seen = new Set<string>();
    return all
      .filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  };

  const allSessions    = loadAllSessions();
  const courseSessions = selCourse ? allSessions.filter(s => s.courseId === selCourse) : allSessions;

  const getSessionAttendees = (session: StoredSession): StoredAttendee[] => {
    if (session.attendees && session.attendees.length > 0) {
      return session.attendees.map((a: any) => ({
        studentId:   a.studentId,
        studentName: a.studentName,
        timestamp:   a.timestamp,
        geoStatus:   a.geoStatus,
        status:      a.status || "present",
        leftAt:      a.leftAt,
      }));
    }
    return attendanceEvents
      .filter(e => e.sessionId === session.id)
      .map(e => ({ studentId: e.studentId, studentName: e.studentName, timestamp: e.timestamp, geoStatus: e.geoStatus, status: e.status || "present", leftAt: e.leftAt }));
  };

  const getEnrolledStudents = (courseId: string) => {
    const ids = enrollments.filter(e => e.courseId === courseId).map(e => e.studentId);
    return users.filter(u => ids.includes(u.id));
  };

  const getRawStatus = (a: StoredAttendee) => {
    if (a.status === "kicked") return "kicked";
    if (a.status === "left")   return "left_early";
    return "present";
  };

  const buildStudentList = useCallback((session: StoredSession) => {
    const attendees    = getSessionAttendees(session);
    const enrolled     = getEnrolledStudents(session.courseId);
    const attendeeMap  = new Map(attendees.map(a => [a.studentId, a]));
    const sessionOvr   = overrides[session.id] || {};

    return enrolled
      .map(student => {
        const att        = attendeeMap.get(student.id);
        const rawStatus  = att ? getRawStatus(att) : "absent";
        const effStatus: OverrideStatus = sessionOvr[student.id] ?? rawStatus as OverrideStatus;
        return {
          student, att,
          rawStatus, effStatus,
          isOverridden: student.id in sessionOvr,
          timestamp: att?.timestamp, leftAt: att?.leftAt,
        };
      })
      .filter(s => s.effStatus !== "removed");
  }, [overrides, attendanceEvents, enrollments, users]);

  // Apply override
  const applyOverride = (sessionId: string, studentId: string, status: OverrideStatus) => {
    setOverrides(prev => ({
      ...prev,
      [sessionId]: { ...(prev[sessionId] || {}), [studentId]: status },
    }));
    setUnsaved(true);
  };

  // Remove student from session
  const removeStudent = (sessionId: string, studentId: string) => {
    applyOverride(sessionId, studentId, "removed");
    toast.success("Student removed from session record");
  };

  // Save overrides to localStorage
  const saveChanges = () => {
    if (!selSession) return;
    const sessionId   = selSession.id;
    const sessionOvr  = overrides[sessionId] || {};

    // Update in admin sessions
    try {
      const raw = localStorage.getItem("geo_admin_sessions");
      if (raw) {
        const sessions = JSON.parse(raw) as StoredSession[];
        const updated  = sessions.map(s => {
          if (s.id !== sessionId) return s;
          const currentAttendees = getSessionAttendees(s);
          const newAttendees = currentAttendees
            .filter(a => sessionOvr[a.studentId] !== "removed")
            .map(a => ({
              ...a,
              status: sessionOvr[a.studentId]
                ? (sessionOvr[a.studentId] === "left_early" ? "left" : sessionOvr[a.studentId])
                : a.status,
            }));
          return { ...s, attendees: newAttendees };
        });
        localStorage.setItem("geo_admin_sessions", JSON.stringify(updated));
      }
    } catch { }

    // Clear overrides for this session
    setOverrides(prev => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    setUnsaved(false);
    toast.success("Changes saved!");
  };

  const filterBtns: { id: ViewFilter; label: string; color: string; activeBg: string }[] = [
    { id: "all",        label: "All",        color: "text-white",      activeBg: "bg-slate-700 border-slate-600"          },
    { id: "present",    label: "Present",    color: "text-[#00D084]",  activeBg: "bg-[#00D084]/10 border-[#00D084]/30"    },
    { id: "absent",     label: "Absent",     color: "text-red-400",    activeBg: "bg-red-500/10 border-red-500/30"        },
    { id: "left_early", label: "Left Early", color: "text-yellow-400", activeBg: "bg-yellow-500/10 border-yellow-500/30"  },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {pendingDelete && (
        <ConfirmDeleteModal
          studentName={pendingDelete.studentName}
          onConfirm={() => { if (selSession) removeStudent(selSession.id, pendingDelete.studentId); }}
          onClose={() => setPendingDelete(null)}
        />
      )}

      {/* Header */}
      <div className="mb-8 border-b border-purple-900/30 pb-6">
        <h1 className="text-3xl font-serif font-bold text-white mb-1">Session History</h1>
        <p className="text-slate-400 text-sm">Browse all completed sessions. Edit or remove attendance records.</p>
      </div>

      {/* Course Filter */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Filter by Course</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setSelCourse(null); setSelSession(null); setUnsaved(false); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${!selCourse ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : "border-slate-800 text-slate-400 hover:border-slate-700"}`}>
            All Courses
          </button>
          {courses.map(c => (
            <button key={c.id} onClick={() => { setSelCourse(c.id); setSelSession(null); setUnsaved(false); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${selCourse === c.id ? "bg-purple-500/10 text-purple-400 border-purple-500/30" : "border-slate-800 text-slate-400 hover:border-slate-700"}`}>
              {c.code} — {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Session List ── */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-purple-400"/>Completed Sessions</h2>
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
                const hasChanges = !!(overrides[s.id] && Object.keys(overrides[s.id]).length > 0);
                return (
                  <button key={s.id} onClick={() => { setSelSession(s); setSearch(""); setViewFilter("all"); }}
                    className={`w-full text-left px-5 py-4 border-b border-slate-800/50 last:border-0 transition-all hover:bg-slate-800/40 ${isSelected ? "bg-purple-500/10 border-l-2 border-l-purple-500" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white font-semibold text-sm truncate">{s.courseName}</p>
                          {hasChanges && <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 rounded-full flex-shrink-0">edited</span>}
                        </div>
                        <p className="text-purple-400 text-xs font-mono">{s.courseCode} #{String(courseSessions.length - idx).padStart(2, "0")}</p>
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

        {/* ── Session Detail ── */}
        {selSession ? (() => {
          const students  = buildStudentList(selSession);
          const present   = students.filter(s => s.effStatus === "present");
          const absent    = students.filter(s => s.effStatus === "absent");
          const leftEarly = students.filter(s => s.effStatus === "left_early" || s.effStatus === "kicked");
          const pct       = students.length > 0 ? Math.round((present.length / students.length) * 100) : 0;

          const filtered = students.filter(s => {
            const matchFilter =
              viewFilter === "all"        ? true :
              viewFilter === "present"    ? s.effStatus === "present" :
              viewFilter === "absent"     ? s.effStatus === "absent" :
              viewFilter === "left_early" ? (s.effStatus === "left_early" || s.effStatus === "kicked") : true;
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
                <div className="flex items-center gap-2 flex-shrink-0">
                  {unsaved && (
                    <button onClick={saveChanges}
                      className="flex items-center gap-2 px-4 py-2 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold rounded-lg text-sm transition-all shadow-[0_0_12px_rgba(0,208,132,0.3)]">
                      <Save className="w-4 h-4"/>Save Changes
                    </button>
                  )}
                  <button onClick={() => { setSelSession(null); setUnsaved(false); }} className="text-slate-400 hover:text-white p-1">
                    <X className="w-5 h-5"/>
                  </button>
                </div>
              </div>

              {/* Unsaved changes warning */}
              {unsaved && (
                <div className="mx-6 mt-4 flex items-center gap-2 text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0"/>
                  You have unsaved changes. Click "Save Changes" to persist them.
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-3 px-6 py-4 border-b border-slate-800 flex-wrap">
                {[
                  { l: "Total",      v: students.length,   c: "text-white",       b: "bg-slate-800/50 border-slate-700"          },
                  { l: "Present",    v: present.length,    c: "text-[#00D084]",   b: "bg-[#00D084]/10 border-[#00D084]/20"       },
                  { l: "Absent",     v: absent.length,     c: "text-red-400",     b: "bg-red-500/10 border-red-500/20"           },
                  { l: "Left Early", v: leftEarly.length,  c: "text-yellow-400",  b: "bg-yellow-500/10 border-yellow-500/20"     },
                  { l: "Rate",       v: pct + "%",         c: pct>=70?"text-[#00D084]":pct>=50?"text-yellow-400":"text-red-400",
                    b: "bg-purple-500/10 border-purple-500/20" },
                ].map(s => (
                  <div key={s.l} className={`flex-1 min-w-[65px] text-center rounded-xl border py-3 ${s.b}`}>
                    <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Filter + Search */}
              <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-2 flex-wrap">
                <div className="flex gap-1">
                  {filterBtns.map(f => (
                    <button key={f.id} onClick={() => setViewFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${viewFilter === f.id ? f.color + " " + f.activeBg : "text-slate-500 border-transparent hover:border-slate-700"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="relative ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or ID..."
                    className="bg-[#1E293B] border border-slate-700 text-white pl-8 pr-4 py-1.5 rounded-lg text-xs focus:outline-none focus:border-purple-500 w-52"/>
                </div>
              </div>

              {/* Student rows */}
              <div className="overflow-y-auto max-h-[420px] overflow-x-visible">
                {filtered.length === 0 ? (
                  <p className="text-slate-500 text-center py-10 text-sm">No students match filter</p>
                ) : filtered.map(({ student, effStatus, isOverridden, timestamp, leftAt }) => (
                  <div key={student.id} className={`relative flex items-center gap-3 px-6 py-3 border-b border-slate-800/50 last:border-0 transition-colors ${isOverridden ? "bg-orange-500/5" : "hover:bg-slate-800/20"}`}>
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      effStatus === "present"    ? "bg-[#00D084]/20 text-[#00D084]" :
                      effStatus === "absent"     ? "bg-red-500/20 text-red-400" :
                      effStatus === "kicked"     ? "bg-red-500/30 text-red-300" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-white text-sm font-medium">{student.firstName} {student.lastName}</p>
                        {isOverridden && <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-1.5 rounded-full">edited</span>}
                      </div>
                      <p className="text-slate-500 text-xs">ID: {(student as any).studentID || "N/A"}</p>
                    </div>
                    {/* Status badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {effStatus === "present"
                        ? <span className="text-xs text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Present</span>
                        : effStatus === "absent"
                        ? <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><XCircle className="w-3 h-3"/>Absent</span>
                        : effStatus === "kicked"
                        ? <span className="text-xs text-red-300 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"><UserX className="w-3 h-3"/>Kicked</span>
                        : <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><LogOut className="w-3 h-3"/>Left Early</span>
                      }
                      {timestamp && <p className="text-slate-600 text-xs hidden sm:block">{fmtTime(timestamp)}</p>}
                      {/* Edit + Delete buttons */}
                      <StatusDropdown
                        current={effStatus}
                        onChange={s => applyOverride(selSession.id, student.id, s)}
                        onRemove={() => setPendingDelete({ studentId: student.id, studentName: student.firstName + " " + student.lastName })}
                      />
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
