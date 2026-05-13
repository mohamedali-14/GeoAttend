import { FileQuestion } from "lucide-react";

export function QuizPerformanceChart({ submissions, sessions }: { submissions: any[]; sessions: any[] }) {
  if (submissions.length === 0) return (
    <div className="text-center py-10 text-slate-500">
      <FileQuestion className="w-10 h-10 mx-auto mb-2 opacity-30"/>
      <p className="text-sm">No quiz submissions yet</p>
    </div>
  );
  const last8 = [...submissions]
    .sort((a,b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
    .slice(-8);
  return (
    <div>
      <div className="flex items-end gap-3 h-28 px-2 pb-2 border-b border-slate-800">
        {last8.map((s, i) => {
          const h = Math.max(8, Math.round((s.score / 100) * 112));
          const color = s.score >= 80 ? "bg-[#00D084]" : s.score >= 60 ? "bg-yellow-400" : "bg-red-400";
          const quiz = sessions.find((q: any) => q.id === s.quizSessionId);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap z-10">
                {quiz?.title || "Quiz"}: {s.score}%
              </div>
              <div className={`w-full rounded-t-md ${color}`} style={{ height: `${h}px` }}/>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 px-2 pt-1">
        {last8.map((_, i) => <div key={i} className="flex-1 text-center text-[10px] text-slate-500">Q{i+1}</div>)}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Best",  value: `${Math.max(...submissions.map((s:any)=>s.score))}%`, color: "text-[#00D084]" },
          { label: "Avg",   value: `${Math.round(submissions.reduce((a:number,s:any)=>a+s.score,0)/submissions.length)}%`, color: "text-yellow-400" },
          { label: "Total", value: submissions.length, color: "text-blue-400" },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/50 rounded-xl py-3">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
