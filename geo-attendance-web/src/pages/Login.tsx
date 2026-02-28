import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapPin, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  // ذاكرة صغيرة لمعرفة هل نظهر الباسورد أم نخفيه
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.toLowerCase().includes("dr") || email.toLowerCase().includes("doctor")) {
      navigate("/doctor");
    } else {
      navigate("/student");
    }
  };

  return (
    // الخلفية الزرقاء الداكنة جداً
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-4 font-sans text-left" dir="ltr">
      
      {/* المربع الداخلي (Card) */}
      <div className="w-full max-w-md bg-[#111827] p-8 rounded-2xl shadow-2xl border border-slate-800">
        
        {/* الشعار (Logo) */}
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-[#00D084] p-1.5 rounded-lg">
            <MapPin className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
        </div>

        {/* العناوين */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* حقل الإيميل */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email Address / Student ID
            </label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email or Student ID" 
              className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all placeholder:text-slate-500"
              required 
            />
          </div>

          {/* حقل الباسورد مع أيقونة العين */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all placeholder:text-slate-500 pr-10"
                required 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* رابط نسيان كلمة المرور */}
          <div className="flex justify-end mt-[-8px]">
            {/* استخدمنا Link لكي ينقلنا لصفحة النسيان لاحقاً */}
            <Link to="/forgot-password" className="text-sm text-[#00D084] hover:text-[#00B070] transition-colors">
              Forgot password?
            </Link>
          </div>

          {/* زر الدخول (بإضاءة خضراء متوهجة مثل الصورة) */}
          <button 
            type="submit" 
            className="w-full mt-2 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold text-lg h-12 rounded-lg transition-all shadow-[0_0_15px_rgba(0,208,132,0.3)] hover:shadow-[0_0_20px_rgba(0,208,132,0.5)]"
          >
            Sign In
          </button>
        </form>

        {/* رابط إنشاء الحساب */}
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