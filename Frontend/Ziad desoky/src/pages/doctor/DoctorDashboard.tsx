import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, MapPin, Settings, UserCircle, BookOpen, Calendar,
  Plus, Edit3, Save, AlertTriangle, ChevronRight, Search,
  X, Trash2, PlayCircle, StopCircle, Radio, ClipboardList,
  Navigation, CheckCircle, Clock, Users, QrCode, FileQuestion
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMockData, type Course, type Schedule } from "../../context/MockDataContext";
import { useSocket, type AttendanceEvent } from "../../context/SocketContext";
import { useToast } from "../../context/ToastContext";
import ProfileSettingsModal from "../shared/ProfileSettingsModal";
import AttendanceView from "../shared/AttendanceView";
import DoctorSessionHistory from "./DoctorSessionHistory";
import DoctorLiveDashboard from "./DoctorLiveDashboard";
import DoctorQuizPanel from "./DoctorQuizPanel";
import ConnectionStatus from "../../components/ConnectionStatus";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Session {
  id: string; courseId: string; courseName: string; courseCode: string;
  startTime: string; endTime?: string; isActive: boolean;
  geoEnabled: boolean; centerLat: number | null; centerLng: number | null;
  radiusMeters: number; attendees: AttendanceEvent[];
}

const DAYS = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"] as const;
type Day = typeof DAYS[number];
const DAY_COLOR: Record<Day,string> = {
  Saturday:"text-purple-400 bg-purple-500/10 border-purple-500/20",
  Sunday:"text-blue-400 bg-blue-500/10 border-blue-500/20",
  Monday:"text-[#00D084] bg-[#00D084]/10 border-[#00D084]/20",
  Tuesday:"text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  Wednesday:"text-pink-400 bg-pink-500/10 border-pink-500/20",
  Thursday:"text-orange-400 bg-orange-500/10 border-orange-500/20",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-EG",{hour:"2-digit",minute:"2-digit"});
}
function elapsed(startIso: string) {
  const diff = Date.now() - new Date(startIso).getTime();
  return `${String(Math.floor(diff/60000)).padStart(2,"0")}:${String(Math.floor((diff%60000)/1000)).padStart(2,"0")}`;
}

