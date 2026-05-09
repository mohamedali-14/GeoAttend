import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, BookOpen, Hash, ChevronRight } from "lucide-react";
import { useMockData } from "../../context/MockDataContext";
import Breadcrumbs from "../../components/Breadcrumbs";

export default function AdminEnrollmentHub() {
  const navigate = useNavigate();
  const { courses, users, enrollments } = useMockData();
  const [search, setSearch] = useState("");

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    return `${c.name} ${c.code} ${c.department || ""}`.toLowerCase().includes(q);
  });

  const getEnrolledCount = (courseId: string) =>
    enrollments.filter(e => e.courseId === courseId).length;

  const getDoctorName = (doctorId?: string) => {
    if (!doctorId) return null;
    const d = users.find(u => u.id === doctorId);
    return d ? `Dr. ${d.firstName} ${d.lastName}` : null;
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <Breadcrumbs items={[{ label: "Enrollment" }]} />
      <div className="mb-8 pb-6 border-b border-slate-800">
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Enrollment Management</h1>
        <p className="text-slate-400 text-sm">Select a course to manage its student enrollments.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{courses.length}</p>
          <p className="text-slate-400 text-xs mt-0.5">Total Courses</p>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-[#00D084]">{enrollments.length}</p>
          <p className="text-slate-400 text-xs mt-0.5">Total Enrollments</p>
        </div>
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-400">{users.filter(u => u.role === "STUDENT").length}</p>
          <p className="text-slate-400 text-xs mt-0.5">Total Students</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search courses..."
          className="w-full bg-[#111827] border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-[#00D084] transition-all text-sm"
        />
      </div>

      {/* Course list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No courses found.</p>
        </div>
      ) : (
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          {filtered.map((c, i) => {
            const enrolled = getEnrolledCount(c.id);
            const doctor = getDoctorName(c.doctorId);
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/admin/courses/${c.id}/enrollment`)}
                className={`w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors text-left ${
                  i < filtered.length - 1 ? "border-b border-slate-800/50" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-[#00D084]/10 border border-[#00D084]/20 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-[#00D084]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[#00D084] text-xs font-bold">{c.code}</span>
                      {c.department && <span className="text-slate-500 text-xs">{c.department}</span>}
                    </div>
                    <p className="text-white font-medium text-sm truncate">{c.name}</p>
                    {doctor && <p className="text-slate-500 text-xs">{doctor}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <p className="text-white font-bold text-sm">{enrolled}</p>
                    <p className="text-slate-500 text-xs flex items-center gap-1"><Users className="w-3 h-3" />enrolled</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
