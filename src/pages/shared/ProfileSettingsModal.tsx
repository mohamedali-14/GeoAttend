import { useState } from "react";
import { X, User, Hash, Building2, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Save } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMockData } from "../../context/MockDataContext";

interface Props { onClose: () => void; }

type Tab = "profile" | "security";

export default function ProfileSettingsModal({ onClose }: Props) {
  const { user, updateUser } = useAuth();
  const { updateUserInList } = useMockData();

  const [tab, setTab] = useState<Tab>("profile");

  // ── Profile state ──
  const [firstName,   setFirstName]   = useState(user?.firstName   || "");
  const [lastName,    setLastName]    = useState(user?.lastName    || "");
  const [department,  setDepartment]  = useState(user?.department  || "");
  const [studentID,   setStudentID]   = useState(user?.studentID   || "");

  // ── Security state ──
  const [curPass,     setCurPass]     = useState("");
  const [newPass,     setNewPass]     = useState("");
  const [confPass,    setConfPass]    = useState("");
  const [showCur,     setShowCur]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConf,    setShowConf]    = useState(false);

  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);

  const showFlash = (ok: boolean, msg: string) => {
    setFlash({ ok, msg });
    setTimeout(() => setFlash(null), 3500);
  };

  const inputCls = "w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all placeholder:text-slate-500";
  const labelCls = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2";

  // ── Save Profile ──
  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return showFlash(false, "First and last name are required.");
    const updated = {
      ...user!,
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      department: department.trim() || user?.department,
      ...(user?.role === "STUDENT" && { studentID: studentID.trim() }),
    };
    updateUser(updated);
    updateUserInList(user!.id, updated);
    showFlash(true, "Profile saved successfully!");
  };

  // ── Change Password ──
  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = user?.password || "";
    if (stored && curPass !== stored) return showFlash(false, "Current password is incorrect.");
    if (newPass.length < 6)          return showFlash(false, "New password must be at least 6 characters.");
    if (newPass !== confPass)         return showFlash(false, "Passwords do not match.");
    const updated = { ...user!, password: newPass };
    updateUser(updated);
    updateUserInList(user!.id, updated);
    setCurPass(""); setNewPass(""); setConfPass("");
    showFlash(true, "Password changed successfully!");
  };

  const accentColor = user?.role === "DOCTOR" ? "text-blue-400 border-blue-500" : "text-[#00D084] border-[#00D084]";
  const avatarBg    = user?.role === "DOCTOR" ? "bg-blue-500" : "bg-[#00D084]";
  const avatarText  = user?.role === "DOCTOR" ? "text-white"  : "text-gray-900";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`${avatarBg} w-10 h-10 rounded-full flex items-center justify-center ${avatarText} font-bold text-sm`}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
              <p className="text-slate-400 text-xs">{user?.email} · {user?.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 flex-shrink-0">
          {(["profile", "security"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
                tab === t ? `${accentColor} border-b-2` : "text-slate-400 hover:text-white"
              }`}>
              {t === "profile" ? "👤 Profile" : "🔒 Security"}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {/* Flash */}
          {flash && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-3 mb-5 ${
              flash.ok
                ? "bg-[#00D084]/10 border border-[#00D084]/30 text-[#00D084]"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}>
              {flash.ok
                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {flash.msg}
            </div>
          )}

          {/* ── PROFILE TAB ── */}
          {tab === "profile" && (
            <form onSubmit={saveProfile} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><User className="inline w-3 h-3 mr-1" />First Name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} placeholder="First name" />
                </div>
                <div>
                  <label className={labelCls}>Last Name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} placeholder="Last name" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Email (read-only)</label>
                <input value={user?.email} readOnly className={`${inputCls} opacity-40 cursor-not-allowed`} />
              </div>

              {/* Department for Doctor & Student */}
              {(user?.role === "DOCTOR" || user?.role === "STUDENT") && (
                <div>
                  <label className={labelCls}><Building2 className="inline w-3 h-3 mr-1" />Department</label>
                  <input value={department} onChange={e => setDepartment(e.target.value)} className={inputCls} placeholder="e.g. Computer Science" />
                </div>
              )}

              {/* Student ID for Student only */}
              {user?.role === "STUDENT" && (
                <div>
                  <label className={labelCls}><Hash className="inline w-3 h-3 mr-1" />Student ID</label>
                  <input value={studentID} onChange={e => setStudentID(e.target.value)} className={inputCls} placeholder="e.g. 20240001" />
                </div>
              )}

              <button type="submit"
                className="w-full bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-2 shadow-[0_0_15px_rgba(0,208,132,0.2)]">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </form>
          )}

          {/* ── SECURITY TAB ── */}
          {tab === "security" && (
            <form onSubmit={savePassword} className="flex flex-col gap-4">
              {[
                { label: "Current Password", val: curPass,  set: setCurPass,  show: showCur,  toggle: () => setShowCur(v=>!v)  },
                { label: "New Password",      val: newPass,  set: setNewPass,  show: showNew,  toggle: () => setShowNew(v=>!v)  },
                { label: "Confirm Password",  val: confPass, set: setConfPass, show: showConf, toggle: () => setShowConf(v=>!v) },
              ].map(f => (
                <div key={f.label}>
                  <label className={labelCls}><Lock className="inline w-3 h-3 mr-1" />{f.label}</label>
                  <div className="relative">
                    <input type={f.show ? "text" : "password"} value={f.val}
                      onChange={e => f.set(e.target.value)}
                      className={`${inputCls} pr-10`} placeholder="••••••••" />
                    <button type="button" onClick={f.toggle}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {f.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}

              <button type="submit"
                className="w-full bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-2 shadow-[0_0_15px_rgba(0,208,132,0.2)]">
                <Lock className="w-4 h-4" /> Change Password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
