import { useState, useMemo } from "react";
import { History } from "lucide-react";
import { getLocalSessions } from "./studentUtils";

export function AttendanceHistoryList({ userId, courses, allSessions, attendanceHistory }: {
  userId: string; courses: any[]; allSessions: any[]; attendanceHistory: any[];
}) {
  const [filter, setFilter] = useState<"all"|"present"|"absent">("all");

  const records = useMemo(() => {
    const courseIds = new Set(courses.map((c: any) => c.id));
    // Filter to ended sessions for the student's courses
    return allSessions
      .filter(s => courseIds.has(s.courseId) && s.status === "ENDED")
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((sess: any) => {
        const myAtt = attendanceHistory.find((a: any) => a.sessionId === sess.id);
        const isPresent = !!myAtt;
        const isKicked  = myAtt?.status === "kicked";
        const course = courses.find((c: any) => c.id === sess.courseId);
        return {
          id: sess.id,
          courseCode: course?.code || "",
          courseName: course?.name || "Unknown",
          startTime: sess.createdAt,
          status: isKicked ? "kicked" : isPresent ? "present" : "absent",
        };
      });
  }, [userId, courses, allSessions, attendanceHistory]);

  const presentCount = records.filter(s => s.status === "present").length;
  const absentCount  = records.filter(s => s.status === "absent" || s.status === "kicked").length;
  const filtered = filter === "all" ? records
    : filter === "present" ? records.filter(s => s.status === "present")
    : records.filter(s => s.status === "absent" || s.status === "kicked");

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[
          { key: "all",     label: `All (${records.length})` },
          { key: "present", label: `Present (${presentCount})` },
          { key: "absent",  label: `Absent (${absentCount})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filter===f.key ? "bg-[#00D084]/10 border-[#00D084]/30 text-[#00D084]" : "border-slate-700 text-slate-400 hover:text-white"
            }`}>{f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0
        ? <div className="text-center py-12 text-slate-500"><History className="w-10 h-10 mx-auto mb-2 opacity-30"/><p className="text-sm">No records found</p></div>
        : <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
            {filtered.map((s, i) => (
              <div key={s.id + i} className="flex items-center gap-3 bg-[#111827] border border-slate-800 rounded-xl px-4 py-3 hover:border-slate-700 transition-all">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "present" ? "bg-[#00D084]" : "bg-red-400"}`}/>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{s.courseName}</p>
                  <p className="text-slate-500 text-xs">{s.courseCode} · {s.startTime ? new Date(s.startTime).toLocaleDateString("en-EG",{month:"short",day:"numeric",year:"numeric"}) : "—"}</p>
                </div>
                <div className={`text-xs font-semibold px-2 py-1 rounded-lg border ${
                  s.status === "present" ? "bg-[#00D084]/10 border-[#00D084]/20 text-[#00D084]"
                  : s.status === "kicked" ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}>
                  {s.status === "present" ? "Present" : s.status === "kicked" ? "Kicked" : "Absent"}
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}
