/**
 * DoctorAnalytics — Real backend analytics integration
 * Connects to: /analytics/stats, /analytics/trends, /analytics/course/:id,
 *              /analytics/quick-stats, /monitoring/check-at-risk
 */
import { useState, useEffect } from "react";
import {
  TrendingUp, Users, BookOpen, AlertTriangle,
  BarChart2, RefreshCw, Download, CheckCircle,
  Clock, Award, ChevronDown, ChevronUp
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMockData } from "../../context/MockDataContext";
import {
  apiGetQuickStats, apiGetAttendanceStats,
  apiGetAttendanceTrends, apiGetCourseAnalytics,
  apiCheckAtRiskStudents
} from "../../services/api";
import { SectionErrorBoundary } from "../../components/ErrorBoundary";
import { CardSkeleton } from "../../components/Skeleton";

function StatCard({ label, value, color, icon, sub }: { label: string; value: any; color: string; icon: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
      <div className={`mb-2 ${color}`}>{icon}</div>
      <p className={`text-2xl font-bold ${color}`}>{value ?? "—"}</p>
      <p className="text-slate-400 text-xs mt-0.5">{label}</p>
      {sub && <p className="text-slate-500 text-[10px] mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export default function DoctorAnalytics() {
  const { user } = useAuth();
  const { courses } = useMockData();
  const myCourses = courses.filter(c => c.doctorId === user?.id);

  const [quickStats,   setQuickStats]   = useState<any>(null);
  const [stats,        setStats]        = useState<any>(null);
  const [trends,       setTrends]       = useState<any>(null);
  const [atRisk,       setAtRisk]       = useState<any>(null);
  const [selCourse,    setSelCourse]    = useState(myCourses[0]?.id || "");
  const [courseData,   setCourseData]   = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [expandedRisk, setExpandedRisk] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [q, s, t] = await Promise.all([
        apiGetQuickStats().catch(() => null),
        apiGetAttendanceStats().catch(() => null),
        apiGetAttendanceTrends({ days: 30 }).catch(() => null),
      ]);
      setQuickStats(q?.data || q);
      setStats(s?.data || s);
      setTrends(t?.data || t);
    } catch (e: any) {
      setError("Could not load analytics — make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const loadCourse = async (courseId: string) => {
    if (!courseId) return;
    try {
      const data = await apiGetCourseAnalytics(courseId);
      setCourseData(data?.data || data);
    } catch { setCourseData(null); }
  };

  const loadAtRisk = async (courseId: string) => {
    if (!courseId) return;
    try {
      const data = await apiCheckAtRiskStudents(courseId);
      setAtRisk(data?.data || data);
    } catch { setAtRisk(null); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (selCourse) { loadCourse(selCourse); loadAtRisk(selCourse); }
  }, [selCourse]);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({length:8}).map((_,i) => <CardSkeleton key={i}/>)}
    </div>
  );

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex items-center gap-3">
      <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0"/>
      <div>
        <p className="text-red-300 font-semibold">Backend not connected</p>
        <p className="text-red-400/70 text-sm">{error}</p>
      </div>
      <button onClick={load} className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-all">
        <RefreshCw className="w-3.5 h-3.5"/>Retry
      </button>
    </div>
  );

  return (
    <SectionErrorBoundary>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
            <p className="text-slate-400 text-sm mt-0.5">Live data from backend</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm border border-slate-700 transition-all">
            <RefreshCw className="w-4 h-4"/>Refresh
          </button>
        </div>

        {/* Quick Stats */}
        {quickStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Sessions"   value={quickStats.totalSessions}   color="text-blue-400"   icon={<Clock className="w-5 h-5"/>}/>
            <StatCard label="Total Students"   value={quickStats.totalStudents}   color="text-white"      icon={<Users className="w-5 h-5"/>}/>
            <StatCard label="Avg Attendance"   value={quickStats.avgAttendance ? `${quickStats.avgAttendance}%` : "—"}  color="text-[#00D084]" icon={<CheckCircle className="w-5 h-5"/>}/>
            <StatCard label="Active Courses"   value={quickStats.activeCourses}   color="text-indigo-400" icon={<BookOpen className="w-5 h-5"/>}/>
          </div>
        )}

        {/* Attendance Stats */}
        {stats && (
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#00D084]"/>Attendance Overview
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Present Rate", value: stats.presentRate || stats.overallRate, color: "bg-[#00D084]" },
                { label: "Absent Rate",  value: stats.absentRate,                       color: "bg-red-400"   },
                { label: "Late Rate",    value: stats.lateRate,                         color: "bg-yellow-400"},
              ].filter(s => s.value !== undefined).map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{s.label}</span>
                    <span className="text-white font-bold">{Math.round(s.value)}%</span>
                  </div>
                  <MiniBar pct={s.value} color={s.color}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trends */}
        {trends && Array.isArray(trends) && trends.length > 0 && (
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400"/>30-Day Attendance Trend
            </h3>
            <div className="flex items-end gap-1 h-24">
              {trends.slice(-20).map((t: any, i: number) => {
                const pct = t.rate || t.attendanceRate || 0;
                const h = Math.max(4, Math.round((pct/100)*96));
                const color = pct>=75?"bg-[#00D084]":pct>=50?"bg-yellow-400":"bg-red-400";
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                      {t.date}: {Math.round(pct)}%
                    </div>
                    <div className={`w-full rounded-t-sm ${color}`} style={{height:`${h}px`}}/>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Course Selector + Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400"/>Course Analytics
            </h3>
            <select value={selCourse} onChange={e => setSelCourse(e.target.value)}
              className="w-full bg-[#1E293B] border border-slate-700 text-white px-3 py-2 rounded-lg text-sm mb-4 focus:outline-none focus:border-blue-500">
              {myCourses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>

            {courseData ? (
              <div className="flex flex-col gap-3">
                {[
                  { label: "Total Sessions",  value: courseData.totalSessions },
                  { label: "Enrolled",        value: courseData.totalStudents || courseData.enrolledStudents },
                  { label: "Avg Attendance",  value: courseData.avgAttendanceRate ? `${Math.round(courseData.avgAttendanceRate)}%` : "—" },
                  { label: "Completion Rate", value: courseData.completionRate   ? `${Math.round(courseData.completionRate)}%`   : "—" },
                ].filter(s => s.value !== undefined).map(s => (
                  <div key={s.label} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
                    <span className="text-slate-400 text-sm">{s.label}</span>
                    <span className="text-white font-bold">{s.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">No data available</p>
            )}
          </div>

          {/* At-Risk Students */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400"/>At-Risk Students
              </h3>
              {atRisk?.students?.length > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                  {atRisk.students.length} at risk
                </span>
              )}
            </div>

            {!atRisk ? (
              <p className="text-slate-500 text-sm text-center py-8">Select a course to check</p>
            ) : atRisk.students?.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-8 h-8 text-[#00D084] mx-auto mb-2"/>
                <p className="text-[#00D084] font-semibold text-sm">No at-risk students</p>
                <p className="text-slate-500 text-xs">All students have good attendance</p>
              </div>
            ) : (
              <div>
                <div className={`flex flex-col gap-2 ${!expandedRisk ? "max-h-48 overflow-hidden" : ""}`}>
                  {atRisk.students?.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold text-red-400 flex-shrink-0">
                        {(s.studentName||s.name||"?")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{s.studentName || s.name}</p>
                        <p className="text-red-400 text-xs">{s.attendanceRate ? `${Math.round(s.attendanceRate)}% attendance` : s.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {atRisk.students?.length > 3 && (
                  <button onClick={() => setExpandedRisk(!expandedRisk)}
                    className="w-full text-center text-xs text-slate-400 hover:text-white mt-2 flex items-center justify-center gap-1 transition-colors">
                    {expandedRisk ? <><ChevronUp className="w-3 h-3"/>Show less</> : <><ChevronDown className="w-3 h-3"/>Show {atRisk.students.length - 3} more</>}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionErrorBoundary>
  );
}
