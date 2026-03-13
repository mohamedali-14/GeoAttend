import { useState } from "react";
import { Lock, Mail, Eye, EyeOff, Save, CheckCircle, AlertCircle, Shield } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { useMockData } from "../../context/MockDataContext";

// ── Flash component moved outside to avoid "component defined inside render" warning ──
interface FlashMsg { ok: boolean; msg: string }
function Flash({ f }: { f: FlashMsg | null }) {
  if (!f) return null;
  return (
    <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-3 ${
      f.ok ? "bg-purple-500/10 border border-purple-500/30 text-purple-300"
           : "bg-red-500/10 border border-red-500/30 text-red-400"
    }`}>
      {f.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {f.msg}
    </div>
  );
}

export default function AdminSettings() {
  const { user, updateUser } = useAuth();
  const { updateUserInList }  = useMockData();

  const [curPass,  setCurPass]  = useState("");
  const [newPass,  setNewPass]  = useState("");
  const [confPass, setConfPass] = useState("");
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [passFlash,  setPassFlash]  = useState<FlashMsg | null>(null);
  const [gmail,      setGmail]      = useState(user?.gmail || "");
  const [gmailFlash, setGmailFlash] = useState<FlashMsg | null>(null);

  const showFlash = (setter: (v: FlashMsg | null) => void, ok: boolean, msg: string) => {
    setter({ ok, msg });
    setTimeout(() => setter(null), 3500);
  };

  const inputCls = "w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-slate-500";
  const labelCls = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2";

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = user?.password || "123456";
    if (curPass !== stored)   { showFlash(setPassFlash, false, "Current password is incorrect."); return; }
    if (newPass.length < 6)   { showFlash(setPassFlash, false, "New password must be at least 6 characters."); return; }
    if (newPass !== confPass)  { showFlash(setPassFlash, false, "Passwords do not match."); return; }
    const updated = { ...user!, password: newPass };
    updateUser(updated);
    updateUserInList(user!.id, updated);
    setCurPass(""); setNewPass(""); setConfPass("");
    showFlash(setPassFlash, true, "Password updated successfully!");
  };

  const handleGmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (gmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail)) {
      showFlash(setGmailFlash, false, "Please enter a valid email address.");
      return;
    }
    const updated = { ...user!, gmail: gmail.trim() };
    updateUser(updated);
    updateUserInList(user!.id, updated);
    showFlash(setGmailFlash, true, gmail ? "Recovery email saved!" : "Recovery email removed.");
  };

  return (
    <AdminLayout>
      <div className="p-6 md:p-10 max-w-xl mx-auto">
        <div className="mb-8 pb-6 border-b border-slate-800">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">Admin Settings</h1>
          <p className="text-slate-400 text-sm">Manage your password and recovery options.</p>
        </div>

        <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
          <div className="bg-purple-500 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
            <Shield className="text-white w-5 h-5" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
            <p className="text-purple-400 text-xs">{user?.email} · System Administrator</p>
            {user?.gmail && <p className="text-slate-400 text-xs mt-0.5">Recovery: {user.gmail}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Change Password */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-400" /> Change Password
            </h2>
            <p className="text-slate-500 text-xs mb-5">Update your admin password regularly for security.</p>
            <form onSubmit={handlePassword} className="flex flex-col gap-4">
              {([
                { label: "Current Password", val: curPass,  set: setCurPass,  show: showCur,  toggle: () => setShowCur(v=>!v)  },
                { label: "New Password",      val: newPass,  set: setNewPass,  show: showNew,  toggle: () => setShowNew(v=>!v)  },
                { label: "Confirm Password",  val: confPass, set: setConfPass, show: showConf, toggle: () => setShowConf(v=>!v) },
              ] as const).map(f => (
                <div key={f.label}>
                  <label className={labelCls}>{f.label}</label>
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
              <Flash f={passFlash} />
              <button type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Update Password
              </button>
            </form>
          </div>

          {/* Recovery Gmail */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-400" /> Recovery Gmail
            </h2>
            <p className="text-slate-500 text-xs mb-5">Add a personal Gmail as backup in case you forget your password.</p>
            <form onSubmit={handleGmail} className="flex flex-col gap-4">
              <div>
                <label className={labelCls}>Gmail Address</label>
                <input type="email" value={gmail} onChange={e => setGmail(e.target.value)}
                  className={inputCls} placeholder="yourname@gmail.com" />
                {user?.gmail && <p className="text-xs text-purple-400 mt-1.5">Current: {user.gmail}</p>}
              </div>
              <Flash f={gmailFlash} />
              <button type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> {user?.gmail ? "Update Recovery Email" : "Add Recovery Email"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
