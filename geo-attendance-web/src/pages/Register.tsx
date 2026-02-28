import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Eye, EyeOff } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  // ذاكرة لمعرفة هل المستخدم اختار دكتور أم طالب (الافتراضي: طالب)
  const [role, setRole] = useState<"doctor" | "student">("student");
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // توجيه المستخدم حسب اختياره
    if (role === "doctor") {
      navigate("/doctor");
    } else {
      navigate("/student");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-4 font-sans text-left" dir="ltr">
      
      <div className="w-full max-w-md bg-[#111827] p-8 rounded-2xl shadow-2xl border border-slate-800 my-8">
        
        {/* الشعار */}
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-[#00D084] p-1.5 rounded-lg">
            <MapPin className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
        </div>

        {/* العناوين */}
        <div className="mb-6">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">Create account</h1>
          <p className="text-slate-400 text-sm">Register as a Doctor or Student</p>
        </div>

        {/* أزرار اختيار نوع الحساب (Doctor / Student) */}
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            onClick={() => setRole("doctor")}
            className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
              role === "doctor" 
                ? "border-[#00D084] text-[#00D084] bg-[#00D084]/10" 
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            <span className="text-2xl">👨‍🏫</span>
            <span className="text-sm font-semibold">Doctor</span>
          </button>

          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex-1 py-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
              role === "student" 
                ? "border-[#00D084] text-[#00D084] bg-[#00D084]/10" 
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            <span className="text-2xl">🎓</span>
            <span className="text-sm font-semibold">Student</span>
          </button>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          
          {/* الاسم الأول والأخير (في سطر واحد) */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
              <input type="text" placeholder="Ahmed" className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all" required />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
              <input type="text" placeholder="Hassan" className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all" required />
            </div>
          </div>

          {/* الإيميل */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input type="email" placeholder="you@university.edu" className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all" required />
          </div>

          {/* القسم */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Department</label>
            <input type="text" placeholder="e.g. Computer Science, Medicine..." className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all" required />
          </div>

          {/* الـ ID يتغير اسمه بناءً على الاختيار */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {role === "doctor" ? "Staff ID" : "Student ID"}
            </label>
            <input type="text" placeholder={role === "doctor" ? "e.g. EMP-2024" : "e.g. 20240001"} className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all" required />
          </div>

          {/* كلمة المرور */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Min 6 characters" 
                className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all pr-10"
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

          {/* زر التسجيل */}
          <button 
            type="submit" 
            className="w-full mt-4 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold text-lg h-12 rounded-lg transition-all shadow-[0_0_15px_rgba(0,208,132,0.3)] hover:shadow-[0_0_20px_rgba(0,208,132,0.5)]"
          >
            Create Account
          </button>
        </form>

        {/* رابط العودة لتسجيل الدخول */}
        <div className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/" className="text-[#00D084] hover:text-[#00B070] font-medium transition-colors">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}