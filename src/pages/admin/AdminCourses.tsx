import { useState } from "react";
import { Plus, Edit3, Trash2, BookOpen, X, Save, AlertTriangle, Users, MapPin, Hash, Clock } from "lucide-react";
import AdminLayout from "./AdminLayout";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useMockData } from "../../context/MockDataContext";
import type { Course } from "../../context/MockDataContext";
import { useNavigate } from "react-router-dom";

/* ── Modal ── */
function CourseModal({ course, onSave, onClose }: {
  course: Course | null;
  onSave: (data: Omit<Course,"id">) => void;
  onClose: () => void;
}) {
  const { users } = useMockData();
  const doctors = users.filter(u => u.role === "DOCTOR");

  const [form, setForm] = useState({
    name:        course?.name        || "",
    code:        course?.code        || "",
    doctorId:    course?.doctorId    || "",
    department:  course?.department  || "",
    creditHours: course?.creditHours ?? 3,
    location:    course?.location    || "",
  });
  const [err, setErr] = useState("");

  const inp = "w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] transition-all placeholder:text-slate-500 text-sm";
  const lbl = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";

  const submit = () => {
    if (!form.name.trim() || !form.code.trim() || !form.doctorId) return setErr("Name, Code and Doctor are required.");
    setErr("");
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#00D084]" />
            {course ? "Edit Course" : "Add New Course"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Course Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className={inp} placeholder="e.g. Data Structures" />
            </div>
            <div>
              <label className={lbl}>Course Code *</label>
              <input value={form.code} onChange={e => setForm(p => ({...p, code: e.target.value}))} className={inp} placeholder="e.g. CS201" />
            </div>
          </div>

          <div>
            <label className={lbl}>Assign Doctor *</label>
            <div className="flex flex-col gap-2">
              {doctors.length === 0 && <p className="text-slate-500 text-sm">No doctors available.</p>}
              {doctors.map(d => (
                <button key={d.id} onClick={() => setForm(p => ({...p, doctorId: d.id}))}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-sm ${
                    form.doctorId === d.id
                      ? "border-[#00D084]/50 bg-[#00D084]/10 text-[#00D084]"
                      : "border-slate-700 bg-[#1E293B] text-slate-300 hover:border-slate-600"
                  }`}>
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {d.firstName[0]}{d.lastName[0]}
                  </div>
                  Dr. {d.firstName} {d.lastName}
                  {d.department && <span className="text-slate-500 text-xs ml-auto">{d.department}</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Department</label>
              <input value={form.department} onChange={e => setForm(p => ({...p, department: e.target.value}))} className={inp} placeholder="e.g. Computer Science" />
            </div>
            <div>
              <label className={lbl}>Credit Hours</label>
              <select value={form.creditHours} onChange={e => setForm(p => ({...p, creditHours: parseInt(e.target.value)}))}
                className={inp}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} hours</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Location</label>
            <input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} className={inp} placeholder="e.g. Hall A-101" />
          </div>

          {err && <div className="text-red-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{err}</div>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors border border-slate-700">Cancel</button>
          <button onClick={submit} className="flex-1 py-2.5 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold rounded-lg transition-all flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />{course ? "Update" : "Add Course"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Confirm ── */
function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-500/20 w-10 h-10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">Delete Course</h3>
            <p className="text-slate-400 text-xs">Schedules and enrollments will also be removed</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm mb-6">Delete <span className="text-white font-semibold">"{name}"</span>?</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg border border-slate-700">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════ */
export default function AdminCourses() {
  const navigate = useNavigate();
  const { courses, users, schedules, enrollments, addCourse, updateCourse, deleteCourse } = useMockData();
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Course | null>(null);
  const [delTarget,  setDelTarget]  = useState<Course | null>(null);
  const [search,     setSearch]     = useState("");

  const getDoctorName = (id: string) => {
    const d = users.find(u => u.id === id);
    return d ? `Dr. ${d.firstName} ${d.lastName}` : "—";
  };

  const filtered = courses.filter(c =>
    `${c.name} ${c.code} ${c.department}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      {(showModal || editTarget) && (
        <CourseModal
          course={editTarget}
          onSave={(data: Omit<Course,"id">) => { if (editTarget) { updateCourse(editTarget.id, data); } else { addCourse(data); } setShowModal(false); setEditTarget(null); }}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}
      {delTarget && (
        <DeleteConfirm name={delTarget.name} onConfirm={() => { deleteCourse(delTarget.id); setDelTarget(null); }} onCancel={() => setDelTarget(null)} />
      )}

      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-white mb-2">Course Management</h1>
            <p className="text-slate-400 text-sm">Create and manage university courses.</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold py-2.5 px-5 rounded-lg transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,208,132,0.2)] flex-shrink-0">
            <Plus className="w-5 h-5" />Add Course
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Courses",      value: courses.length,                                           color: "text-white"      },
            { label: "Total Schedules",    value: schedules.length,                                         color: "text-yellow-400" },
            { label: "Total Enrollments",  value: enrollments.length,                                       color: "text-[#00D084]"  },
          ].map(s => (
            <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-5">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code or department..."
            className="w-full bg-[#111827] border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-[#00D084] transition-all text-sm" />
        </div>

        {/* Courses Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No courses found</p>
            <p className="text-sm mt-1">Click "Add Course" to create your first course</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(c => {
              const courseSchedules  = schedules.filter(s => s.courseId === c.id);
              const courseEnrollments = enrollments.filter(e => e.courseId === c.id);
              return (
                <div key={c.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col gap-4">
                  {/* Top */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#00D084] text-xs font-bold bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">{c.code}</span>
                      </div>
                      <h3 className="text-white font-bold text-base leading-tight truncate">{c.name}</h3>
                      <p className="text-slate-400 text-xs mt-1">{getDoctorName(c.doctorId)}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditTarget(c)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => setDelTarget(c)}  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col gap-2 text-sm">
                    {c.department && (
                      <div className="flex items-center gap-2 text-slate-400"><Hash className="w-3.5 h-3.5" />{c.department}</div>
                    )}
                    {c.location && (
                      <div className="flex items-center gap-2 text-slate-400"><MapPin className="w-3.5 h-3.5" />{c.location}</div>
                    )}
                    <div className="flex items-center gap-2 text-slate-400"><Clock className="w-3.5 h-3.5" />{c.creditHours} Credit Hours</div>
                  </div>

                  {/* Counters */}
                  <div className="flex gap-3 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                      {courseSchedules.length} Schedules
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00D084]" />
                      {courseEnrollments.length} Students
                    </div>
                  </div>

                  {/* Manage Students btn */}
                  <button onClick={() => navigate(`/admin/courses/${c.id}/enrollment`)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-[#00D084]/10 hover:text-[#00D084] text-slate-400 text-sm font-medium rounded-lg transition-all border border-slate-700 hover:border-[#00D084]/30">
                    <Users className="w-4 h-4" />Manage Enrollments
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
