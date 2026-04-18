import { useState } from "react";
import { Plus, Edit3, Trash2, Calendar, X, Save, AlertTriangle, Clock, MapPin, ChevronRight } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { useMockData } from "../../context/MockDataContext";
import type { Schedule } from "../../context/MockDataContext";

const DAYS = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"] as const;
type Day = typeof DAYS[number];

const DAY_COLOR: Record<Day, string> = {
  Saturday:  "text-purple-400 bg-purple-500/10 border-purple-500/20",
  Sunday:    "text-blue-400   bg-blue-500/10   border-blue-500/20",
  Monday:    "text-[#00D084]  bg-[#00D084]/10  border-[#00D084]/20",
  Tuesday:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  Wednesday: "text-pink-400   bg-pink-500/10   border-pink-500/20",
  Thursday:  "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

/* ── Modal ── */
function ScheduleModal({ schedule, defaultDay, onSave, onClose }: {
  schedule: Schedule | null;
  defaultDay: Day;
  onSave: (d: Omit<Schedule,"id">) => void;
  onClose: () => void;
}) {
  const { courses } = useMockData();
  const [form, setForm] = useState({
    courseId:  schedule?.courseId  || "",
    day:       (schedule?.day      || defaultDay) as Day,
    startTime: schedule?.startTime || "",
    endTime:   schedule?.endTime   || "",
    location:  schedule?.location  || "",
  });
  const [err, setErr] = useState("");

  const inp = "w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-yellow-500 transition-all placeholder:text-slate-500 text-sm";
  const lbl = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";

  const submit = () => {
    if (!form.courseId || !form.startTime || !form.endTime)
      return setErr("Course, Start Time and End Time are required.");
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-yellow-400" />
            {schedule ? "Edit Schedule" : "Add Schedule"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-4">
          {/* Course picker */}
          <div>
            <label className={lbl}>Course *</label>
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
              {courses.length === 0 && <p className="text-slate-500 text-sm">No courses yet. Add courses first.</p>}
              {courses.map(c => (
                <button key={c.id} onClick={() => setForm(p => ({...p, courseId: c.id}))}
                  className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all text-sm ${
                    form.courseId === c.id
                      ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-300"
                      : "border-slate-700 bg-[#1E293B] text-slate-300 hover:border-slate-600"
                  }`}>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs opacity-60">{c.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Day picker */}
          <div>
            <label className={lbl}>Day *</label>
            <div className="grid grid-cols-3 gap-2">
              {DAYS.map(d => (
                <button key={d} onClick={() => setForm(p => ({...p, day: d}))}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    form.day === d
                      ? DAY_COLOR[d] + " border-opacity-60"
                      : "border-slate-700 bg-[#1E293B] text-slate-400 hover:border-slate-600"
                  }`}>
                  {d.slice(0,3)}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}><Clock className="inline w-3 h-3 mr-1" />Start Time *</label>
              <input type="time" value={form.startTime} onChange={e => setForm(p => ({...p, startTime: e.target.value}))} className={inp} />
            </div>
            <div>
              <label className={lbl}><Clock className="inline w-3 h-3 mr-1" />End Time *</label>
              <input type="time" value={form.endTime} onChange={e => setForm(p => ({...p, endTime: e.target.value}))} className={inp} />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className={lbl}><MapPin className="inline w-3 h-3 mr-1" />Location</label>
            <input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} className={inp} placeholder="e.g. Hall A-101" />
          </div>

          {err && <div className="text-red-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{err}</div>}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg border border-slate-700">Cancel</button>
          <button onClick={submit} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-lg flex items-center justify-center gap-2">
            <Save className="w-4 h-4" />{schedule ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Confirm ── */
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-500/20 w-10 h-10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-white font-bold">Delete Schedule</h3>
        </div>
        <p className="text-slate-300 text-sm mb-6">Remove this time slot?</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg border border-slate-700">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ════  Main Page  ══════ */
export default function AdminSchedule() {
  const { schedules, courses, addSchedule, updateSchedule, deleteSchedule } = useMockData();
  const [activeDay,  setActiveDay]  = useState<Day>("Saturday");
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [delTarget,  setDelTarget]  = useState<string | null>(null);

  const getCourseName = (id: string) => courses.find(c => c.id === id)?.name || "Unknown";
  const getCourseCode = (id: string) => courses.find(c => c.id === id)?.code || "";

  const daySchedules = schedules
    .filter(s => s.day === activeDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <AdminLayout>
      {(showModal || editTarget) && (
        <ScheduleModal
          schedule={editTarget}
          defaultDay={activeDay}
          onSave={(data: Omit<Schedule,"id">) => { if (editTarget) { updateSchedule(editTarget.id, data); } else { addSchedule(data); } setShowModal(false); setEditTarget(null); }}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}
      {delTarget && (
        <DeleteConfirm
          onConfirm={() => { deleteSchedule(delTarget); setDelTarget(null); }}
          onCancel={() => setDelTarget(null)}
        />
      )}

      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-white mb-2">Schedule Management</h1>
            <p className="text-slate-400 text-sm">Manage weekly class timetable by day.</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-2.5 px-5 rounded-lg transition-all flex items-center gap-2 flex-shrink-0">
            <Plus className="w-5 h-5" />Add Schedule
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{schedules.length}</p>
            <p className="text-slate-400 text-xs mt-0.5">Total Slots</p>
          </div>
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-yellow-400">{daySchedules.length}</p>
            <p className="text-slate-400 text-xs mt-0.5">Slots on {activeDay}</p>
          </div>
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-[#00D084]">{courses.length}</p>
            <p className="text-slate-400 text-xs mt-0.5">Active Courses</p>
          </div>
        </div>

        {/* Day Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {DAYS.map(d => {
            const count = schedules.filter(s => s.day === d).length;
            return (
              <button key={d} onClick={() => setActiveDay(d)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex-shrink-0 border ${
                  activeDay === d
                    ? DAY_COLOR[d] + " border-opacity-60"
                    : "bg-[#111827] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}>
                {d}
                {count > 0 && (
                  <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${
                    activeDay === d ? "bg-white/20" : "bg-slate-700"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Schedule Cards */}
        {daySchedules.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No classes on {activeDay}</p>
            <p className="text-sm mt-1">Click "Add Schedule" to add a time slot</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {daySchedules.map(s => (
              <div key={s.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex items-center gap-4">
                {/* Time badge */}
                <div className={`flex-shrink-0 text-center px-4 py-3 rounded-xl border ${DAY_COLOR[activeDay]}`}>
                  <p className="text-xs font-semibold opacity-70">START</p>
                  <p className="text-lg font-bold">{s.startTime}</p>
                  <div className="flex items-center justify-center gap-1 mt-1 opacity-60">
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-xs">{s.endTime}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full">
                      {getCourseCode(s.courseId)}
                    </span>
                  </div>
                  <h3 className="text-white font-bold truncate">{getCourseName(s.courseId)}</h3>
                  {s.location && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-sm mt-1">
                      <MapPin className="w-3.5 h-3.5" />{s.location}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setEditTarget(s)}
                    className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDelTarget(s.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
