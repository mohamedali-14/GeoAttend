import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapPin, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiLogin } from "../../services/api";
import { MOCK_USERS } from "../../context/MockDataContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier,   setIdentifier]   = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // ── Try real backend first ────────────────────────────────────────────
      let loggedUser = null;
      try {
        const data = await apiLogin(identifier, password);
        /*
          const allUsers = JSON.parse(localStorage.getItem("geo_all_users") || "[]");
      const user = allUsers.find((u: any) => u.email === identifier || u.studentID === identifier);
      if (!user || (user.password && user.password !== password)) {
        throw new Error("Invalid email or password.");
      }
      const data = { user };
         */
        loggedUser = data.user;
      } catch {
        // ── Backend unavailable → fall back to mock users ─────────────────
        const found = MOCK_USERS.find(u =>
          (u.email === identifier || u.studentID === identifier) &&
          u.password === password
        );
        if (found) {
          loggedUser = {
            id:         found.id,
            firstName:  found.firstName,
            lastName:   found.lastName,
            email:      found.email,
            role:       found.role as "STUDENT" | "DOCTOR" | "ADMIN",
            department: found.department,
            studentID:  found.studentID,
            isBanned:   found.isBanned ?? false,
          };
        }
      }

      if (!loggedUser) {
        setError("Invalid email or password.");
        return;
      }
      if (loggedUser.isBanned) {
        setError("Your account has been suspended. Contact support.");
        return;
      }
      login(loggedUser);
      if      (loggedUser.role === "ADMIN")  navigate("/admin");
      else if (loggedUser.role === "DOCTOR") navigate("/doctor");
      else                                   navigate("/student");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-4 font-sans" dir="ltr">
      <div className="w-full max-w-md bg-[#111827] p-8 rounded-2xl shadow-2xl border border-slate-800">
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-[#00D084] p-1.5 rounded-lg">
            <MapPin className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
        </div>
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
        </div>
        {error && (
          <div className="mb-5 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email / Student ID
            </label>
            <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
              placeholder="Email or Student ID"
              className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all placeholder:text-slate-500"
              required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all placeholder:text-slate-500 pr-10"
                required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end mt-[-8px]">
            <Link to="/forgot-password" className="text-sm text-[#00D084] hover:text-[#00B070] transition-colors">
              Forgot password?
            </Link>
          </div>
          <button type="submit" disabled={loading}
            className="w-full mt-2 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold text-lg h-12 rounded-lg transition-all shadow-[0_0_15px_rgba(0,208,132,0.3)] disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Signing in...</> : "Sign In"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-400">
          Don't have an account?{" "}
          <Link to="/register" className="text-[#00D084] hover:text-[#00B070] font-medium transition-colors">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
