/**
 * CourseSessionList — reads from Firestore instead of localStorage
 */
import { useState, useEffect, useMemo } from "react";
import { CheckCircle, XCircle, LogOut } from "lucide-react";
import { db } from "../../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

function fmtDate(val: any) {
  if (!val) return "—";
  const d = val?.toDate ? val.toDate() : new Date(val);
  return d.toLocaleDateString("en-EG", { month: "short", day: "numeric" });
}
function fmtTime(val: any) {
  if (!val) return "—";
  const d = val?.toDate ? val.toDate() : new Date(val);
  return d.toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
}

export function CourseSessionList({ courseId, userId, users, attendanceEvents }: {
  courseId: string; userId: string; users: any[]; attendanceEvents: any[];
}) {
  const [sessions,    setSessions]    = useState<any[]>([]);
  const [attendance,  setAttendance]  = useState<any[]>([]);

  // Load ended sessions for this course
  useEffect(() => {
    if (!courseId) return;
    const q = query(collection(db, "sessions"), where("courseId", "==", courseId));
    const unsub = onSnapshot(q, snap => {
      const ended = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((s: any) => s.status === "ENDED" || s.status === "ended" || s.isActive === false)
        .sort((a: any, b: any) => {
          const tA = a.startTime?.toDate?.()?.getTime() || new Date(a.startTime || 0).getTime();
          const tB = b.startTime?.toDate?.()?.getTime() || new Date(b.startTime || 0).getTime();
          return tB - tA;
        });
      setSessions(ended);
    }, () => {});
    return () => unsub();
  }, [courseId]);

  // Load this student's attendance for this course
  useEffect(() => {
    if (!userId || !courseId) return;
    const q = query(
      collection(db, "attendance"),
      where("studentId", "==", userId),
      where("courseId", "==", courseId)
    );
    const unsub = onSnapshot(q, snap => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [userId, courseId]);

  const attBySession = useMemo(() => {
    const map = new Map<string, any>();
    attendance.forEach((a: any) => { if (a.sessionId) map.set(a.sessionId, a); });
    // Also include socket events
    attendanceEvents
      .filter((e: any) => e.studentId === userId && e.courseId === courseId)
      .forEach((e: any) => { if (!map.has(e.sessionId)) map.set(e.sessionId, e); });
    return map;
  }, [attendance.length, attendanceEvents.length, userId, courseId]);

  if (sessions.length === 0) return (
    <p className="text-slate-500 text-sm text-center py-6">No sessions recorded yet.</p>
  );

  return (
    <div className="divide-y divide-slate-800/60">
      {sessions.map((sess: any, idx: number) => {
        const att = attBySession.get(sess.id);
        const myStatus: string = att?.status || (att ? "present" : "absent");
        return (
          <div key={sess.id} className="flex items-center gap-3 px-5 py-3">
            {myStatus === "present"
              ? <CheckCircle className="w-5 h-5 text-[#00D084] flex-shrink-0"/>
              : myStatus === "left"
              ? <LogOut className="w-5 h-5 text-yellow-400 flex-shrink-0"/>
              : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0"/>}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">Session #{String(sessions.length - idx).padStart(2, "0")}</p>
              <p className="text-slate-500 text-xs">{fmtDate(sess.startTime)} • {fmtTime(sess.startTime)}</p>
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
