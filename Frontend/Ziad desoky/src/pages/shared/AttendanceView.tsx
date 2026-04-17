/**
 * AttendanceView — shows attendance records for a course/session
 * Used by both Doctor and Admin
 */
import { useState, useMemo } from "react";
import {
  Search, CheckCircle, XCircle, Clock, Users,
  ChevronDown, Download, Filter,
} from "lucide-react";
import { useMockData } from "../../context/MockDataContext";
import { useAuth } from "../../context/AuthContext";

type FilterType = "all" | "present" | "absent";

interface Props {
  /** If provided, filter to a specific course. Otherwise show all. */
  courseId?: string;
  /** If provided, filter to a specific lecture */
  lectureId?: string;
}

export default function AttendanceView({ courseId, lectureId }: Props) {
  const { user }    = useAuth();
  const { users, courses, lectures, enrollments, attendance } = useMockData();
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState<FilterType>("all");
  const [selectedCourse, setSelectedCourse] = useState(courseId || "");
  const [selectedLec,    setSelectedLec]    = useState(lectureId || "");

  const isDoctor = user?.role === "DOCTOR";
  const isAdmin  = user?.role === "ADMIN";

  // Available courses
  const availableCourses = useMemo(() => {
    if (isDoctor) return courses.filter(c => c.doctorId === user?.id);
    return courses;
  }, [courses, isDoctor, user?.id]);

  // Available lectures for selected course
  const availableLectures = useMemo(() => {
    if (!selectedCourse) return lectures.filter(l => isDoctor ? l.doctorId === user?.id : true);
    return lectures.filter(l => l.courseId === selectedCourse && (isDoctor ? l.doctorId === user?.id : true));
  }, [lectures, selectedCourse, isDoctor, user?.id]);

  // Enrolled students for the selected scope
  const enrolledStudents = useMemo(() => {
    if (!selectedCourse) return users.filter(u => u.role === "STUDENT");
    return enrollments
      .filter(e => e.courseId === selectedCourse)
      .map(e => users.find(u => u.id === e.studentId))
      .filter(Boolean) as typeof users;
  }, [enrollments, users, selectedCourse]);

  // Attendance records in scope
  const scopedAttendance = useMemo(() => {
    return attendance.filter(a => {
      if (selectedLec && a.lectureId !== selectedLec) return false;
      if (selectedCourse && a.courseId !== selectedCourse) return false;
      return true;
    });
  }, [attendance, selectedCourse, selectedLec]);

  // Build rows
  const rows = useMemo(() => {
    return enrolledStudents.map(s => {
      const attended = scopedAttendance.filter(a => a.studentId === s.id);
      const totalLec = availableLectures.filter(l => l.status === "COMPLETED" || l.status === "ACTIVE").length;
      const pct      = totalLec > 0 ? Math.round((attended.length / totalLec) * 100) : null;
      const isPresent = selectedLec
        ? attended.some(a => a.lectureId === selectedLec)
        : attended.length > 0;
      return { student: s, attended: attended.length, total: totalLec, pct, isPresent };
    });
  }, [enrolledStudents, scopedAttendance, availableLectures, selectedLec]);

  // Filter + search
  const filtered = rows
    .filter(r => {
      if (filter === "present") return r.isPresent;
      if (filter === "absent")  return !r.isPresent;
      return true;
    })
    .filter(r => {
      const name = `${r.student.firstName} ${r.student.lastName} ${r.student.studentID || ""}`.toLowerCase();
      return name.includes(search.toLowerCase());
    });

  const presentCount = rows.filter(r => r.isPresent).length;
  const absentCount  = rows.length - presentCount;
  const overallPct   = rows.length > 0 ? Math.round((presentCount / rows.length) * 100) : 0;

  const inp = "bg-[#1E293B] border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 transition-all";

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white mb-1">Attendance</h1>
          <p className="text-slate-400 text-sm">Track who attended and who didn't.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm transition-colors">
          <Download className="w-4 h-4" />Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Enrolled",    value: rows.length,    color: "text-white",       bg: "bg-[#111827] border-slate-800" },
          { label: "Present",     value: presentCount,   color: "text-[#00D084]",   bg: "bg-[#00D084]/10 border-[#00D084]/20" },
          { label: "Absent",      value: absentCount,    color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20" },
          { label: "Attendance %",value: `${overallPct}%`, color: overallPct >= 70 ? "text-[#00D084]" : overallPct >= 50 ? "text-yellow-400" : "text-red-400",
            bg: "bg-[#111827] border-slate-800" },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 ${s.bg}`}>
            <p className="text-slate-400 text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {/* Course select */}
        <div className="relative">
          <select value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setSelectedLec(""); }} className={inp}>
            <option value="">All Courses</option>
            {availableCourses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
        </div>

        {/* Lecture select */}
        <div className="relative">
          <select value={selectedLec} onChange={e => setSelectedLec(e.target.value)} className={inp}>
            <option value="">All Lectures</option>
            {availableLectures.map(l => <option key={l.id} value={l.id}>{l.title} — {l.scheduledAt}</option>)}
          </select>
        </div>

        {/* Present/Absent filter */}
        <div className="flex gap-1 bg-[#1E293B] border border-slate-700 rounded-lg p-1">
          {(["all","present","absent"] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"
              }`}>
              {f}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
            className={`${inp} pl-9 w-full`} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3 border-b border-slate-800">
          <span>Student</span>
          <span className="text-center">Attended</span>
          <span className="text-center">Rate</span>
          <span className="text-center">Status</span>
        </div>
        <div className="divide-y divide-slate-800/50">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No students found</p>
            </div>
          ) : filtered.map(({ student, attended, total, pct, isPresent }) => (
            <div key={student.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${isPresent ? "bg-[#00D084]/20 text-[#00D084]" : "bg-slate-700 text-slate-400"}`}>
                  {student.firstName[0]}{student.lastName[0]}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{student.firstName} {student.lastName}</p>
                  <p className="text-slate-500 text-xs">{student.studentID ? `ID: ${student.studentID}` : student.email}</p>
                </div>
              </div>
              <span className="text-center text-slate-300 text-sm">{attended}/{total || "—"}</span>
              <span className={`text-center text-sm font-semibold ${
                pct === null ? "text-slate-500" : pct >= 70 ? "text-[#00D084]" : pct >= 50 ? "text-yellow-400" : "text-red-400"
              }`}>
                {pct !== null ? `${pct}%` : "—"}
              </span>
              <div className="flex justify-center">
                {isPresent
                  ? <span className="flex items-center gap-1 text-xs text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" />Present
                    </span>
                  : <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                      <XCircle className="w-3 h-3" />Absent
                    </span>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
