import { useMemo } from "react";
import { CheckCircle, XCircle, LogOut } from "lucide-react";

export function CourseSessionList({ courseId, userId, users, attendanceEvents }: {
  courseId: string; userId: string; users: any[]; attendanceEvents: any[];
}) {
  const csess = useMemo(() => {
    const all: any[] = [];
    const seen = new Set<string>();
    users.filter((u: any) => u.role === "DOCTOR").forEach((doctor: any) => {
      try {
        const raw = localStorage.getItem("geo_sessions_" + doctor.id);
        if (raw) {
          JSON.parse(raw).filter((x: any) => x.courseId === courseId && !x.isActive).forEach((s: any) => {
            if (!seen.has(s.id)) { seen.add(s.id); all.push(s); }
          });
        }
      } catch { }
    });
    try {
      const ar = localStorage.getItem("geo_admin_sessions");
      if (ar) {
        JSON.parse(ar).filter((x: any) => x.courseId === courseId && !x.isActive).forEach((s: any) => {
          if (!seen.has(s.id)) { seen.add(s.id); all.push(s); }
        });
      }
    } catch { }
    return all.sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [courseId, users]);

  if (csess.length === 0) return <p className="text-slate-500 text-sm text-center py-6">No sessions recorded yet.</p>;

  return (
    <div className="divide-y divide-slate-800/60">
      {csess.map((sess: any, idx: number) => {
        const myAttendee = sess.attendees?.find((a: any) => a.studentId === userId);
        const myEvent = !myAttendee ? attendanceEvents.find((e: any) => e.sessionId === sess.id && e.studentId === userId) : null;
        const myStatus: string = myAttendee?.status || myEvent?.status || (myAttendee || myEvent ? "present" : "absent");
        const sessDate = sess.startTime ? new Date(sess.startTime).toLocaleDateString("en-EG", { month: "short", day: "numeric" }) : "—";
        const sessTime = sess.startTime ? new Date(sess.startTime).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" }) : "—";
        return (
          <div key={sess.id} className="flex items-center gap-3 px-5 py-3">
            {myStatus === "present"
              ? <CheckCircle className="w-5 h-5 text-[#00D084] flex-shrink-0"/>
              : myStatus === "left"
              ? <LogOut className="w-5 h-5 text-yellow-400 flex-shrink-0"/>
              : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0"/>}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">Session #{String(csess.length - idx).padStart(2, "0")}</p>
              <p className="text-slate-500 text-xs">{sessDate} • {sessTime}</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
              myStatus === "present" ? "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20" :
              myStatus === "left"    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
              myStatus === "kicked"  ? "bg-red-500/10 text-red-300 border-red-500/20" :
                                      "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>
              {myStatus === "present" ? "Present" : myStatus === "left" ? "Left Early" : myStatus === "kicked" ? "Kicked" : "Absent"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
