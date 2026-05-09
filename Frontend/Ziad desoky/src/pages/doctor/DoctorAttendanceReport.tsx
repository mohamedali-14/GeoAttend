/**
 * DoctorAttendanceReport
 * Features: Doctor Stats API, Attendance report table, Bar charts,
 *           CSV export, Date+Status filters, Print styles
 */
import { useState, useMemo } from "react";
import {
  BarChart2, Download, Printer, Filter, X, Search,
  CheckCircle, XCircle, UserX, LogOut, TrendingUp,
  Users, Calendar, BookOpen, Award
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMockData } from "../../context/MockDataContext";
import { useSocket } from "../../context/SocketContext";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) { return new Date(iso).toISOString().split("T")[0]; }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
}

function exportCSV(rows: any[], filename: string) {
  const header = ["Student Name", "Student ID", "Status", "Check-in", "Course", "Session Date"];
  const lines = [header.join(","), ...rows.map((r: any) =>
    [r.name, r.sid, r.status, r.time, r.course, r.session].map(v => `"${v}"`).join(",")
  )];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  a.download = filename; a.click();
}

function BarChart({ data }: { data: { label: string; present: number; total: number }[] }) {
  const max = Math.max(...data.map(d => d.total), 1);
  if (!data.length) return <p className="text-slate-500 text-sm text-center py-8">No data</p>;
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-2 h-36 min-w-[200px] pb-2">
        {data.map((d, i) => {
          const pct = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0;
          const totalH = Math.max(6, Math.round((d.total / max) * 120));
          const presH  = Math.max(0, Math.round((d.present / max) * 120));
          const color  = pct >= 70 ? "bg-[#00D084]" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 group relative" style={{ minWidth: 48 }}>
              <span className="text-[10px] font-bold text-white">{pct}%</span>
              <div className="flex items-end gap-0.5" style={{ height: 120 }}>
                <div className="w-4 bg-slate-700 rounded-t-sm" style={{ height: totalH }} title={`Total: ${d.total}`} />
                <div className={`w-4 rounded-t-sm ${color}`} style={{ height: presH }} title={`Present: ${d.present}`} />
              </div>
              <span className="text-[9px] text-slate-500 truncate w-full text-center">{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-700 rounded-sm inline-block" />Total</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#00D084] rounded-sm inline-block" />Present</span>
      </div>
    </div>
  );
}

export default function DoctorAttendanceReport() {
  const { user }                        = useAuth();
  const { courses, users, enrollments } = useMockData();
  const { attendanceEvents }            = useSocket();

  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [statusFilt, setStatusFilt] = useState<"all"|"present"|"absent"|"left_early">("all");
  const [search,     setSearch]     = useState("");
  const [selCourse,  setSelCourse]  = useState<string>("all");

  const myCourses = courses.filter(c => c.doctorId === user?.id);

  // Load all ended sessions from localStorage
  const allSessions = useMemo(() => {
    const all: any[] = [];
    const seen = new Set<string>();
    const myCourseIds = new Set(myCourses.map(c => c.id));
    users.filter(u => u.role === "DOCTOR").forEach(doc => {
      try {
        const raw = localStorage.getItem("geo_sessions_" + doc.id);
        if (raw) JSON.parse(raw).filter((s: any) => !s.isActive && myCourseIds.has(s.courseId))
          .forEach((s: any) => { if (!seen.has(s.id)) { seen.add(s.id); all.push(s); } });
      } catch { }
    });
    try {
      const ar = localStorage.getItem("geo_admin_sessions");
      if (ar) JSON.parse(ar).filter((s: any) => !s.isActive && myCourseIds.has(s.courseId))
        .forEach((s: any) => { if (!seen.has(s.id)) { seen.add(s.id); all.push(s); } });
    } catch { }
    return all.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [myCourses.length, users.length]);

  // Apply date + course filters
  const filtered = useMemo(() => allSessions.filter(s => {
    const d = fmtDate(s.startTime);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo   && d > dateTo)   return false;
    if (selCourse !== "all" && s.courseId !== selCourse) return false;
    return true;
  }), [allSessions.length, dateFrom, dateTo, selCourse]);

  // Build flat student rows for the table
  const rows = useMemo(() => {
    const result: any[] = [];
    filtered.forEach(sess => {
      const course  = myCourses.find(c => c.id === sess.courseId);
      const enrolled = enrollments.filter(e => e.courseId === sess.courseId).map(e => e.studentId);
      const students = users.filter(u => enrolled.includes(u.id));
      const attMap   = new Map((sess.attendees || []).map((a: any) => [a.studentId, a]));

      students.forEach(stu => {
        const att = attMap.get(stu.id) as any;
        const evnt = !att ? attendanceEvents.find(e => e.sessionId === sess.id && e.studentId === stu.id) : null;
        const raw  = att?.status || evnt?.status;
        const status = raw === "kicked" ? "kicked" : (att || evnt) && raw !== "kicked" ? "present" : "absent";
        result.push({
          studentId: stu.id,
          name: `${stu.firstName} ${stu.lastName}`,
          sid:  (stu as any).studentID || stu.id.slice(-6),
          status,
          time: att?.timestamp || evnt?.timestamp ? fmtTime(att?.timestamp || evnt?.timestamp) : "—",
          course: course?.code || "",
          courseName: course?.name || "",
          session: fmt(sess.startTime),
          sessionDate: fmtDate(sess.startTime),
        });
      });
    });
    return result;
  }, [filtered.length, users.length, enrollments.length, attendanceEvents.length]);

  // Apply status + search filter
  const tableRows = rows.filter(r => {
    if (statusFilt !== "all" && r.status !== (statusFilt === "left_early" ? "left" : statusFilt)) return false;
    const q = search.toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.sid.includes(q) || r.course.toLowerCase().includes(q);
  });

  // Stats
  const totalSessions  = filtered.length;
  const totalPresent   = rows.filter(r => r.status === "present").length;
  const totalStudents  = rows.length;
  const avgPct = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

  // Chart data per course
  const chartData = myCourses.map(c => {
    const cRows = rows.filter(r => r.course === c.code);
    return { label: c.code, present: cRows.filter(r => r.status === "present").length, total: cRows.length };
  }).filter(d => d.total > 0);

  const handleExport = () => exportCSV(tableRows, `attendance_report_${new Date().toISOString().split("T")[0]}.csv`);

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-white { background: white !important; border: 1px solid #ccc !important; color: black !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-6 border-b border-slate-800 no-print">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Attendance Report</h1>
          <p className="text-slate-400 text-sm mt-1">Detailed view of all session attendance data</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[#00D084]/10 hover:bg-[#00D084]/20 border border-[#00D084]/30 text-[#00D084] text-sm font-semibold rounded-xl transition-all">
            <Download className="w-4 h-4" />Export CSV
          </button>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-semibold rounded-xl transition-all">
            <Printer className="w-4 h-4" />Print
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Sessions",     value: totalSessions, color: "text-blue-400",  icon: <Calendar className="w-5 h-5" />,  bg: "bg-blue-500/10 border-blue-500/20"   },
          { label: "Students",     value: totalStudents, color: "text-white",      icon: <Users className="w-5 h-5" />,     bg: "bg-slate-800 border-slate-700"       },
          { label: "Present",      value: totalPresent,  color: "text-[#00D084]",  icon: <CheckCircle className="w-5 h-5" />, bg: "bg-[#00D084]/10 border-[#00D084]/20" },
          { label: "Avg Rate",     value: `${avgPct}%`,  color: avgPct>=70?"text-[#00D084]":avgPct>=50?"text-yellow-400":"text-red-400",
            icon: <Award className="w-5 h-5" />, bg: "bg-indigo-500/10 border-indigo-500/20" },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 print-white ${s.bg}`}>
            <div className={`mb-2 ${s.color}`}>{s.icon}</div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Chart + Filters side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Bar chart */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 print-white">
          <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#00D084]" />Attendance by Course
          </h2>
          <BarChart data={chartData} />
        </div>

        {/* Filters */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 no-print">
          <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-400" />Filters
          </h2>
          <div className="flex flex-col gap-3">
            {/* Course filter */}
            <select value={selCourse} onChange={e => setSelCourse(e.target.value)}
              className="bg-[#1E293B] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              <option value="all">All Courses</option>
              {myCourses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
            {/* Date range */}
            <div className="flex gap-2 items-center">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="flex-1 bg-[#1E293B] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
              <span className="text-slate-500 text-xs">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="flex-1 bg-[#1E293B] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
            </div>
            {/* Status */}
            <div className="flex gap-2 flex-wrap">
              {(["all","present","absent","left_early"] as const).map(s => (
                <button key={s} onClick={() => setStatusFilt(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    statusFilt === s
                      ? s==="present" ? "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/30"
                      : s==="absent"  ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : s==="left_early" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                      : "bg-slate-700 text-white border-slate-600"
                      : "border-slate-700 text-slate-400 hover:border-slate-600"
                  }`}>
                  {s === "left_early" ? "Left Early" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or ID..."
                className="w-full bg-[#1E293B] border border-slate-700 text-white pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
            </div>
            {/* Clear */}
            {(dateFrom || dateTo || statusFilt !== "all" || search || selCourse !== "all") && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilt("all"); setSearch(""); setSelCourse("all"); }}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 self-start">
                <X className="w-3 h-3" />Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden print-white">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />Student Records
          </h2>
          <span className="text-slate-500 text-sm">{tableRows.length} records</span>
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-5 gap-4 px-5 py-3 bg-slate-900/50 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span className="col-span-2">Student</span>
          <span>Course</span>
          <span>Session</span>
          <span>Status</span>
        </div>

        <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-800/50">
          {tableRows.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No records match your filters</p>
            </div>
          ) : tableRows.map((r, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 px-5 py-3 hover:bg-slate-800/20 transition-colors items-center">
              <div className="md:col-span-2 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  r.status==="present"?"bg-[#00D084]/20 text-[#00D084]":"bg-red-500/20 text-red-400"
                }`}>
                  {r.name.split(" ").map((n: string) => n[0]).join("").slice(0,2)}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{r.name}</p>
                  <p className="text-slate-500 text-xs">ID: {r.sid}</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm">{r.course}</p>
              <p className="text-slate-400 text-xs">{r.session}</p>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border w-fit ${
                r.status==="present" ? "bg-[#00D084]/10 border-[#00D084]/20 text-[#00D084]"
                : r.status==="kicked" ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                : r.status==="left"   ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {r.status==="present" ? <><CheckCircle className="w-3 h-3"/>Present</>
                : r.status==="kicked"  ? <><UserX className="w-3 h-3"/>Kicked</>
                : r.status==="left"    ? <><LogOut className="w-3 h-3"/>Left</>
                : <><XCircle className="w-3 h-3"/>Absent</>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
