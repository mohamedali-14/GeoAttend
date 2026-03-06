import { useNavigate } from "react-router-dom";
import { 
  LogOut, 
  MapPin, 
  LayoutDashboard, 
  Users, 
  Settings,
  PlusCircle,
  PlayCircle,
  CheckCircle,
  Clock
} from "lucide-react";

// بيانات وهمية خاصة بالدكتور (محاضراته هو فقط)
const DOCTOR_LECTURES = [
  { _id: "101", title: "Introduction to Computer Science", time: "10:00 AM - 12:00 PM", status: "ACTIVE", studentsCount: 45 },
  { _id: "102", title: "Data Structures & Algorithms", time: "02:00 PM - 04:00 PM", status: "SCHEDULED", studentsCount: 0 },
  { _id: "103", title: "Advanced Programming", time: "08:00 AM - 10:00 AM", status: "COMPLETED", studentsCount: 120 },
];

export default function DoctorDashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-[#0B1120] font-sans text-left overflow-hidden" dir="ltr">
      
      {/* 1. القائمة الجانبية للدكتور (Sidebar) */}
      <aside className="w-64 bg-[#111827] border-r border-slate-800 hidden md:flex flex-col justify-between">
        <div>
          {/* الشعار */}
          <div className="h-20 flex items-center px-8 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 p-1.5 rounded-lg">
                <MapPin className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
            </div>
          </div>

          {/* روابط الدكتور */}
          <nav className="p-4 flex flex-col gap-2 mt-4">
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 text-blue-500 font-medium transition-colors">
              <LayoutDashboard className="w-5 h-5" />
              My Courses
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <PlusCircle className="w-5 h-5" />
              Create Lecture
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <Users className="w-5 h-5" />
              Students & Reports
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </nav>
        </div>

        {/* بيانات الدكتور وتسجيل الخروج */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-slate-800/50">
            <div className="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-[0_0_10px_rgba(59,130,246,0.4)]">
              Dr
            </div>
            <div className="overflow-hidden">
              <h3 className="text-white font-medium text-sm truncate">Dr. Ahmed</h3>
              <p className="text-slate-400 text-xs">Professor</p>
            </div>
          </div>
          <button 
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* 2. المحتوى الرئيسي للدكتور */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          
          {/* عنوان الصفحة وزر الإضافة */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 border-b border-slate-800 pb-6 gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-white mb-2">Instructor Dashboard</h1>
              <p className="text-slate-400 text-sm">Manage your lectures and track student attendance.</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              New Lecture
            </button>
          </div>

          {/* قائمة محاضرات الدكتور */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {DOCTOR_LECTURES.map((lecture) => (
              <div key={lecture._id} className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between">
                
                <div className="flex justify-between items-start mb-4 gap-2">
                  <h3 className="text-lg font-bold text-white leading-tight">{lecture.title}</h3>
                  {lecture.status === "ACTIVE" && <span className="px-3 py-1 bg-[#00D084]/20 text-[#00D084] text-xs font-bold rounded-full border border-[#00D084]/30">ACTIVE</span>}
                  {lecture.status === "SCHEDULED" && <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 text-xs font-bold rounded-full border border-yellow-500/30">SCHEDULED</span>}
                  {lecture.status === "COMPLETED" && <span className="px-3 py-1 bg-slate-500/20 text-slate-400 text-xs font-bold rounded-full border border-slate-500/30">COMPLETED</span>}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>{lecture.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span>{lecture.studentsCount} Students present</span>
                  </div>
                </div>

                {/* الأزرار تتغير حسب حالة المحاضرة */}
                {lecture.status === "ACTIVE" ? (
                  <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                    Stop Attendance
                  </button>
                ) : lecture.status === "SCHEDULED" ? (
                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <PlayCircle className="w-5 h-5" />
                    Start Lecture & Generate QR
                  </button>
                ) : (
                  <button className="w-full bg-[#1E293B] hover:bg-slate-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    View Attendance Report
                  </button>
                )}
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}