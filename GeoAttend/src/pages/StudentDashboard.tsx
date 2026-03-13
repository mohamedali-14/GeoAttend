import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, MapPin, Home, ClipboardList, Settings, Bell, UserCircle, Calendar, ChevronRight, CheckCircle, XCircle, Clock, BookOpen, UserPlus, UserMinus } from "lucide-react";
import { LectureCard } from "./LectureCard";
import { useAuth } from "../context/AuthContext";
import { useMockData } from "../context/MockDataContext";
import ProfileSettingsModal from "./ProfileSettingsModal";

const DAYS = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"] as const;
type Day = typeof DAYS[number];
const DAY_COLOR: Record<Day,string> = {
  Saturday:  "text-purple-400 bg-purple-500/10 border-purple-500/20",
  Sunday:    "text-blue-400   bg-blue-500/10   border-blue-500/20",
  Monday:    "text-[#00D084]  bg-[#00D084]/10  border-[#00D084]/20",
  Tuesday:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  Wednesday: "text-pink-400   bg-pink-500/10   border-pink-500/20",
  Thursday:  "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

type Tab = "lectures" | "browse" | "schedule" | "attendance";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lectures, courses, schedules, enrollments, attendance, users, enrollStudent, unenrollStudent } = useMockData();
  const [showSettings, setShowSettings] = useState(false);
  const [tab,          setTab]          = useState<Tab>("lectures");
  const [activeDay,    setActiveDay]    = useState<Day>("Sunday");

  const handleLogout = () => { logout(); navigate("/"); };

  // enrolled courses
  const myCourseIds  = enrollments.filter(e => e.studentId === user?.id).map(e => e.courseId);
  const myCourses    = courses.filter(c => myCourseIds.includes(c.id));
  const mySchedules  = schedules.filter(s => myCourseIds.includes(s.courseId));
  const daySchedules = mySchedules.filter(s => s.day === activeDay).sort((a,b) => a.startTime.localeCompare(b.startTime));

  // attendance helpers
  const allLectures  = lectures.filter(l => myCourseIds.includes(l.courseId || "") && (l.status === "COMPLETED" || l.status === "ACTIVE"));
  const myAttendance = attendance.filter(a => a.studentId === user?.id);
  const overallPct   = allLectures.length > 0 ? Math.round((myAttendance.length / allLectures.length) * 100) : null;

  const getStats = (courseId: string) => {
    const total   = lectures.filter(l => l.courseId === courseId && (l.status === "COMPLETED" || l.status === "ACTIVE")).length;
    const present = attendance.filter(a => a.studentId === user?.id && a.courseId === courseId).length;
    const pct     = total > 0 ? Math.round((present/total)*100) : null;
    return { total, present, pct };
  };

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "lectures",   label: "My Lectures",     icon: <Home className="w-5 h-5" />         },
    { id: "browse",     label: "Browse Courses",  icon: <BookOpen className="w-5 h-5" />     },
    { id: "schedule",   label: "Weekly Schedule", icon: <Calendar className="w-5 h-5" />     },
    { id: "attendance", label: "Attendance",      icon: <ClipboardList className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-[#0B1120] font-sans overflow-hidden" dir="ltr">
      {showSettings && <ProfileSettingsModal onClose={() => setShowSettings(false)} />}

      {/* ── Sidebar ── */}
      <aside className="w-64 bg-[#111827] border-r border-slate-800 hidden md:flex flex-col justify-between">
        <div>
          <div className="h-20 flex items-center px-8 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="bg-[#00D084] p-1.5 rounded-lg"><MapPin className="text-gray-900 w-5 h-5" /></div>
              <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
            </div>
          </div>
          <nav className="p-4 flex flex-col gap-1 mt-4">
            {navItems.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-sm ${
                  tab === n.id
                    ? "bg-[#00D084]/10 text-[#00D084] border border-[#00D084]/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent"
                }`}>
                {n.icon}{n.label}
                {tab === n.id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            ))}
            <button onClick={() => setShowSettings(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm border border-transparent">
              <Settings className="w-5 h-5" />Settings & Profile
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
              <p className="text-slate-400 text-xs">ID: {user?.studentID || "N/A"}</p>
            </div>
            <UserCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm">
            <LogOut className="w-5 h-5" />Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto">

          {/* ════════════ MY LECTURES (ORIGINAL) ════════════ */}
          {tab === "lectures" && (
            <>
              <div className="flex items-center justify-between mb-10 border-b border-slate-800 pb-6">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-white mb-2">My Lectures</h1>
                  <p className="text-slate-400 text-sm">View today's schedule and join active sessions.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowSettings(true)}
                    className="p-2 text-slate-400 hover:text-[#00D084] hover:bg-[#00D084]/10 rounded-lg transition-colors" title="Profile & Settings">
                    <UserCircle className="w-5 h-5" />
                  </button>
                  <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-[#00D084] rounded-full"></span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total Lectures", value: lectures.length,                                        color: "text-white"      },
                  { label: "Active Now",     value: lectures.filter(l => l.status === "ACTIVE").length,    color: "text-[#00D084]"  },
                  { label: "Completed",      value: lectures.filter(l => l.status === "COMPLETED").length, color: "text-blue-400"   },
                  { label: "Attendance %",   value: overallPct !== null ? `${overallPct}%` : "—",          color: "text-yellow-400" },
                ].map(s => (
                  <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {lectures.map(l => (
                  <LectureCard key={l.id} lecture={{ _id: l.id, title: l.title, doctor: { name: l.doctorName }, scheduledAt: l.scheduledAt, status: l.status }} />
                ))}
              </div>
            </>
          )}

          {/* ════════════ BROWSE COURSES ════════════ */}
          {tab === "browse" && (
            <>
              <div className="mb-8 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-serif font-bold text-white mb-2">Browse Courses</h1>
                <p className="text-slate-400 text-sm">Enroll in available courses and join active lectures.</p>
              </div>

              {/* Active Lectures section */}
              {lectures.filter(l => l.status === "ACTIVE").length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00D084] animate-pulse inline-block" />
                    Active Lectures Right Now
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
                    {lectures.filter(l => l.status === "ACTIVE").map(l => (
                      <LectureCard key={l.id} lecture={{ _id: l.id, title: l.title, doctor: { name: l.doctorName }, scheduledAt: l.scheduledAt, status: l.status }} />
                    ))}
                  </div>
                </div>
              )}

              {/* All courses */}
              <h2 className="text-lg font-bold text-white mb-4">All Available Courses</h2>
              {courses.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No courses available yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.map(c => {
                    const isEnrolled = myCourseIds.includes(c.id);
                    const doctor     = users.find(u => u.id === c.doctorId);
                    const slotCount  = schedules.filter(s => s.courseId === c.id).length;
                    const enrolledCount = enrollments.filter(e => e.courseId === c.id).length;
                    return (
                      <div key={c.id} className={`bg-[#111827] border rounded-xl p-5 transition-all flex flex-col gap-3 ${isEnrolled ? "border-[#00D084]/30" : "border-slate-800 hover:border-slate-700"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{c.code}</span>
                              {isEnrolled && (
                                <span className="text-xs font-semibold text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">✓ Enrolled</span>
                              )}
                            </div>
                            <h3 className="text-white font-bold text-base truncate">{c.name}</h3>
                            {doctor && <p className="text-slate-400 text-sm mt-0.5">Dr. {doctor.firstName} {doctor.lastName}</p>}
                          </div>
                          <button
                            onClick={() => isEnrolled ? unenrollStudent(c.id, user!.id) : enrollStudent(c.id, user!.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all flex-shrink-0 ${
                              isEnrolled
                                ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                : "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20 hover:bg-[#00D084]/20"
                            }`}>
                            {isEnrolled ? <><UserMinus className="w-4 h-4" />Unenroll</> : <><UserPlus className="w-4 h-4" />Enroll</>}
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
              )}
            </>
          )}

          {/* ════════════ WEEKLY SCHEDULE ════════════ */}
          {tab === "schedule" && (
            <>
              <div className="mb-6 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-serif font-bold text-white mb-2">Weekly Schedule</h1>
                <p className="text-slate-400 text-sm">Your lecture timetable for each day.</p>
              </div>

              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {DAYS.map(d => {
                  const count = mySchedules.filter(s => s.day === d).length;
                  return (
                    <button key={d} onClick={() => setActiveDay(d)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex-shrink-0 border ${
                        activeDay === d ? DAY_COLOR[d] : "bg-[#111827] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                      }`}>
                      {d}
                      {count > 0 && (
                        <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${activeDay === d ? "bg-white/20" : "bg-slate-700"}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {daySchedules.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No classes on {activeDay}</p>
                  <p className="text-sm mt-1 text-slate-600">Enjoy your free day!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {daySchedules.map(s => {
                    const course = myCourses.find(c => c.id === s.courseId);
                    const doctor = course ? users.find(u => u.id === course.doctorId) : null;
                    if (!course) return null;
                    return (
                      <div key={s.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex items-center gap-4 hover:border-slate-700 transition-all">
                        <div className={`flex-shrink-0 text-center px-4 py-3 rounded-xl border ${DAY_COLOR[activeDay]}`}>
                          <p className="text-xs font-semibold opacity-70">START</p>
                          <p className="text-lg font-bold">{s.startTime}</p>
                          <div className="flex items-center justify-center gap-1 mt-1 opacity-60">
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-xs">{s.endTime}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{course.code}</span>
                          <h3 className="text-white font-bold mt-1 truncate">{course.name}</h3>
                          {doctor && <p className="text-slate-400 text-sm mt-0.5">Dr. {doctor.firstName} {doctor.lastName}</p>}
                          {s.location && <p className="text-slate-500 text-xs mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</p>}
                        </div>
                        <div className="flex-shrink-0 text-slate-400 text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {(() => {
                            const [sh,sm] = s.startTime.split(":").map(Number);
                            const [eh,em] = s.endTime.split(":").map(Number);
                            return `${(eh*60+em)-(sh*60+sm)} min`;
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ════════════ ATTENDANCE ════════════ */}
          {tab === "attendance" && (
            <>
              <div className="mb-8 border-b border-slate-800 pb-6">
                <h1 className="text-3xl font-serif font-bold text-white mb-2">Attendance Report</h1>
                <p className="text-slate-400 text-sm">Detailed attendance per course.</p>
              </div>

              {/* Overall stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Enrolled Courses", value: myCourses.length,      color: "text-white"      },
                  { label: "Total Lectures",   value: allLectures.length,    color: "text-blue-400"   },
                  { label: "Attended",         value: myAttendance.length,   color: "text-[#00D084]"  },
                  { label: "Overall %",        value: overallPct !== null ? `${overallPct}%` : "—",
                    color: overallPct !== null && overallPct < 75 ? "text-red-400" : "text-yellow-400" },
                ].map(s => (
                  <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {myCourses.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No courses enrolled yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {myCourses.map(c => {
                    const stats = getStats(c.id);
                    const pct = stats.pct;
                    const pctColor = pct === null ? "text-slate-400" : pct >= 75 ? "text-[#00D084]" : pct >= 50 ? "text-yellow-400" : "text-red-400";
                    const barColor = pct === null ? "bg-slate-600" : pct >= 75 ? "bg-[#00D084]" : pct >= 50 ? "bg-yellow-400" : "bg-red-400";
                    const courseLectures = lectures.filter(l => l.courseId === c.id && (l.status === "COMPLETED" || l.status === "ACTIVE"));
                    return (
                      <div key={c.id} className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                          <div>
                            <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{c.code}</span>
                            <h3 className="text-white font-bold mt-1">{c.name}</h3>
                          </div>
                          <div className={`text-3xl font-bold ${pctColor}`}>{pct !== null ? `${pct}%` : "—"}</div>
                        </div>
                        <div className="px-5 py-4 border-b border-slate-800">
                          <div className="flex justify-between text-xs text-slate-400 mb-2">
                            <span>Attended {stats.present} of {stats.total} lectures</span>
                            {pct !== null && pct < 75 && <span className="text-red-400 font-semibold">⚠ Below 75%</span>}
                          </div>
                          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${barColor}`} style={{ width: pct !== null ? `${pct}%` : "0%" }} />
                          </div>
                        </div>
                        {courseLectures.length === 0 ? (
                          <p className="text-slate-500 text-sm text-center py-6">No lectures held yet.</p>
                        ) : (
                          <div className="divide-y divide-slate-800/60">
                            {courseLectures.map(l => {
                              const wasPresent = attendance.some(a => a.lectureId === l.id && a.studentId === user?.id);
                              return (
                                <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                                  {wasPresent ? <CheckCircle className="w-5 h-5 text-[#00D084] flex-shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{l.title}</p>
                                    <p className="text-slate-500 text-xs">{l.scheduledAt}</p>
                                  </div>
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${wasPresent ? "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                    {wasPresent ? "Present" : "Absent"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}
