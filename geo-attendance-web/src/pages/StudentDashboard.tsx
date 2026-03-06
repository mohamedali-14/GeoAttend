import { useNavigate } from "react-router-dom";
import { 
  LogOut, 
  MapPin, 
  Home, 
  ClipboardList, 
  Settings,
  User as UserIcon 
} from "lucide-react";
import { LectureCard } from "./LectureCard";

const MOCK_LECTURES = [
  { _id: "1", title: "Introduction to Computer Science", doctor: { name: "Dr. Ahmed Hassan" }, scheduledAt: "10:00 AM - 12:00 PM", status: "ACTIVE" as const },
  { _id: "2", title: "Data Structures & Algorithms", doctor: { name: "Dr. Sarah Ali" }, scheduledAt: "02:00 PM - 04:00 PM", status: "SCHEDULED" as const },
  { _id: "3", title: "Database Systems", doctor: { name: "Dr. Mahmoud Tariq" }, scheduledAt: "08:00 AM - 10:00 AM", status: "COMPLETED" as const },
  { _id: "4", title: "Software Engineering", doctor: { name: "Dr. Khaled Omar" }, scheduledAt: "12:00 PM - 02:00 PM", status: "CANCELLED" as const }
];

export default function StudentDashboard() {
  const navigate = useNavigate();

  return (
    // استخدام flex لتقسيم الشاشة بالعرض
    <div className="flex h-screen bg-[#0B1120] font-sans text-left overflow-hidden" dir="ltr">
      
      {/* 1. القائمة الجانبية (Sidebar) */}
      <aside className="w-64 bg-[#111827] border-r border-slate-800 hidden md:flex flex-col justify-between">
        
        <div>
          {/* الشعار */}
          <div className="h-20 flex items-center px-8 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="bg-[#00D084] p-1.5 rounded-lg">
                <MapPin className="text-gray-900 w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
            </div>
          </div>

          {/* روابط التنقل */}
          <nav className="p-4 flex flex-col gap-2 mt-4">
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#00D084]/10 text-[#00D084] font-medium transition-colors">
              <Home className="w-5 h-5" />
              My Lectures
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <MapPin className="w-5 h-5" />
              Join Lecture
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <ClipboardList className="w-5 h-5" />
              Attendance History
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </nav>
        </div>

        {/* بيانات المستخدم وتسجيل الخروج في أسفل الـ Sidebar */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-slate-800/50">
            <div className="bg-[#00D084] w-10 h-10 rounded-full flex items-center justify-center text-gray-900 font-bold shadow-[0_0_10px_rgba(0,208,132,0.4)]">
              <UserIcon className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h3 className="text-white font-medium text-sm truncate">Student User</h3>
              <p className="text-slate-400 text-xs">ID: 20240001</p>
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

      {/* 2. المحتوى الرئيسي (Main Content) */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        
        <div className="max-w-5xl mx-auto">
          {/* عنوان الصفحة */}
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-3xl font-serif font-bold text-white mb-2">My Lectures</h1>
            <p className="text-slate-400 text-sm">View today's schedule and join active sessions.</p>
          </div>

          {/* شبكة الكروت */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {MOCK_LECTURES.map((lecture) => (
              <LectureCard key={lecture._id} lecture={lecture} />
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}