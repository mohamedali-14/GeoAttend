import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../context/AuthContext";
import { apiLogin } from "../../services/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Register() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const [role, setRole]               = useState<"DOCTOR" | "STUDENT">("STUDENT");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    department: "", studentID: "", password: ""
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);

    try {
      // 1 — عمل الأكونت في Firebase عن طريق الباك
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:     form.email,
          password:  form.password,
          fullName:  `${form.firstName} ${form.lastName}`,
          role:      role,
          department: form.department,
          studentId: form.studentID,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      // 2 — Login تلقائي بعد التسجيل
      const loginData = await apiLogin(form.email, form.password);
      login({ ...loginData.user, role: role as UserRole });

      if (role === "DOCTOR") navigate("/doctor");
      else navigate("/student");

    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };
/*
 const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }

    const allUsers = JSON.parse(localStorage.getItem("geo_all_users") || "[]");
    if (allUsers.find((u: any) => u.email === form.email)) {
      setError("Email already in use"); return;
    }

    const newUser = {
      id: Date.now().toString(),
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      role: role,
      department: form.department,
      studentID: form.studentID,
      isBanned: false,
    };

    allUsers.push(newUser);
    localStorage.setItem("geo_all_users", JSON.stringify(allUsers));
    login(newUser);

    if (role === "DOCTOR") navigate("/doctor");
    else navigate("/student");
  };
 */
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-4 font-sans" dir="ltr">
      <div className="w-full max-w-md bg-[#111827] p-8 rounded-2xl shadow-2xl border border-slate-800 my-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-[#00D084] p-1.5 rounded-lg"><MapPin className="text-white w-5 h-5" /></div>
          <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
        </div>
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">Create account</h1>
          <p className="text-slate-400 text-sm">Register as a Doctor or Student</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        <div className="flex gap-4 mb-6">
          {(["DOCTOR", "STUDENT"] as const).map(r => (
            <button key={r} type="button" onClick={() => setRole(r)}
              className={`flex-1 py-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${role === r ? "border-[#00D084] text-[#00D084] bg-[#00D084]/10" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
              <span className="text-2xl">{r === "DOCTOR" ? "👨‍🏫" : "🎓"}</span>
              <span className="text-sm font-semibold">{r === "DOCTOR" ? "Doctor" : "Student"}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
              <input type="text" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="Ahmed"
                className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] transition-all" required />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
              <input type="text" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Hassan"
                className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] transition-all" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@university.edu"
              className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] transition-all" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Department</label>
            <input type="text" value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="e.g. Computer Science"
              className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] transition-all" required />
          </div>
          {role === "STUDENT" && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Student ID</label>
              <input type="text" value={form.studentID} onChange={e => setForm({...form, studentID: e.target.value})} placeholder="e.g. 20240001"
                className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] transition-all" required />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 6 characters"
                className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] transition-all pr-10" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full mt-4 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold text-lg h-12 rounded-lg transition-all shadow-[0_0_15px_rgba(0,208,132,0.3)] disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Creating...</> : "Create Account"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/" className="text-[#00D084] hover:text-[#00B070] font-medium">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
