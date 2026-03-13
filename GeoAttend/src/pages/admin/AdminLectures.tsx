import { useState } from "react";
import { Search, PlusCircle, Trash2, Edit3, Clock, X, Check, Users, UserCheck, UserMinus, ChevronDown, ChevronUp } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { useMockData, type Lecture } from "../../context/MockDataContext";

function AddLectureModal({ onClose }: { onClose: () => void }) {
  const { users, courses, addLecture } = useMockData();
  const doctors = users.filter(u => u.role === "DOCTOR" || u.role === "ADMIN");
  const [form, setForm] = useState({ title: "", doctorId: doctors[0]?.id || "", scheduledAt: "", duration: "90", department: "", courseId: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const doctor = users.find(u => u.id === form.doctorId);
    const course = courses.find(c => c.id === form.courseId);
    addLecture({
      title: form.title, doctorId: form.doctorId,
      doctorName: `Dr. ${doctor?.firstName} ${doctor?.lastName}`,
      department: form.department, scheduledAt: form.scheduledAt,
      duration: parseInt(form.duration), status: "SCHEDULED", studentsPresent: 0,
      courseId: form.courseId || undefined,
      location: course?.location,
    });
    onClose();
  };

  const doctorCourses = courses.filter(c => c.doctorId === form.doctorId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Add Lecture</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Title</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Lecture title"
              className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-purple-500 transition-all" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Doctor</label>
            <select value={form.doctorId} onChange={e => setForm({...form, doctorId: e.target.value, courseId: ""})}
              className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-purple-500">
              {doctors.map(d => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Link to Course (optional)</label>
            <select value={form.courseId} onChange={e => setForm({...form, courseId: e.target.value})}
              className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-purple-500">
              <option value="">None</option>
              {doctorCourses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Time</label>
            <input value={form.scheduledAt} onChange={e => setForm({...form, scheduledAt: e.target.value})} placeholder="10:00 AM - 12:00 PM"
              className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-purple-500 transition-all" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Department</label>
            <input value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="Computer Science"
              className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-purple-500 transition-all" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Duration</label>
            <select value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}
              className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-purple-500">
              {["60","90","120","180"].map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-all mt-2">Add Lecture</button>
        </form>
      </div>
    </div>
  );
}

// ── Students Panel inside a lecture card ──
function LectureStudentsPanel({ lecture }: { lecture: Lecture }) {
  const { courses, users, enrollments, attendance, markAttendance, unmarkAttendance } = useMockData();
  const [search, setSearch] = useState("");

  const course = lecture.courseId ? courses.find(c => c.id === lecture.courseId) : null;
  const enrolledStudents = course
    ? enrollments.filter(e => e.courseId === course.id).map(e => users.find(u => u.id === e.studentId)).filter(Boolean)
    : [];

  const isPresent = (sid: string) => attendance.some(a => a.lectureId === lecture.id && a.studentId === sid);
  const filtered = enrolledStudents.filter(s =>
    `${s!.firstName} ${s!.lastName} ${s!.studentID || ""}`.toLowerCase().includes(search.toLowerCase())
  );
  const presentCount = enrolledStudents.filter(s => isPresent(s!.id)).length;

  if (!course) return (
    <div className="px-4 pb-4 pt-2 text-slate-500 text-sm text-center">
      Not linked to a course — no student list available.
    </div>
  );

  return (
    <div className="border-t border-slate-800 px-4 pt-4 pb-3">
      {/* Mini stats */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 bg-slate-800/50 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-white">{enrolledStudents.length}</p>
          <p className="text-slate-400 text-xs">Enrolled</p>
        </div>
        <div className="flex-1 bg-[#00D084]/5 border border-[#00D084]/10 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-[#00D084]">{presentCount}</p>
          <p className="text-slate-400 text-xs">Present</p>
        </div>
        <div className="flex-1 bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 text-center">
          <p className="text-lg font-bold text-red-400">{enrolledStudents.length - presentCount}</p>
          <p className="text-slate-400 text-xs">Absent</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
          className="w-full bg-[#1E293B] border border-slate-700 text-white pl-9 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:border-purple-500" />
      </div>

      {/* List */}
      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
        {filtered.length === 0
          ? <p className="text-slate-500 text-xs text-center py-4">No students found</p>
          : filtered.map(s => {
            const present = isPresent(s!.id);
            return (
              <div key={s!.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm transition-all ${present ? "bg-[#00D084]/5 border-[#00D084]/10" : "bg-slate-800/20 border-slate-800/60"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${present ? "bg-[#00D084]/20 text-[#00D084]" : "bg-slate-700 text-slate-400"}`}>
                  {s!.firstName[0]}{s!.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{s!.firstName} {s!.lastName}</p>
                  <p className="text-slate-500 text-xs">{s!.studentID || s!.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${present ? "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                  {present ? "✓" : "✗"}
                </span>
                <button
                  onClick={() => present ? unmarkAttendance(lecture.id, s!.id) : markAttendance(lecture.id, s!.id, course.id)}
                  className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${present ? "text-red-400 hover:bg-red-500/10" : "text-[#00D084] hover:bg-[#00D084]/10"}`}
                  title={present ? "Mark absent" : "Mark present"}>
                  {present ? <UserMinus className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default function AdminLectures() {
  const { lectures, updateLecture, deleteLecture, courses } = useMockData();
  const [search,          setSearch]          = useState("");
  const [statusFilter,    setStatusFilter]    = useState("ALL");
  const [showModal,       setShowModal]       = useState(false);
  const [editingDuration, setEditingDuration] = useState<string | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const toggleStudents = (id: string) => setExpandedStudents(prev => {
    const next = new Set(prev);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    return next;
  });

  const filtered = lectures.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) || l.doctorName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusBadge = (s: string) => ({
    ACTIVE:    "bg-[#00D084]/20 text-[#00D084] border-[#00D084]/30",
    SCHEDULED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    COMPLETED: "bg-slate-600/20 text-slate-400 border-slate-600/30",
    CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
  }[s] || "");

  return (
    <AdminLayout>
      {showModal && <AddLectureModal onClose={() => setShowModal(false)} />}
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-6 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-white mb-2">Lecture Management</h1>
            <p className="text-slate-400 text-sm">View, manage, and track attendance for all lectures.</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-lg transition-all">
            <PlusCircle className="w-4 h-4" />Add Lecture
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search lectures..."
              className="w-full bg-[#111827] border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-purple-500 transition-all" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["ALL","SCHEDULED","ACTIVE","COMPLETED","CANCELLED"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-[#111827] border border-slate-800 text-slate-400 hover:text-white"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(l => {
            const course = l.courseId ? courses.find(c => c.id === l.courseId) : null;
            const expanded = expandedStudents.has(l.id);
            return (
              <div key={l.id} className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold leading-tight">{l.title}</h3>
                      {course && <p className="text-purple-400 text-xs mt-0.5">{course.name} ({course.code})</p>}
                    </div>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border flex-shrink-0 ${statusBadge(l.status)}`}>{l.status}</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-1">{l.doctorName}</p>
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-3">
                    <Clock className="w-3 h-3" />{l.scheduledAt} · {l.department}
                  </div>

                  {/* Duration editor */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-slate-400">Duration:</span>
                    {editingDuration === l.id ? (
                      <div className="flex items-center gap-1">
                        <select defaultValue={l.duration} id={`dur-${l.id}`}
                          className="bg-[#1E293B] border border-slate-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-purple-500">
                          {[60,90,120,180].map(d => <option key={d} value={d}>{d} min</option>)}
                        </select>
                        <button onClick={() => {
                          const sel = document.getElementById(`dur-${l.id}`) as HTMLSelectElement;
                          updateLecture(l.id, { duration: parseInt(sel.value) });
                          setEditingDuration(null);
                        }} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingDuration(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-white">{l.duration} min</span>
                        <button onClick={() => setEditingDuration(l.id)} className="text-slate-500 hover:text-purple-400 transition-colors"><Edit3 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {/* Students toggle button */}
                    {l.courseId && (
                      <button onClick={() => toggleStudents(l.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${expanded ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-slate-800 text-slate-400 border-slate-700 hover:text-purple-400 hover:border-purple-500/20"}`}>
                        <Users className="w-3.5 h-3.5" />
                        Students ({l.studentsPresent})
                        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                    {l.status === "SCHEDULED" && (
                      <button onClick={() => updateLecture(l.id, { status: "ACTIVE" })}
                        className="flex-1 bg-[#00D084]/10 hover:bg-[#00D084]/20 text-[#00D084] border border-[#00D084]/30 text-xs font-semibold py-2 rounded-lg transition-colors">
                        Activate
                      </button>
                    )}
                    {l.status === "ACTIVE" && (
                      <button onClick={() => updateLecture(l.id, { status: "COMPLETED" })}
                        className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold py-2 rounded-lg transition-colors">
                        Complete
                      </button>
                    )}
                    {(l.status === "SCHEDULED" || l.status === "ACTIVE") && (
                      <button onClick={() => updateLecture(l.id, { status: "CANCELLED" })}
                        className="flex-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-semibold py-2 rounded-lg transition-colors">
                        Cancel
                      </button>
                    )}
                    <button onClick={() => deleteLecture(l.id)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expandable students panel */}
                {expanded && <LectureStudentsPanel lecture={l} />}
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">No lectures found.</div>
        )}
      </div>
    </AdminLayout>
  );
}
