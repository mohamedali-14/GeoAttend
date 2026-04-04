import { useNavigate } from "react-router-dom";
import {
  Users, BookOpen, Shield, Activity, AlertTriangle,
  GraduationCap, Calendar, UserCheck, ChevronRight
} from "lucide-react";
import AdminLayout from "./AdminLayout";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useMockData } from "../../context/MockDataContext";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const { users, lectures, courses, schedules, enrollments } = useMockData();
  const { user } = useAuth();
  const navigate = useNavigate();

  const stats = [
    { label: "Total Users",    value: users.length,                                         icon: Users,         color: "text-blue-400",    bg: "bg-blue-500/10   border-blue-500/20",    route: "/admin/users"    },
    { label: "Total Courses",  value: courses.length,                                       icon: GraduationCap, color: "text-[#00D084]",   bg: "bg-[#00D084]/10  border-[#00D084]/20",   route: "/admin/courses"  },
    { label: "Schedules",      value: schedules.length,                                     icon: Calendar,      color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20",  route: "/admin/schedule" },
    { label: "Enrollments",    value: enrollments.length,                                   icon: UserCheck,     color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20",  route: "/admin/courses"  },
    { label: "Active Lectures",value: lectures.filter(l => l.status === "ACTIVE").length,  icon: Activity,      color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20",  route: "/admin/lectures" },
    { label: "Banned Users",   value: users.filter(u => u.isBanned).length,                icon: AlertTriangle, color: "text-red-400",     bg: "bg-red-500/10    border-red-500/20",     route: "/admin/users"    },
    { label: "Admins",         value: users.filter(u => u.role === "ADMIN").length,        icon: Shield,        color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20",  route: "/admin/users"    },
    { label: "Doctors",        value: users.filter(u => u.role === "DOCTOR").length,       icon: BookOpen,      color: "text-blue-400",    bg: "bg-blue-500/10   border-blue-500/20",    route: "/admin/users"    },
  ];

  const quickActions = [
    { label: "Manage Users",   icon: Users,         color: "text-blue-400",   bg: "bg-blue-500/10   hover:bg-blue-500/20   border-blue-500/20",   route: "/admin/users"    },
    { label: "Add Course",     icon: GraduationCap, color: "text-[#00D084]",  bg: "bg-[#00D084]/10  hover:bg-[#00D084]/20  border-[#00D084]/20",  route: "/admin/courses"  },
    { label: "Set Schedule",   icon: Calendar,      color: "text-yellow-400", bg: "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20", route: "/admin/schedule" },
    { label: "Enrollments",    icon: UserCheck,     color: "text-indigo-400", bg: "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20", route: "/admin/courses"  },
  ];

  const recentLectures = lectures.slice(0, 4);
  const recentUsers    = users.slice(0, 4);

  return (
    <AdminLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8 pb-6 border-b border-slate-800">
          <h1 className="text-3xl font-serif font-bold text-white mb-1">System Overview</h1>
          <p className="text-slate-400 text-sm">Welcome back, {user?.firstName}. Here's what's happening.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <button key={s.label} onClick={() => navigate(s.route)}
              className={`bg-[#111827] border rounded-xl p-5 text-left hover:scale-[1.02] transition-all ${s.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-xs">{s.label}</p>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map(a => (
              <button key={a.label} onClick={() => navigate(a.route)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-semibold transition-all ${a.bg} ${a.color}`}>
                <a.icon className="w-5 h-5 flex-shrink-0" />
                {a.label}
                <ChevronRight className="w-4 h-4 ml-auto opacity-60" />
              </button>
            ))}
          </div>
        </div>

        {/* Bottom tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Lectures */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#00D084]" />Recent Lectures
              </h2>
              <button onClick={() => navigate("/admin/lectures")} className="text-xs text-slate-400 hover:text-[#00D084] transition-colors">View all →</button>
            </div>
            <div className="flex flex-col gap-0">
              {recentLectures.map((l, i) => (
                <div key={l.id} className={`flex items-center justify-between py-3 ${i < recentLectures.length - 1 ? "border-b border-slate-800" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{l.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{l.doctorName}</p>
                  </div>
                  <span className={`ml-3 flex-shrink-0 px-2 py-0.5 text-xs font-bold rounded-full border ${
                    l.status === "ACTIVE"    ? "bg-[#00D084]/20 text-[#00D084] border-[#00D084]/30" :
                    l.status === "SCHEDULED" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                    l.status === "COMPLETED" ? "bg-slate-600/20 text-slate-400 border-slate-600/30" :
                    "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}>{l.status}</span>
                </div>
              ))}
              {recentLectures.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No lectures yet.</p>}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />Recent Users
              </h2>
              <button onClick={() => navigate("/admin/users")} className="text-xs text-slate-400 hover:text-purple-400 transition-colors">View all →</button>
            </div>
            <div className="flex flex-col gap-0">
              {recentUsers.map((u, i) => (
                <div key={u.id} className={`flex items-center justify-between py-3 ${i < recentUsers.length - 1 ? "border-b border-slate-800" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      u.role === "ADMIN"  ? "bg-purple-500/20 text-purple-400" :
                      u.role === "DOCTOR" ? "bg-blue-500/20   text-blue-400"   :
                      "bg-[#00D084]/20 text-[#00D084]"
                    }`}>{u.firstName[0]}{u.lastName[0]}</div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                      <p className="text-slate-500 text-xs truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                    {u.isBanned && <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full">Banned</span>}
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${
                      u.role === "ADMIN"  ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                      u.role === "DOCTOR" ? "bg-blue-500/20   text-blue-400   border-blue-500/30"   :
                      "bg-slate-700 text-slate-300 border-slate-600"
                    }`}>{u.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
