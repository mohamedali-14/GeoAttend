import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, MapPin, LayoutDashboard, Users, Settings, PlusCircle,
  PlayCircle, CheckCircle, Clock, X, Trash2, UserCircle,
  BookOpen, Calendar, Plus, Edit3, Save, AlertTriangle,
  ChevronRight, Search, UserCheck, UserMinus, Download, FileText
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useMockData, type Lecture, type Course, type Schedule } from "../context/MockDataContext";
import ProfileSettingsModal from "./ProfileSettingsModal";

// حل مشكلة مكتبة الـ QR Code مع Vite
import QRCodeModule from "react-qr-code";
const QRCodeComponent = (QRCodeModule as any).default || QRCodeModule;

// ─────────────────────────────────────────────
//  Add Lecture Modal
// ─────────────────────────────────────────────
function AddLectureModal({ onClose, onAdd }: { onClose: () => void; onAdd: (l: Omit<Lecture,"id">) => void }) {
  const { user } = useAuth();
  const { courses } = useMockData();
  const myCourses = courses.filter(c => c.doctorId === user?.id);
  const [form, setForm] = useState({ title: "", scheduledAt: "", duration: "90", department: user?.department || "", courseId: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const course = myCourses.find(c => c.id === form.courseId);
    onAdd({
      title: form.title,
      doctorId: user?.id || "",
      doctorName: `Dr. ${user?.firstName} ${user?.lastName}`,
      department: form.department,
      scheduledAt: form.scheduledAt,
      duration: parseInt(form.duration),
      status: "SCHEDULED",
      studentsPresent: 0,
      courseId: form.courseId || undefined,
      location: course?.location,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">New Lecture</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { label: "Title",      key: "title",       placeholder: "e.g. Data Structures",      type: "text" },
            { label: "Time",       key: "scheduledAt", placeholder: "e.g. 10:00 AM - 12:00 PM", type: "text" },
            { label: "Department", key: "department",  placeholder: "Computer Science",           type: "text" },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} placeholder={f.placeholder}
                className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500 transition-all" required />
            </div>
          ))}
          {myCourses.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Link to Course (optional)</label>
              <select value={form.courseId} onChange={e => setForm({...form, courseId: e.target.value})}
                className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500">
                <option value="">None</option>
                {myCourses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Duration (minutes)</label>
            <select value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}
              className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500">
              {["60","90","120","180"].map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all mt-2">Create Lecture</button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Course Modal
// ─────────────────────────────────────────────
function CourseModal({ course, onSave, onClose }: {
  course: Course | null; onSave: (d: Omit<Course,"id">) => void; onClose: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: course?.name || "", code: course?.code || "",
    doctorId: user?.id || "", department: course?.department || user?.department || "",
    creditHours: course?.creditHours ?? 3, location: course?.location || "",
  });
  const [err, setErr] = useState("");
  const inp = "w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-500 text-sm";
  const lbl = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";
  
  const submit = () => {
    if (!form.name.trim() || !form.code.trim()) return setErr("Name and Code are required.");
    setErr(""); onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />{course ? "Edit Course" : "Add New Course"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Course Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className={inp} placeholder="e.g. Data Structures" /></div>
            <div><label className={lbl}>Course Code *</label><input value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} className={inp} placeholder="e.g. CS201" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Department</label><input value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))} className={inp} placeholder="Computer Science" /></div>
            <div>
              <label className={lbl}>Credit Hours</label>
              <select value={form.creditHours} onChange={e=>setForm(p=>({...p,creditHours:parseInt(e.target.value)}))} className={inp}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} hours</option>)}
              </select>
            </div>
          </div>
          <div><label className={lbl}>Location</label><input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} className={inp} placeholder="e.g. Hall A-101" /></div>
          {err && <div className="text-red-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{err}</div>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-lg border border-slate-700">Cancel</button>
          <button onClick={submit} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />{course ? "Update" : "Add Course"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Schedule Modal
// ─────────────────────────────────────────────
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

function ScheduleModal({ schedule, defaultDay, myCourses, onSave, onClose }: {
  schedule: Schedule | null; defaultDay: Day; myCourses: Course[];
  onSave: (d: Omit<Schedule,"id">) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    courseId: schedule?.courseId || "", day: (schedule?.day || defaultDay) as Day,
    startTime: schedule?.startTime || "", endTime: schedule?.endTime || "", location: schedule?.location || "",
  });
  const [err, setErr] = useState("");
  const inp = "w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-500 text-sm";
  const lbl = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";
  
  const submit = () => {
    if (!form.courseId || !form.startTime || !form.endTime) return setErr("Course, Start and End time are required.");
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />{schedule ? "Edit Schedule" : "Add Schedule"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className={lbl}>Course *</label>
            {myCourses.length === 0
              ? <p className="text-slate-500 text-sm">No courses yet — add a course first.</p>
              : <div className="flex flex-col gap-1.5">
                  {myCourses.map(c => (
                    <button key={c.id} type="button" onClick={() => setForm(p=>({...p,courseId:c.id,location:c.location}))}
                      className={`p-3 rounded-lg border text-left text-sm transition-all ${form.courseId===c.id ? "border-blue-500/50 bg-blue-500/10 text-blue-300" : "border-slate-700 text-slate-300 hover:border-slate-600"}`}>
                      {c.name} <span className="text-xs opacity-60">({c.code})</span>
                    </button>
                  ))}
                </div>
            }
          </div>
          <div>
            <label className={lbl}>Day *</label>
            <div className="grid grid-cols-3 gap-2">
              {DAYS.map(d => (
                <button key={d} type="button" onClick={() => setForm(p=>({...p,day:d}))}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${form.day===d ? DAY_COLOR[d] : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                  {d.substring(0,3)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Start Time *</label><input value={form.startTime} onChange={e=>setForm(p=>({...p,startTime:e.target.value}))} className={inp} placeholder="09:00" /></div>
            <div><label className={lbl}>End Time *</label><input value={form.endTime} onChange={e=>setForm(p=>({...p,endTime:e.target.value}))} className={inp} placeholder="11:00" /></div>
          </div>
          <div><label className={lbl}>Location</label><input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} className={inp} placeholder="Hall A-101" /></div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-lg border border-slate-700">Cancel</button>
          <button onClick={submit} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />{schedule ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Students in Lecture Modal
// ─────────────────────────────────────────────
function LectureStudentsModal({ lecture, onClose }: { lecture: Lecture; onClose: () => void }) {
  const { courses, users, enrollments, attendance, markAttendance, unmarkAttendance } = useMockData();
  const [search, setSearch] = useState("");
  const course = lecture.courseId ? courses.find(c => c.id === lecture.courseId) : null;
  
  const enrolledIds = course ? enrollments.filter(e => e.courseId === course.id).map(e => e.studentId) : [];
  const attendedIds = attendance.filter(a => a.lectureId === lecture.id).map(a => a.studentId);
  const allStudentIds = Array.from(new Set([...enrolledIds, ...attendedIds])); 
  const allStudents = allStudentIds.map(id => users.find(u => u.id === id)).filter(Boolean);

  const isPresent = (sid: string) => attendance.some(a => a.lectureId === lecture.id && a.studentId === sid);
  
  const filtered = allStudents.filter(s =>
    `${s!.firstName} ${s!.lastName} ${s!.studentID||""}`.toLowerCase().includes(search.toLowerCase())
  );
  const presentCount = allStudents.filter(s => isPresent(s!.id)).length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-white font-bold text-lg">{lecture.title}</h2>
            {course && <p className="text-blue-400 text-sm mt-0.5">{course.name} ({course.code})</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-4 px-6 py-4 border-b border-slate-800">
          {[
            { label: "Total Students", value: allStudents.length, color: "text-white", bg: "bg-slate-800/50" },
            { label: "Present",  value: presentCount, color: "text-[#00D084]", bg: "bg-[#00D084]/10 border border-[#00D084]/20" },
            { label: "Absent",   value: allStudents.length - presentCount, color: "text-red-400", bg: "bg-red-500/10 border border-red-500/20" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-lg px-4 py-2 text-center flex-1`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 border-b border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search students..."
              className="w-full bg-[#1E293B] border border-slate-700 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-2">
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No students found.</p>
          ) : filtered.map(s => {
            const present = isPresent(s!.id);
            return (
              <div key={s!.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${present ? "bg-[#00D084]/5 border-[#00D084]/20" : "bg-slate-800/30 border-slate-800"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${present ? "bg-[#00D084]/20 text-[#00D084]" : "bg-slate-700 text-slate-400"}`}>
                  {s!.firstName[0]}{s!.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{s!.firstName} {s!.lastName}</p>
                  <p className="text-slate-400 text-xs">{s!.studentID ? `ID: ${s!.studentID}` : s!.email}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${present ? "bg-[#00D084]/20 text-[#00D084] border-[#00D084]/30" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                  {present ? "Present" : "Absent"}
                </span>
                {lecture.status === "ACTIVE" && (
                  <button onClick={() => present ? unmarkAttendance(lecture.id, s!.id) : markAttendance(lecture.id, s!.id, course?.id || "")}
                    className={`p-2 rounded-lg transition-colors ${present ? "text-red-400 hover:bg-red-500/10" : "text-[#00D084] hover:bg-[#00D084]/10"}`}>
                    {present ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main Doctor Dashboard
// ─────────────────────────────────────────────
type Tab = "lectures" | "courses" | "schedule";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    lectures, addLecture, updateLecture, deleteLecture,
    courses, addCourse, updateCourse, deleteCourse,
    schedules, addSchedule, updateSchedule, deleteSchedule,
    enrollments,
    quizStatus, startQuiz, endQuiz // 🎯 الدوال الخاصة بالكويز
  } = useMockData();

  const [tab,            setTab]            = useState<Tab>("lectures");
  const [showModal,      setShowModal]      = useState(false);  
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editCourse,     setEditCourse]     = useState<Course | null>(null);
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [editSchedule,   setEditSchedule]   = useState<Schedule | null>(null);
  const [activeDay,      setActiveDay]      = useState<Day>("Sunday");
  const [showSettings,   setShowSettings]   = useState(false);
  const [viewLecture,    setViewLecture]    = useState<Lecture | null>(null);
  
  const [activeQrLecture, setActiveQrLecture] = useState<string | null>(null);

  const myLectures  = lectures.filter(l => l.doctorId === user?.id);
  const myCourses   = courses.filter(c => c.doctorId === user?.id);
  const mySchedules = schedules.filter(s => myCourses.some(c => c.id === s.courseId));
  const daySchedules = mySchedules.filter(s => s.day === activeDay).sort((a,b)=>a.startTime.localeCompare(b.startTime));

  const handleLogout = () => { logout(); navigate("/"); };

  const statusBadge = (s: string) => ({
    ACTIVE:    "bg-[#00D084]/20 text-[#00D084] border-[#00D084]/30",
    SCHEDULED: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    COMPLETED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
  }[s] || "");

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "lectures", label: "My Lectures", icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: "courses",  label: "My Courses",  icon: <BookOpen className="w-5 h-5" /> },
    { id: "schedule", label: "My Schedule", icon: <Calendar className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-[#0B1120] font-sans overflow-hidden" dir="ltr">
      {showModal       && <AddLectureModal onClose={() => setShowModal(false)} onAdd={addLecture} />}
      {showSettings    && <ProfileSettingsModal onClose={() => setShowSettings(false)} />}
      {viewLecture     && <LectureStudentsModal lecture={viewLecture} onClose={() => setViewLecture(null)} />}
      
      {/* ════════════ QR CODE MODAL ════════════ */}
      {activeQrLecture && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 max-w-sm w-full flex flex-col items-center relative shadow-2xl animate-in zoom-in duration-200">
            <button
              onClick={() => setActiveQrLecture(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Scan to Join</h2>
            <p className="text-slate-400 text-center mb-8 text-sm">
              Students, please scan this QR code to record your attendance.
            </p>
            <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
              <QRCodeComponent
                value={activeQrLecture}
                size={220}
                level="H"
                className="rounded-md"
              />
            </div>
            <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 px-4 py-2 rounded-full">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></div>
              <span className="text-sm font-semibold">Lecture is now active</span>
            </div>
          </div>
        </div>
      )}

      {(showCourseModal || editCourse) && (
        <CourseModal
          course={editCourse}
          onSave={(data: Omit<Course,"id">) => { if (editCourse) { updateCourse(editCourse.id, data); } else { addCourse(data); } setShowCourseModal(false); setEditCourse(null); }}
          onClose={() => { setShowCourseModal(false); setEditCourse(null); }}
        />
      )}
      {(showSchedModal || editSchedule) && (
        <ScheduleModal
          schedule={editSchedule}
          defaultDay={activeDay}
          myCourses={myCourses}
          onSave={(data: Omit<Schedule,"id">) => { if (editSchedule) { updateSchedule(editSchedule.id, data); } else { addSchedule(data); } setShowSchedModal(false); setEditSchedule(null); }}
          onClose={() => { setShowSchedModal(false); setEditSchedule(null); }}
        />
      )}

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
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm border border-transparent">
              <PlusCircle className="w-5 h-5" />Create Lecture
            </button>
            <button onClick={() => setTab("courses")}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm border border-transparent">
              <Users className="w-5 h-5" />Students & Reports
            </button>
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
              <h3 className="text-white font-medium text-sm truncate">Dr. {user?.firstName} {user?.lastName}</h3>
              <p className="text-slate-400 text-xs truncate">{user?.department || "Doctor"}</p>
            </div>
            <UserCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />Logout
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto">

          {/* ════════════ MY LECTURES ════════════ */}
          {tab === "lectures" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 border-b border-slate-800 pb-6 gap-4">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-white mb-2">Instructor Dashboard</h1>
                  <p className="text-slate-400 text-sm">Manage your lectures and track student attendance.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowSettings(true)}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Profile & Settings">
                    <UserCircle className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowModal(true)}
                    className="bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold py-2.5 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(0,208,132,0.3)] flex items-center gap-2">
                    <PlusCircle className="w-5 h-5" />New Lecture
                  </button>
                </div>
              </div>

              {/* 🎯 لوحة تحكم الكويز الجديدة للدكتور */}
              <div className="bg-[#111827] border border-slate-800 p-6 rounded-2xl flex items-center justify-between shadow-lg mb-8">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${quizStatus === 'ACTIVE' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400'}`}>
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Midterm Quiz Control</h2>
                    <p className="text-slate-400 text-sm">Status: <span className={quizStatus === 'ACTIVE' ? 'text-orange-400 font-bold' : 'text-slate-500'}>{quizStatus}</span></p>
                  </div>
                </div>
                {quizStatus === 'INACTIVE' ? (
                  <button onClick={startQuiz} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)] flex items-center gap-2">
                    <PlayCircle className="w-5 h-5" /> Start Quiz Now
                  </button>
                ) : (
                  <button onClick={endQuiz} className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] flex items-center gap-2">
                    <X className="w-5 h-5" /> End Quiz
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Total",     value: myLectures.length,                                   color: "text-white"      },
                  { label: "Active",    value: myLectures.filter(l=>l.status==="ACTIVE").length,    color: "text-[#00D084]"  },
                  { label: "Scheduled", value: myLectures.filter(l=>l.status==="SCHEDULED").length, color: "text-yellow-400" },
                  { label: "Completed", value: myLectures.filter(l=>l.status==="COMPLETED").length, color: "text-[#00D084]"   },
                ].map(s => (
                  <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {myLectures.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <PlusCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No lectures yet. Create your first one!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {myLectures.map(l => {
                    const linkedCourse = l.courseId ? courses.find(c=>c.id===l.courseId) : null;
                    return (
                      <div key={l.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4 gap-2">
                          <div>
                            <h3 className="text-lg font-bold text-white leading-tight">{l.title}</h3>
                            {linkedCourse && <p className="text-blue-400 text-xs mt-0.5">{linkedCourse.name}</p>}
                          </div>
                          <span className={`px-3 py-1 text-xs font-bold rounded-full border flex-shrink-0 ${statusBadge(l.status)}`}>{l.status}</span>
                        </div>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-slate-400 text-sm"><Clock className="w-4 h-4 text-slate-500" />{l.scheduledAt}</div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm"><Users className="w-4 h-4 text-slate-500" />{l.studentsPresent} Students present</div>
                          <div className="flex items-center gap-2 text-slate-400 text-sm"><Clock className="w-4 h-4 text-slate-500" />Duration: {l.duration} min</div>
                        </div>
                        {l.status === "SCHEDULED" && (
                          <div className="flex items-center gap-2 mb-4">
                            <label className="text-xs text-slate-400">Change duration:</label>
                            <select value={l.duration} onChange={e => updateLecture(l.id, { duration: parseInt(e.target.value) })}
                              className="bg-[#1E293B] border border-slate-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500">
                              {[60,90,120,180].map(d => <option key={d} value={d}>{d} min</option>)}
                            </select>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => setViewLecture(l)}
                            className="px-3 py-2.5 bg-slate-800 hover:bg-blue-500/10 hover:text-blue-400 text-slate-300 border border-slate-700 hover:border-blue-500/30 rounded-lg transition-all flex items-center gap-1.5 text-sm">
                            <Users className="w-4 h-4" />
                          </button>
                          {l.status === "ACTIVE" ? (
                            <button onClick={() => updateLecture(l.id, { status: "COMPLETED" })}
                              className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-semibold py-2.5 rounded-lg transition-colors">
                              Stop Attendance
                            </button>
                          ) : l.status === "SCHEDULED" ? (
                            <button onClick={() => { updateLecture(l.id, { status: "ACTIVE" }); setActiveQrLecture(l.id); }}
                              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                              <PlayCircle className="w-4 h-4" />Start Lecture & QR
                            </button>
                          ) : (
                            <button className="flex-1 bg-[#1E293B] hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                              <CheckCircle className="w-4 h-4" />View Report
                            </button>
                          )}
                          {l.status !== "ACTIVE" && (
                            <button onClick={() => deleteLecture(l.id)}
                              className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ════════════ MY COURSES ════════════ */}
          {tab === "courses" && (
            <>
              <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-white mb-2">My Courses</h1>
                  <p className="text-slate-400 text-sm">Manage the courses you teach and view their students.</p>
                </div>
                <button onClick={() => setShowCourseModal(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <Plus className="w-5 h-5" />Add Course
                </button>
              </div>
              {myCourses.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No courses yet. Add your first course!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {myCourses.map(c => {
                    const enrolled = enrollments.filter(e=>e.courseId===c.id).length;
                    const scheds   = mySchedules.filter(s=>s.courseId===c.id).length;
                    return (
                      <div key={c.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-blue-400 text-xs font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{c.code}</span>
                            <h3 className="text-white font-bold mt-1 truncate">{c.name}</h3>
                            <p className="text-slate-400 text-xs">{c.department}</p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setEditCourse(c)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => deleteCourse(c.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="text-sm text-slate-400 flex flex-col gap-1">
                          {c.location && <span>📍 {c.location}</span>}
                          <span>⏱️ {c.creditHours} credit hours</span>
                        </div>
                        <div className="flex gap-3 pt-2 border-t border-slate-800 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-[#00D084]" />{enrolled} students</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-yellow-400" />{scheds} slots</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ════════════ MY SCHEDULE ════════════ */}
          {tab === "schedule" && (
            <>
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-6">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-white mb-2">My Schedule</h1>
                  <p className="text-slate-400 text-sm">Weekly timetable for your courses.</p>
                </div>
                <button onClick={() => setShowSchedModal(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2">
                  <Plus className="w-5 h-5" />Add Slot
                </button>
              </div>
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {DAYS.map(d => {
                  const count = mySchedules.filter(s=>s.day===d).length;
                  return (
                    <button key={d} onClick={() => setActiveDay(d)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex-shrink-0 border ${
                        activeDay===d ? DAY_COLOR[d] : "bg-[#111827] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                      }`}>
                      {d}
                      {count > 0 && <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${activeDay===d ? "bg-white/20" : "bg-slate-700"}`}>{count}</span>}
                    </button>
                  );
                })}
              </div>
              {daySchedules.length === 0 ? (
                <div className="text-center py-16 text-slate-500"><Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" /><p>No classes on {activeDay}</p></div>
              ) : (
                <div className="flex flex-col gap-4">
                  {daySchedules.map(s => {
                    const course = myCourses.find(c=>c.id===s.courseId);
                    return (
                      <div key={s.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex items-center gap-4 hover:border-slate-700 transition-all">
                        <div className={`flex-shrink-0 text-center px-4 py-3 rounded-xl border ${DAY_COLOR[activeDay]}`}>
                          <p className="text-xs font-semibold opacity-70">START</p>
                          <p className="text-lg font-bold">{s.startTime}</p>
                          <div className="flex items-center justify-center gap-1 mt-1 opacity-60">
                            <ChevronRight className="w-3 h-3" /><span className="text-xs">{s.endTime}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          {course && <span className="text-blue-400 text-xs font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{course.code}</span>}
                          <h3 className="text-white font-bold mt-1 truncate">{course?.name || "Unknown"}</h3>
                          {s.location && <p className="text-slate-400 text-sm mt-1">📍 {s.location}</p>}
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => setEditSchedule(s)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => deleteSchedule(s.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
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
