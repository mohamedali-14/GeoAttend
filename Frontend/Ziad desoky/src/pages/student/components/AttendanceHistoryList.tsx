/**
 * AttendanceHistoryList — reads from Firestore directly
 */
import { useState, useEffect, useMemo } from "react";
import { History } from "lucide-react";
import { db } from "../../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

function fmtDate(val: any) {
  if (!val) return "—";
  const d = val?.toDate ? val.toDate() : new Date(val);
  return d.toLocaleDateString("en-EG", { month: "short", day: "numeric", year: "numeric" });
}

export function AttendanceHistoryList({ userId, courses, allSessions, attendanceHistory }: {
  userId: string; courses: any[]; allSessions: any[]; attendanceHistory: any[];
}) {
  const [filter, setFilter] = useState<"all"|"present"|"absent">("all");
  // Also fetch sessions from Firestore directly for the student's courses
  const [firestoreSessions, setFirestoreSessions] = useState<any[]>([]);
  const [firestoreAttendance, setFirestoreAttendance] = useState<any[]>([]);

  const courseIds = courses.map((c: any) => c.id);

  // Load sessions for this student's courses from Firestore
  useEffect(() => {
    if (!courseIds.length) return;
    // Chunk courseIds into groups of 30 (Firestore "in" limit)
    const chunks: string[][] = [];
    for (let i = 0; i < courseIds.length; i += 30) chunks.push(courseIds.slice(i, i + 30));

    const unsubs = chunks.map(chunk => {
      const q = query(collection(db, "sessions"), where("courseId", "in", chunk));
      return onSnapshot(q, snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFirestoreSessions(prev => {
          const existing = prev.filter((s: any) => !chunk.includes(s.courseId));
          return [...existing, ...docs];
        });
      }, () => {});
    });
    return () => unsubs.forEach(u => u());
  }, [courseIds.join(",")]);

  // Load this student's attendance from Firestore
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "attendance"), where("studentId", "==", userId));
    const unsub = onSnapshot(q, snap => {
      setFirestoreAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, [userId]);

  const records = useMemo(() => {
    // Merge Firestore sessions with prop-passed allSessions (deduplicate)
    const allMap = new Map<string, any>();
    [...allSessions, ...firestoreSessions].forEach(s => allMap.set(s.id, s));
    const sessions = Array.from(allMap.values());

    // Merge attendance sources
    const attMap = new Map<string, any>();
    [...attendanceHistory, ...firestoreAttendance].forEach(a => attMap.set(a.id || a.sessionId + a.studentId, a));
    const attendance = Array.from(attMap.values());

    const myAttBySession = new Map<string, any>();
    attendance.forEach((a: any) => { if (a.sessionId) myAttBySession.set(a.sessionId, a); });

    return sessions
      .filter((s: any) => {
        const inMyCourses = courseIds.includes(s.courseId);
        const isEnded = s.status === "ENDED" || s.status === "ended" || s.isActive === false;
        return inMyCourses && isEnded;
      })
      .sort((a: any, b: any) => {
        const tA = a.startTime?.toDate?.()?.getTime() || new Date(a.startTime || 0).getTime();
        const tB = b.startTime?.toDate?.()?.getTime() || new Date(b.startTime || 0).getTime();
        return tB - tA;
      })
      .map((sess: any) => {
        const myAtt = myAttBySession.get(sess.id);
        const isPresent = !!myAtt;
        const isKicked  = myAtt?.status === "kicked";
        const course = courses.find((c: any) => c.id === sess.courseId);
        return {
          id: sess.id,
          courseCode: course?.code || sess.courseCode || "",
          courseName: course?.name || sess.courseName || "Unknown",
          startTime: sess.startTime,
          status: isKicked ? "kicked" : isPresent ? "present" : "absent",
        };
      });
  }, [userId, courseIds.join(","), firestoreSessions.length, firestoreAttendance.length, allSessions.length, attendanceHistory.length]);

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
                  <p className="text-slate-500 text-xs">{s.courseCode} · {fmtDate(s.startTime)}</p>
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
