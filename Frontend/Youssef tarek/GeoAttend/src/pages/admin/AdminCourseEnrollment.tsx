import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Search, UserPlus, UserMinus, ArrowLeft, Users, BookOpen, Hash, CheckCircle } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { useMockData } from "../../context/MockDataContext";

export default function AdminCourseEnrollment() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { courses, users, enrollments, enrollStudent, unenrollStudent } = useMockData();

  const course = courses.find(c => c.id === courseId);
  const students = users.filter(u => u.role === "STUDENT");

  const [search,     setSearch]     = useState("");
  const [tab,        setTab]        = useState<"all" | "enrolled">("all");

  const isEnrolled = (studentId: string) =>
    enrollments.some(e => e.courseId === courseId && e.studentId === studentId);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const match = `${s.firstName} ${s.lastName} ${s.email} ${s.studentID || ""}`.toLowerCase().includes(q);
    if (tab === "enrolled") return match && isEnrolled(s.id);
    return match;
  });

  const enrolledCount = students.filter(s => isEnrolled(s.id)).length;

  if (!course) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-full p-10">
        <div className="text-center text-slate-500">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Course not found.</p>
          <button onClick={() => navigate("/admin/courses")} className="mt-4 text-[#00D084] hover:underline text-sm">← Back to Courses</button>
        </div>
      </div>
    </AdminLayout>
  );

  const doctorUser = users.find(u => u.id === course.doctorId);

  return (
    <AdminLayout>
      <div className="p-6 md:p-10 max-w-5xl mx-auto">

        {/* Back + Header */}
        <button onClick={() => navigate("/admin/courses")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6">
          <ArrowLeft className="w-4 h-4" />Back to Courses
        </button>

        {/* Course info card */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{course.code}</span>
                {course.department && <span className="text-slate-400 text-xs">{course.department}</span>}
              </div>
              <h1 className="text-2xl font-serif font-bold text-white mb-1">{course.name}</h1>
              {doctorUser && (
                <p className="text-slate-400 text-sm">Dr. {doctorUser.firstName} {doctorUser.lastName}</p>
              )}
            </div>
            <div className="flex gap-4 text-center">
              <div className="bg-slate-800 rounded-xl px-5 py-3 border border-slate-700">
                <p className="text-2xl font-bold text-[#00D084]">{enrolledCount}</p>
                <p className="text-slate-400 text-xs mt-0.5">Enrolled</p>
              </div>
              <div className="bg-slate-800 rounded-xl px-5 py-3 border border-slate-700">
                <p className="text-2xl font-bold text-white">{students.length}</p>
                <p className="text-slate-400 text-xs mt-0.5">Total Students</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or student ID..."
              className="w-full bg-[#111827] border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-[#00D084] transition-all text-sm" />
          </div>
          <div className="flex gap-2">
            {(["all","enrolled"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  tab === t
                    ? "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/30"
                    : "bg-[#111827] border-slate-800 text-slate-400 hover:text-white"
                }`}>
                {t === "all" ? `All (${students.length})` : `Enrolled (${enrolledCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Student List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{tab === "enrolled" ? "No enrolled students yet." : "No students found."}</p>
          </div>
        ) : (
          <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto] px-5 py-3 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Student</span>
              <span>Action</span>
            </div>
            {filtered.map((s, i) => {
              const enrolled = isEnrolled(s.id);
              return (
                <div key={s.id}
                  className={`flex items-center justify-between px-5 py-4 transition-colors hover:bg-slate-800/20 ${
                    i < filtered.length - 1 ? "border-b border-slate-800/50" : ""
                  }`}>
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 relative ${
                      enrolled ? "bg-[#00D084]/20 text-[#00D084]" : "bg-slate-700 text-slate-300"
                    }`}>
                      {s.firstName[0]}{s.lastName[0]}
                      {enrolled && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#00D084] rounded-full flex items-center justify-center">
                          <CheckCircle className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm truncate">{s.firstName} {s.lastName}</p>
                      <p className="text-slate-500 text-xs truncate">{s.email}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {s.studentID  && <span className="text-slate-500 text-xs flex items-center gap-1"><Hash className="w-3 h-3" />{s.studentID}</span>}
                        {s.department && <span className="text-slate-500 text-xs">{s.department}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Enroll / Unenroll */}
                  <button
                    onClick={() => enrolled
                      ? unenrollStudent(courseId!, s.id)
                      : enrollStudent(courseId!, s.id)
                    }
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-shrink-0 ml-3 border ${
                      enrolled
                        ? "bg-transparent border-[#00D084]/40 text-[#00D084] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                        : "bg-[#00D084] border-[#00D084] text-gray-900 hover:bg-[#00B070] hover:border-[#00B070]"
                    }`}>
                    {enrolled
                      ? <><UserMinus className="w-3.5 h-3.5" />Enrolled</>
                      : <><UserPlus  className="w-3.5 h-3.5" />Enroll</>
                    }
                  </button>
                </div>
              );
            })}
            <div className="px-5 py-3 border-t border-slate-800 text-slate-500 text-xs">
              Showing {filtered.length} students · {enrolledCount} enrolled in this course
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
