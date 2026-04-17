import {
  BookOpen, CheckCircle, Star, Zap, Target, Trophy, Shield,
  FileQuestion, Award, TrendingUp, UserPlus
} from "lucide-react";

interface Stats {
  totalLectures: number; attended: number; overallPct: number | null;
  avgQuizScore: number | null; streak: number; perfectCourses: number;
  totalCourses: number; totalQuizzes: number;
}

export function BadgesPanel({ stats, myCourses }: { stats: Stats; myCourses: any[] }) {
  const badges = [
    { id:"enroll1",  icon:<BookOpen className="w-6 h-6"/>,     label:"First Steps",    desc:"Enrolled in 1 course",        unlocked: stats.totalCourses >= 1,             color:"text-blue-400",    bg:"bg-blue-500/10 border-blue-500/20" },
    { id:"attend1",  icon:<CheckCircle className="w-6 h-6"/>,  label:"Show Up",        desc:"Attended 1 lecture",          unlocked: stats.attended >= 1,                 color:"text-[#00D084]",   bg:"bg-[#00D084]/10 border-[#00D084]/20" },
    { id:"attend10", icon:<Star className="w-6 h-6"/>,          label:"Consistent",     desc:"Attended 10 lectures",        unlocked: stats.attended >= 10,                color:"text-yellow-400",  bg:"bg-yellow-500/10 border-yellow-500/20" },
    { id:"attend25", icon:<Zap className="w-6 h-6"/>,           label:"Dedicated",      desc:"Attended 25 lectures",        unlocked: stats.attended >= 25,                color:"text-purple-400",  bg:"bg-purple-500/10 border-purple-500/20" },
    { id:"pct75",    icon:<Target className="w-6 h-6"/>,        label:"On Track",       desc:"Overall >= 75% attendance",   unlocked: (stats.overallPct ?? 0) >= 75,       color:"text-[#00D084]",   bg:"bg-[#00D084]/10 border-[#00D084]/20" },
    { id:"pct90",    icon:<Trophy className="w-6 h-6"/>,        label:"Excellent",      desc:"Overall >= 90% attendance",   unlocked: (stats.overallPct ?? 0) >= 90,       color:"text-yellow-400",  bg:"bg-yellow-500/10 border-yellow-500/20" },
    { id:"perfect",  icon:<Shield className="w-6 h-6"/>,        label:"Perfect Course", desc:"100% in at least 1 course",   unlocked: stats.perfectCourses >= 1,           color:"text-pink-400",    bg:"bg-pink-500/10 border-pink-500/20" },
    { id:"quiz1",    icon:<FileQuestion className="w-6 h-6"/>,  label:"Quiz Taker",     desc:"Submitted 1 quiz",            unlocked: stats.totalQuizzes >= 1,             color:"text-indigo-400",  bg:"bg-indigo-500/10 border-indigo-500/20" },
    { id:"quiz80",   icon:<Award className="w-6 h-6"/>,         label:"High Scorer",    desc:"Avg quiz score >= 80%",       unlocked: (stats.avgQuizScore ?? 0) >= 80,     color:"text-orange-400",  bg:"bg-orange-500/10 border-orange-500/20" },
    { id:"streak3",  icon:<TrendingUp className="w-6 h-6"/>,    label:"On a Roll",      desc:"3+ consecutive sessions",     unlocked: stats.streak >= 3,                   color:"text-cyan-400",    bg:"bg-cyan-500/10 border-cyan-500/20" },
    { id:"enroll3",  icon:<UserPlus className="w-6 h-6"/>,      label:"Multitasker",    desc:"Enrolled in 3+ courses",      unlocked: stats.totalCourses >= 3,             color:"text-rose-400",    bg:"bg-rose-500/10 border-rose-500/20" },
    { id:"streak7",  icon:<Zap className="w-6 h-6"/>,           label:"On Fire",        desc:"7+ consecutive sessions",     unlocked: stats.streak >= 7,                   color:"text-red-400",     bg:"bg-red-500/10 border-red-500/20" },
  ];
  const unlocked = badges.filter(b => b.unlocked).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-slate-400 text-sm">{unlocked} of {badges.length} badges earned</p>
          <div className="h-2 w-48 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-[#00D084] rounded-full" style={{width:`${Math.round((unlocked/badges.length)*100)}%`}}/>
          </div>
        </div>
        <span className="text-3xl font-bold text-[#00D084]">{Math.round((unlocked/badges.length)*100)}%</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {badges.map(b => (
          <div key={b.id} className={`border rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all ${b.unlocked ? b.bg : "bg-slate-900/50 border-slate-800 opacity-50 grayscale"}`}>
            <div className={`${b.unlocked ? b.color : "text-slate-600"}`}>{b.icon}</div>
            <p className={`text-xs font-bold ${b.unlocked ? "text-white" : "text-slate-500"}`}>{b.label}</p>
            <p className="text-[10px] text-slate-500 leading-tight">{b.desc}</p>
            {b.unlocked && <span className="text-[10px] text-[#00D084] font-semibold">Earned ✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
