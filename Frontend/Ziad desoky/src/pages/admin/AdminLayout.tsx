import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MapPin, LayoutDashboard, Users, BookOpen, Shield, LogOut,
  Menu, X, ChevronRight, Settings, GraduationCap, Calendar, Radio, History, FileQuestion
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { ReactNode } from "react";

const NAV = [
  { path: "/admin",                  label: "Dashboard",   icon: LayoutDashboard },
  { path: "/admin/users",            label: "Users",       icon: Users           },
  { path: "/admin/courses",          label: "Courses",     icon: GraduationCap   },
  { path: "/admin/course-enrollment",label: "Enrollment",  icon: Users           },
  { path: "/admin/schedule",         label: "Schedule",    icon: Calendar        },
  { path: "/admin/live",             label: "Live",        icon: Radio           },
  { path: "/admin/sessions",          label: "Sessions",    icon: History         },
  { path: "/admin/quizzes",          label: "Quizzes",     icon: FileQuestion    },
  { path: "/admin/settings",         label: "Settings",    icon: Settings        },
];

// ── مستقلة تماماً بره AdminLayout عشان مفيش warnings ──
interface SidebarProps {
  user: { firstName?: string; lastName?: string } | null;
  isActive: (path: string) => boolean;
  navigate: (path: string) => void;
  setSidebarOpen: (v: boolean) => void;
  handleLogout: () => void;
}

function SidebarContent({ user, isActive, navigate, setSidebarOpen, handleLogout }: SidebarProps) {
  return (
      <>
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Logo */}
          <div className="h-20 flex items-center px-8 border-b border-purple-900/40 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-purple-500 p-1.5 rounded-lg"><MapPin className="text-white w-5 h-5" /></div>
              <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
            </div>
          </div>

          {/* Label */}
          <div className="px-6 py-3 border-b border-purple-900/30 flex-shrink-0">
          <span className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1">
            <Shield className="w-3 h-3" />Admin Panel
          </span>
          </div>

          {/* Nav */}
          <nav className="p-3 flex flex-col gap-0.5 flex-1">
            {NAV.map(({ path, label, icon: Icon }) => {
              const active = isActive(path);
              return (
                  <button key={path}
                          onClick={() => { navigate(path); setSidebarOpen(false); }}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all text-sm ${
                              active
                                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/20"
                                  : "text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent"
                          }`}>
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                    {active && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                  </button>
              );
            })}
          </nav>
        </div>

        {/* Profile + Logout */}
        <div className="p-3 border-t border-purple-900/30 flex-shrink-0">
          <button
              onClick={() => { navigate("/admin/settings"); setSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 mb-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all text-left">
            <div className="bg-purple-500 w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-[0_0_12px_rgba(168,85,247,0.4)] flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-purple-400 text-xs">System Admin</p>
            </div>
            <Settings className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          </button>
          <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate("/"); };

  const isActive = (path: string) =>
      path === "/admin"
          ? location.pathname === "/admin"
          : location.pathname.startsWith(path);

  const sidebarProps: SidebarProps = { user, isActive, navigate, setSidebarOpen, handleLogout };

  return (
      <div className="flex h-screen bg-[#0B1120] font-sans overflow-hidden" dir="ltr">
        {sidebarOpen && (
            <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Mobile sidebar */}
        <aside className={`fixed inset-y-0 left-0 w-64 bg-[#0f1421] border-r border-purple-900/30 flex flex-col z-50 transition-transform duration-200 md:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <SidebarContent {...sidebarProps} />
        </aside>

        {/* Desktop sidebar */}
        <aside className="w-64 bg-[#0f1421] border-r border-purple-900/30 hidden md:flex flex-col flex-shrink-0">
          <SidebarContent {...sidebarProps} />
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile topbar */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#0f1421] border-b border-purple-900/30">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-white font-bold text-sm">Admin Panel</span>
            <button onClick={() => setSidebarOpen(false)} className="ml-auto text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
  );
}