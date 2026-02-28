import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    // هنا المفروض نرسل الإيميل للسيرفر، لكن حالياً سنظهر رسالة نجاح وهمية
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120] p-4 font-sans text-left" dir="ltr">
      <div className="w-full max-w-md bg-[#111827] p-8 rounded-2xl shadow-2xl border border-slate-800">
        
        {/* الشعار */}
        <div className="flex items-center gap-2 mb-8">
          <div className="bg-[#00D084] p-1.5 rounded-lg">
            <MapPin className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">GeoAttend</span>
        </div>

        {/* العناوين */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">Reset Password</h1>
          <p className="text-slate-400 text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* إذا تم الإرسال بنجاح نظهر رسالة، وإلا نظهر الفورم */}
        {isSubmitted ? (
          <div className="text-center bg-[#00D084]/10 border border-[#00D084]/30 p-4 rounded-lg mb-6">
            <p className="text-[#00D084] font-medium mb-2">Check your email!</p>
            <p className="text-slate-400 text-sm">We've sent a password reset link to <br/> <span className="text-white font-semibold">{email}</span></p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu" 
                className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-[#00D084] focus:ring-1 focus:ring-[#00D084] transition-all"
                required 
              />
            </div>

            <button 
              type="submit" 
              className="w-full mt-2 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold text-lg h-12 rounded-lg transition-all shadow-[0_0_15px_rgba(0,208,132,0.3)] hover:shadow-[0_0_20px_rgba(0,208,132,0.5)]"
            >
              Send Reset Link
            </button>
          </form>
        )}

        {/* زر العودة للوراء */}
        <div className="mt-8">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}