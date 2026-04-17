import { useMemo } from "react";
import { BarChart2 } from "lucide-react";
import { getLocalSessions, didStudentAttend } from "./studentUtils";

export function AttendanceTrendChart({ myCourses, userId, users }: {
  myCourses: any[]; userId: string; users: any[];
}) {
  const data = useMemo(() => {
    const localSessions = getLocalSessions(users);
    return myCourses.slice(0, 8).map(c => {
      const sessions = localSessions.filter(s => s.courseId === c.id && !s.isActive);
      const total = sessions.length;
      const present = sessions.filter(s => didStudentAttend(s, userId)).length;
      return { name: c.code, pct: total > 0 ? Math.round((present/total)*100) : 0, total, present };
    });
  }, [myCourses, userId, users]);

  if (data.length === 0 || data.every(d => d.total === 0)) return (
    <div className="text-center py-10 text-slate-500">
      <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30"/>
      <p className="text-sm">No attendance data yet</p>
    </div>
  );

  const maxH = 120;
  return (
    <div className="w-full">
      <div className="flex items-end gap-3 h-32 px-2 pb-2 border-b border-slate-800">
        {data.map((d, i) => {
          const h = Math.max(8, Math.round((d.pct / 100) * maxH));
          const color = d.pct >= 75 ? "bg-[#00D084]" : d.pct >= 50 ? "bg-yellow-400" : "bg-red-400";
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap z-10">
                {d.name}: {d.pct}% ({d.present}/{d.total})
              </div>
              <div className={`w-full rounded-t-md ${color}`} style={{ height: `${h}px` }}/>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 px-2 pt-1">
        {data.map((d, i) => <div key={i} className="flex-1 text-center text-[10px] text-slate-500 truncate">{d.name}</div>)}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#00D084] inline-block"/>≥75%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block"/>50-74%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block"/>&lt;50%</span>
      </div>
    </div>
  );
}