// ── QR Modal ──────────────────────────────────────────────────────────────────
function QRModal({ session, onClose }: { session: Session; onClose: () => void }) {
  const qrValue = `GEOATTEND|${session.id}|${session.courseId}|${session.startTime}`;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><QrCode className="w-5 h-5 text-[#00D084]" />Scan to Attend</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <p className="text-slate-400 text-sm text-center">Show this QR to students to record attendance</p>
          {/* QR visual using SVG pattern */}
          <div className="bg-white p-5 rounded-2xl flex flex-col items-center gap-3">
            <div className="w-48 h-48 bg-white flex items-center justify-center relative">
              <QrCode className="w-40 h-40 text-gray-900" />
            </div>
            <p className="text-gray-500 text-xs font-mono text-center break-all max-w-[200px]">{session.id}</p>
          </div>
          <div className="text-center w-full">
            <p className="text-white font-bold">{session.courseName}</p>
            <p className="text-slate-400 text-xs mt-1">{session.courseCode} • Started {formatTime(session.startTime)}</p>
          </div>
          <div className="flex items-center gap-2 bg-[#00D084]/10 border border-[#00D084]/20 rounded-xl px-4 py-3 w-full justify-center">
            <span className="w-2 h-2 bg-[#00D084] rounded-full animate-pulse" />
            <span className="text-[#00D084] text-sm font-semibold">Session is Live — Waiting for students</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Session Students Modal ────────────────────────────────────────────────────
function SessionStudentsModal({ session, onClose }: { session: Session; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all"|"present"|"left"|"kicked">("all");

  const getStatus = (a: AttendanceEvent) => {
    if (a.status === "kicked") return "kicked";
    if (a.status === "left")   return "left";
    return "present";
  };

  const presentCount  = session.attendees.filter(a => getStatus(a) === "present").length;
  const leftCount     = session.attendees.filter(a => getStatus(a) === "left").length;
  const kickedCount   = session.attendees.filter(a => getStatus(a) === "kicked").length;

  const filtered = session.attendees.filter(a => {
    const st = getStatus(a);
    const matchFilter = filter === "all" ? true : st === filter;
    const matchSearch = !search || a.studentName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-white font-bold text-lg">{session.courseName}</h2>
            <p className="text-slate-400 text-xs">{formatTime(session.startTime)}{session.endTime?` → ${formatTime(session.endTime)}`:" (Live)"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {/* Stats */}
        <div className="flex gap-3 px-6 py-4 border-b border-slate-800">
          {[
            {l:"Present",  v:presentCount, c:"text-[#00D084]",  b:"bg-[#00D084]/10 border-[#00D084]/20"},
            {l:"Left",     v:leftCount,    c:"text-yellow-400", b:"bg-yellow-500/10 border-yellow-500/20"},
            {l:"Kicked",   v:kickedCount,  c:"text-red-400",    b:"bg-red-500/10 border-red-500/20"},
            {l:"Total",    v:session.attendees.length, c:"text-white", b:"bg-slate-800/50 border-slate-700"},
          ].map(s=>(
            <div key={s.l} className={`flex-1 text-center rounded-xl border py-2.5 ${s.b}`}>
              <p className={`text-xl font-bold ${s.c}`}>{s.v}</p>
              <p className="text-slate-400 text-xs">{s.l}</p>
            </div>
          ))}
        </div>
        {/* Filter + Search */}
        <div className="px-6 py-3 border-b border-slate-800 flex gap-2 flex-wrap items-center">
          <div className="flex gap-1">
            {(["all","present","left","kicked"] as const).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${filter===f
                  ? f==="all"?"bg-slate-700 text-white border-slate-600"
                  : f==="present"?"bg-[#00D084]/10 text-[#00D084] border-[#00D084]/30"
                  : f==="left"?"bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                  :"bg-red-500/10 text-red-400 border-red-500/30"
                  : "text-slate-500 border-transparent hover:border-slate-700"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-32">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search student..."
              className="w-full bg-[#1E293B] border border-slate-700 text-white pl-9 pr-4 py-1.5 rounded-lg text-xs focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        {/* Student list */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-800/50">
          {filtered.length===0
            ? <p className="text-slate-500 text-center py-8 text-sm">No students match</p>
            : filtered.map((a,i)=>{
              const st = getStatus(a);
              return (
                <div key={i} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-800/30 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${st==="present"?"bg-[#00D084]/20 text-[#00D084]":st==="left"?"bg-yellow-500/20 text-yellow-400":"bg-red-500/20 text-red-400"}`}>
                    {a.studentName.slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{a.studentName}</p>
                    <p className="text-slate-500 text-xs">Joined {formatTime(a.timestamp)}{a.leftAt?" • Left "+formatTime(a.leftAt):""}</p>
                  </div>
                  {st==="kicked"
                    ? <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><UserX className="w-3 h-3"/>Kicked</span>
                    : st==="left"
                    ? <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1"><LogOut className="w-3 h-3"/>Left</span>
                    : <span className="text-xs text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Present</span>
                  }
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

// ── Start Session Modal ───────────────────────────────────────────────────────
function StartSessionModal({ courses, enrollments, onStart, onClose }: {
  courses: Course[]; enrollments: {courseId:string;studentId:string}[];
  onStart: (d:{courseId:string;geoEnabled:boolean;radiusMeters:number;lat:number|null;lng:number|null})=>void;
  onClose: ()=>void;
}) {
  const [sel, setSel]     = useState(courses[0]?.id || "");
  const [geo, setGeo]     = useState(false);
  const [radius, setR]    = useState("50");
  const [fetching, setF]  = useState(false);
  const [coords, setC]    = useState<{lat:number;lng:number}|null>(null);
  const [geoErr, setGE]   = useState("");
  const toast = useToast();
  const enrolled = enrollments.filter(e=>e.courseId===sel).length;
  const inp = "w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500 transition-all text-sm";
  const lbl = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";

  const capture = () => {
    setF(true); setGE("");
    navigator.geolocation.getCurrentPosition(
      p => { setC({lat:p.coords.latitude,lng:p.coords.longitude}); setF(false); toast.success("Location captured!"); },
      () => { setGE("Could not get location."); setF(false); }
    );
  };
  const go = () => {
    if (!sel) { toast.error("Select a course"); return; }
    if (enrolled===0) { toast.error("No students enrolled in this course!"); return; }
    if (geo && !coords) { toast.error("Capture location first"); return; }
    onStart({courseId:sel,geoEnabled:geo,radiusMeters:parseInt(radius)||50,lat:coords?.lat??null,lng:coords?.lng??null});
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><PlayCircle className="w-5 h-5 text-[#00D084]"/>Start New Session</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className={lbl}>Select Course *</label>
            <div className="flex flex-col gap-2">
              {courses.map(c=>{
                const cnt = enrollments.filter(e=>e.courseId===c.id).length;
                return (
                  <button key={c.id} type="button" onClick={()=>setSel(c.id)}
                    className={`p-3 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${sel===c.id?"border-[#00D084]/50 bg-[#00D084]/10 text-[#00D084]":"border-slate-700 text-slate-300 hover:border-slate-600"}`}>
                    <span>{c.name} <span className="opacity-60">({c.code})</span></span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cnt===0?"bg-red-500/20 text-red-400":"bg-slate-700 text-slate-400"}`}>{cnt} students</span>
                  </button>
                );
              })}
            </div>
            {enrolled===0 && sel && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>No students enrolled — Admin must enroll them first</p>
            )}
          </div>
          <div className="bg-[#1E293B] border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2"><Navigation className="w-4 h-4 text-[#00D084]"/><span className="text-white font-medium text-sm">Geo-Attendance</span></div>
              <button onClick={()=>{setGeo(v=>!v);setC(null);setGE("");}} className={`relative w-11 h-6 rounded-full transition-colors ${geo?"bg-[#00D084]":"bg-slate-600"}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${geo?"translate-x-6":"translate-x-1"}`}/>
              </button>
            </div>
            <p className="text-slate-400 text-xs">Students must be within radius to attend</p>
            {geo && (
              <div className="mt-3 flex flex-col gap-3">
                <div><label className={lbl}>Radius (meters)</label><input type="number" value={radius} onChange={e=>setR(e.target.value)} className={inp} min="10" max="500"/></div>
                <button onClick={capture} disabled={fetching}
                  className="w-full py-2.5 bg-[#00D084]/10 hover:bg-[#00D084]/20 border border-[#00D084]/30 text-[#00D084] font-semibold rounded-lg flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                  <MapPin className="w-4 h-4"/>{fetching?"Getting...":coords?"✓ Captured — Re-capture":"Capture My Location"}
                </button>
                {coords && <p className="text-xs text-slate-500 text-center">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
                {geoErr && <p className="text-xs text-red-400">{geoErr}</p>}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">Cancel</button>
          <button onClick={go} disabled={enrolled===0}
            className="flex-1 py-2.5 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <PlayCircle className="w-4 h-4"/>Start Session
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Course Modal ──────────────────────────────────────────────────────────────
function CourseModal({ course, onSave, onClose }: { course:Course|null; onSave:(d:Omit<Course,"id">)=>void; onClose:()=>void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name:course?.name||"", code:course?.code||"", doctorId:user?.id||"", department:course?.department||user?.department||"", creditHours:course?.creditHours??3, location:course?.location||"" });
  const [err, setErr] = useState("");
  const inp = "w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500 transition-all text-sm";
  const lbl = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-400"/>{course?"Edit Course":"Add Course"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Name *</label><input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className={inp} placeholder="Data Structures"/></div>
            <div><label className={lbl}>Code *</label><input value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} className={inp} placeholder="CS201"/></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Department</label><input value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))} className={inp}/></div>
            <div><label className={lbl}>Credit Hours</label>
              <select value={form.creditHours} onChange={e=>setForm(p=>({...p,creditHours:parseInt(e.target.value)}))} className={inp}>
                {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} hours</option>)}
              </select>
            </div>
          </div>
          <div><label className={lbl}>Location</label><input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} className={inp} placeholder="Hall A-101"/></div>
          {err && <p className="text-red-400 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4"/>{err}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">Cancel</button>
          <button onClick={()=>{if(!form.name.trim()||!form.code.trim()){setErr("Name and Code required");return;}setErr("");onSave(form);}}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2">
            <Save className="w-4 h-4"/>{course?"Update":"Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Schedule Modal ────────────────────────────────────────────────────────────
function ScheduleModal({ schedule, defaultDay, myCourses, onSave, onClose }: {
  schedule:Schedule|null; defaultDay:Day; myCourses:Course[];
  onSave:(d:Omit<Schedule,"id">)=>void; onClose:()=>void;
}) {
  const [form, setForm] = useState({ courseId:schedule?.courseId||"", day:(schedule?.day||defaultDay) as Day, startTime:schedule?.startTime||"", endTime:schedule?.endTime||"", location:schedule?.location||"" });
  const [err, setErr] = useState("");
  const inp = "w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500 transition-all text-sm";
  const lbl = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-400"/>{schedule?"Edit":"Add"} Schedule</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className={lbl}>Course *</label>
            {myCourses.length===0 ? <p className="text-slate-500 text-sm">Add a course first.</p>
              : <div className="flex flex-col gap-1.5">{myCourses.map(c=>(
                  <button key={c.id} type="button" onClick={()=>setForm(p=>({...p,courseId:c.id,location:c.location}))}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${form.courseId===c.id?"border-blue-500/50 bg-blue-500/10 text-blue-300":"border-slate-700 text-slate-300 hover:border-slate-600"}`}>
                    {c.name} <span className="text-xs opacity-60">({c.code})</span>
                  </button>
                ))}</div>
            }
          </div>
          <div>
            <label className={lbl}>Day *</label>
            <div className="grid grid-cols-3 gap-2">
              {DAYS.map(d=>(
                <button key={d} type="button" onClick={()=>setForm(p=>({...p,day:d}))}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${form.day===d?DAY_COLOR[d]:"border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                  {d.substring(0,3)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Start *</label><input value={form.startTime} onChange={e=>setForm(p=>({...p,startTime:e.target.value}))} className={inp} placeholder="09:00"/></div>
            <div><label className={lbl}>End *</label><input value={form.endTime} onChange={e=>setForm(p=>({...p,endTime:e.target.value}))} className={inp} placeholder="11:00"/></div>
          </div>
          <div><label className={lbl}>Location</label><input value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} className={inp} placeholder="Hall A-101"/></div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-800">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">Cancel</button>
          <button onClick={()=>{if(!form.courseId||!form.startTime||!form.endTime){setErr("Course, Start and End required");return;}onSave(form);}}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2">
            <Save className="w-4 h-4"/>{schedule?"Update":"Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Live Session Card ─────────────────────────────────────────────────────────
function LiveSessionCard({ session, onEnd, onShowQR, onViewStudents }: {
  session:Session; onEnd:(id:string)=>void; onShowQR:(s:Session)=>void; onViewStudents:(s:Session)=>void;
}) {
  const [e_, setE] = useState(elapsed(session.startTime));
  useEffect(() => { const iv=setInterval(()=>setE(elapsed(session.startTime)),1000); return ()=>clearInterval(iv); },[session.startTime]);
  const present = session.attendees.filter(a=>a.status!=="left"&&a.status!=="kicked").length;
  return (
    <div className="bg-[#111827] border border-[#00D084]/30 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(0,208,132,0.08)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00D084] animate-pulse"/>
          <div>
            <h3 className="text-white font-bold">{session.courseName}</h3>
            <p className="text-slate-400 text-xs">{session.courseCode} • {formatTime(session.startTime)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[#00D084] text-sm bg-[#00D084]/10 border border-[#00D084]/20 px-3 py-1 rounded-full">{e_}</span>
          {session.geoEnabled && <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full flex items-center gap-1"><Navigation className="w-3 h-3"/>{session.radiusMeters}m</span>}
          <button onClick={()=>onShowQR(session)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-sm flex items-center gap-1.5"><QrCode className="w-4 h-4"/>QR</button>
          <button onClick={()=>onViewStudents(session)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm flex items-center gap-1.5"><Users className="w-4 h-4"/>{session.attendees.length}</button>
          <button onClick={()=>onEnd(session.id)} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-1.5"><StopCircle className="w-4 h-4"/>End</button>
        </div>
      </div>
      <div className="flex gap-4 px-5 py-4">
        {[{l:"Present",v:present,c:"text-[#00D084]",b:"bg-[#00D084]/10 border-[#00D084]/20"},
          {l:"Outside",v:session.attendees.length-present,c:"text-yellow-400",b:"bg-yellow-500/10 border-yellow-500/20"},
          {l:"Total",v:session.attendees.length,c:"text-white",b:"bg-slate-800/50 border-slate-700"}
        ].map(s=>(
          <div key={s.l} className={`flex-1 text-center rounded-xl border py-3 ${s.b}`}>
            <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
            <p className="text-slate-400 text-xs mt-0.5">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type Tab = "sessions"|"courses"|"schedule"|"attendance"|"live"|"quizzes";

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { courses, addCourse, updateCourse, deleteCourse, schedules, addSchedule, updateSchedule, deleteSchedule, enrollments } = useMockData();
  const { attendanceEvents, emitSession } = useSocket();
  const toast = useToast();

  const [tab, setTab]                     = useState<Tab>("sessions");
  const [showCourseModal, setShowCourse]  = useState(false);
  const [editCourse, setEditCourse]       = useState<Course|null>(null);
  const [showSchedModal, setSched]        = useState(false);
  const [editSchedule, setEditSched]      = useState<Schedule|null>(null);
  const [activeDay, setDay]               = useState<Day>("Sunday");
  const [showSettings, setSettings]       = useState(false);
  const [showStartModal, setStart]        = useState(false);
  const [showQR, setQR]                   = useState<Session|null>(null);
  const [viewStudents, setViewStudents]   = useState<Session|null>(null);

  const myCourses    = courses.filter(c=>c.doctorId===user?.id);
  const mySchedules  = schedules.filter(s=>myCourses.some(c=>c.id===s.courseId));
  const daySchedules = mySchedules.filter(s=>s.day===activeDay).sort((a,b)=>a.startTime.localeCompare(b.startTime));

  const [sessions, setSessions] = useState<Session[]>(()=>{
    try{return JSON.parse(localStorage.getItem("geo_sessions_"+(user?.id||""))||"[]");}catch{return [];}
  });
  useEffect(()=>{localStorage.setItem("geo_sessions_"+(user?.id||""),JSON.stringify(sessions));},[sessions,user?.id]);

  // Real-time attendance — update status on join, leave, kick
  useEffect(()=>{
    if(!attendanceEvents.length)return;
    const latest=attendanceEvents[0];
    setSessions(prev=>prev.map(s=>{
      if(s.id!==latest.sessionId||!s.isActive)return s;
      const exists = s.attendees.some(a=>a.studentId===latest.studentId);
      if(!exists){
        // New join
        toast.info(`${latest.studentName} joined`);
        return{...s,attendees:[...s.attendees,{...latest,status:"present"}]};
      } else {
        // Update existing (leave / kick / status change)
        const updatedAttendees = s.attendees.map(a=>
          a.studentId===latest.studentId
            ? {...a, status: latest.status, leftAt: latest.leftAt}
            : a
        );
        if(latest.status==="left") toast.warning(`${latest.studentName} left the session`);
        if(latest.status==="kicked") toast.error(`${latest.studentName} was kicked`);
        return{...s,attendees:updatedAttendees};
      }
    }));
  },[attendanceEvents]);

  const handleStart=({courseId,geoEnabled,radiusMeters,lat,lng}:{courseId:string;geoEnabled:boolean;radiusMeters:number;lat:number|null;lng:number|null})=>{
    const course=myCourses.find(c=>c.id===courseId);if(!course)return;
    const s:Session={id:Math.random().toString(36).slice(2),courseId,courseName:course.name,courseCode:course.code,
      startTime:new Date().toISOString(),isActive:true,geoEnabled,centerLat:lat,centerLng:lng,radiusMeters,attendees:[]};
    setSessions(p=>[s,...p]);setStart(false);
    emitSession({sessionId:s.id,courseId,courseName:course.name,action:"started",timestamp:s.startTime});
    localStorage.setItem("geo_active_session",JSON.stringify({id:s.id,courseId,courseName:course.name,courseCode:course.code,
      geoEnabled,centerLat:lat,centerLng:lng,radiusMeters,startTime:s.startTime}));
    toast.success(`Session started for ${course.name}`);
  };

  const handleEnd=(sessionId:string)=>{
    const s=sessions.find(x=>x.id===sessionId);if(!s)return;
    const endTime = new Date().toISOString();
    // Map AttendanceEvent[] to StoredAttendee format before saving
    const storedAttendees = s.attendees.map(a=>({
      studentId:   a.studentId,
      studentName: a.studentName,
      timestamp:   a.timestamp,
      geoStatus:   a.geoStatus,
      status:      a.status || "present",
      leftAt:      a.leftAt,
    }));
    setSessions(p=>p.map(x=>x.id===sessionId?{...x,isActive:false,endTime,attendees:s.attendees}:x));
    emitSession({sessionId,courseId:s.courseId,courseName:s.courseName,action:"ended",timestamp:endTime});
    localStorage.removeItem("geo_active_session");
    toast.success("Session ended");
  };

  const navItems:{id:Tab;label:string;icon:React.ReactNode}[]=[
    {id:"sessions",label:"Sessions",icon:<Radio className="w-5 h-5"/>},
    {id:"courses",label:"My Courses",icon:<BookOpen className="w-5 h-5"/>},
    {id:"schedule",label:"My Schedule",icon:<Calendar className="w-5 h-5"/>},
    {id:"attendance",label:"Attendance",icon:<ClipboardList className="w-5 h-5"/>},
    {id:"live",label:"Live Dashboard",icon:<Radio className="w-5 h-5"/>},
    {id:"quizzes",label:"Quizzes",icon:<FileQuestion className="w-5 h-5"/>},
  ];

  return (
    <div className="flex h-screen bg-[#0B1120] font-sans overflow-hidden" dir="ltr">
      {showSettings&&<ProfileSettingsModal onClose={()=>setSettings(false)}/>}
      {showQR&&<QRModal session={showQR} onClose={()=>setQR(null)}/>}
      {viewStudents&&<SessionStudentsModal session={viewStudents} onClose={()=>setViewStudents(null)}/>}
      {showStartModal&&<StartSessionModal courses={myCourses} enrollments={enrollments} onStart={handleStart} onClose={()=>setStart(false)}/>}
      {(showCourseModal||editCourse)&&<CourseModal course={editCourse} onSave={d=>{editCourse?updateCourse(editCourse.id,d):addCourse(d);setShowCourse(false);setEditCourse(null);}} onClose={()=>{setShowCourse(false);setEditCourse(null);}}/>}
      {(showSchedModal||editSchedule)&&<ScheduleModal schedule={editSchedule} defaultDay={activeDay} myCourses={myCourses} onSave={d=>{editSchedule?updateSchedule(editSchedule.id,d):addSchedule(d);setSched(false);setEditSched(null);}} onClose={()=>{setSched(false);setEditSched(null);}}/>}

      {/* Sidebar */}
      <aside className="w-64 bg-[#111827] border-r border-slate-800 hidden md:flex flex-col justify-between">
        <div>
          <div className="h-20 flex items-center px-8 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 p-1.5 rounded-lg"><MapPin className="text-white w-5 h-5"/></div>
              <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
            </div>
          </div>
          <nav className="p-4 flex flex-col gap-1 mt-4">
            {navItems.map(n=>(
              <button key={n.id} onClick={()=>setTab(n.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-sm ${tab===n.id?"bg-blue-500/10 text-blue-400 border border-blue-500/20":"text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent"}`}>
                {n.icon}{n.label}{tab===n.id&&<ChevronRight className="w-3.5 h-3.5 ml-auto"/>}
              </button>
            ))}
            <button onClick={()=>setSettings(true)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm border border-transparent">
              <Settings className="w-5 h-5"/>Settings & Profile
            </button>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button onClick={()=>setSettings(true)} className="w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-slate-800/50 hover:bg-blue-500/10 transition-all text-left">
            <div className="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
            <div className="overflow-hidden flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm truncate">Dr. {user?.firstName} {user?.lastName}</h3>
              <p className="text-slate-400 text-xs truncate">{user?.department||"Doctor"}</p>
            </div>
            <UserCircle className="w-4 h-4 text-slate-500 flex-shrink-0"/>
          </button>
          <button onClick={()=>{logout();navigate("/");}} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm">
            <LogOut className="w-5 h-5"/>Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto">

          {/* SESSIONS */}
          {tab==="sessions"&&(
            <>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b border-slate-800 pb-6 gap-4">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-white mb-1">Sessions</h1>
                  <p className="text-slate-400 text-sm">Start a live attendance session for your students.</p>
                </div>
                <div className="flex items-center gap-3">
                  <ConnectionStatus/>
                  {!sessions.find(s=>s.isActive)&&(
                    <button onClick={()=>setStart(true)} className="bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold py-2.5 px-5 rounded-lg flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(0,208,132,0.3)]">
                      <PlayCircle className="w-5 h-5"/>Start Session
                    </button>
                  )}
                </div>
              </div>

              {myCourses.length===0&&(
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0"/>
                  <p className="text-yellow-300 text-sm">Go to <strong>My Courses</strong> and add a course first.</p>
                </div>
              )}

              {sessions.filter(s=>s.isActive).length>0&&(
                <div className="mb-8">
                  <h2 className="text-white font-semibold flex items-center gap-2 mb-4"><Radio className="w-4 h-4 text-[#00D084] animate-pulse"/>Live Now</h2>
                  <div className="flex flex-col gap-4">
                    {sessions.filter(s=>s.isActive).map(s=>(
                      <LiveSessionCard key={s.id} session={s} onEnd={handleEnd} onShowQR={setQR} onViewStudents={setViewStudents}/>
                    ))}
                  </div>
                </div>
              )}

              {sessions.filter(s=>!s.isActive).length>0&&(
                <div>
                  <h2 className="text-slate-400 font-semibold text-sm uppercase tracking-wider flex items-center gap-2 mb-3"><Clock className="w-4 h-4"/>Past Sessions</h2>
                  <div className="flex flex-col gap-3">
                    {sessions.filter(s=>!s.isActive).map(s=>(
                      <div key={s.id} className="bg-[#111827] border border-slate-800 rounded-xl flex items-center justify-between px-5 py-4 hover:border-slate-700 transition-all">
                        <div>
                          <h3 className="text-white font-semibold">{s.courseName}</h3>
                          <p className="text-slate-400 text-xs">{formatTime(s.startTime)} → {s.endTime?formatTime(s.endTime):"—"} • {s.attendees.length} attended</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${s.attendees.length>0?Math.round(s.attendees.filter(a=>a.status!=="left"&&a.status!=="kicked").length/s.attendees.length*100)>=70?"text-[#00D084]":"text-yellow-400":"text-slate-500"}`}>
                            {s.attendees.length>0?`${Math.round(s.attendees.filter(a=>a.status!=="left"&&a.status!=="kicked").length/s.attendees.length*100)}%`:"—"}
                          </span>
                          <button onClick={()=>setViewStudents(s)} className="text-slate-400 hover:text-white text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                            <Users className="w-4 h-4"/>View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sessions.length===0&&(
                <div className="text-center py-20 text-slate-500">
                  <Radio className="w-12 h-12 mx-auto mb-4 opacity-30"/>
                  <p>No sessions yet. Start one for your students!</p>
                </div>
              )}
            </>
          )}

          {/* MY COURSES */}
          {tab==="courses"&&(
            <>
              <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
                <div><h1 className="text-3xl font-serif font-bold text-white mb-2">My Courses</h1><p className="text-slate-400 text-sm">Manage your courses.</p></div>
                <button onClick={()=>setShowCourse(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2"><Plus className="w-5 h-5"/>Add Course</button>
              </div>
              {myCourses.length===0
                ?<div className="text-center py-20 text-slate-500"><BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30"/><p>No courses yet.</p></div>
                :<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {myCourses.map(c=>{
                    const enrolled=enrollments.filter(e=>e.courseId===c.id).length;
                    return(
                      <div key={c.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-blue-400 text-xs font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{c.code}</span>
                            <h3 className="text-white font-bold mt-1 truncate">{c.name}</h3>
                            <p className="text-slate-400 text-xs">{c.department}</p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={()=>setEditCourse(c)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"><Edit3 className="w-4 h-4"/></button>
                            <button onClick={()=>deleteCourse(c.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        </div>
                        <div className="flex gap-3 pt-2 border-t border-slate-800 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-[#00D084]"/>{enrolled} students</span>
                          {c.location&&<span>📍 {c.location}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
            </>
          )}

          {/* MY SCHEDULE */}
          {tab==="schedule"&&(
            <>
              <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-6">
                <div><h1 className="text-3xl font-serif font-bold text-white mb-2">My Schedule</h1><p className="text-slate-400 text-sm">Weekly timetable.</p></div>
                <button onClick={()=>setSched(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-lg flex items-center gap-2"><Plus className="w-5 h-5"/>Add Slot</button>
              </div>
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {DAYS.map(d=>{
                  const count=mySchedules.filter(s=>s.day===d).length;
                  return(
                    <button key={d} onClick={()=>setDay(d)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex-shrink-0 border ${activeDay===d?DAY_COLOR[d]:"bg-[#111827] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"}`}>
                      {d}{count>0&&<span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${activeDay===d?"bg-white/20":"bg-slate-700"}`}>{count}</span>}
                    </button>
                  );
                })}
              </div>
              {daySchedules.length===0
                ?<div className="text-center py-16 text-slate-500"><Calendar className="w-12 h-12 mx-auto mb-4 opacity-30"/><p>No classes on {activeDay}</p></div>
                :<div className="flex flex-col gap-4">
                  {daySchedules.map(s=>{
                    const course=myCourses.find(c=>c.id===s.courseId);
                    return(
                      <div key={s.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex items-center gap-4 hover:border-slate-700 transition-all">
                        <div className={`flex-shrink-0 text-center px-4 py-3 rounded-xl border ${DAY_COLOR[activeDay]}`}>
                          <p className="text-xs font-semibold opacity-70">START</p>
                          <p className="text-lg font-bold">{s.startTime}</p>
                          <p className="text-xs opacity-60">{s.endTime}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          {course&&<span className="text-blue-400 text-xs font-bold bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">{course.code}</span>}
                          <h3 className="text-white font-bold mt-1 truncate">{course?.name||"Unknown"}</h3>
                          {s.location&&<p className="text-slate-400 text-sm mt-1">📍 {s.location}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={()=>setEditSched(s)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg"><Edit3 className="w-4 h-4"/></button>
                          <button onClick={()=>deleteSchedule(s.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              }
            </>
          )}

          {tab==="attendance"&&<DoctorSessionHistory/>}
          {tab==="live"&&<DoctorLiveDashboard/>}
          {tab==="quizzes"&&(
            <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
              <div className="mb-8 pb-6 border-b border-slate-800">
                <h1 className="text-3xl font-serif font-bold text-white mb-1">My Quizzes</h1>
                <p className="text-slate-400 text-sm">Create and manage quizzes for your courses.</p>
              </div>
              <DoctorQuizPanel />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
