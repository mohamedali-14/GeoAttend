// ─── Shared types & utilities for Student components ─────────────────────────

export const DAYS = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"] as const;
export type Day = typeof DAYS[number];

export const DAY_COLOR: Record<Day, string> = {
  Saturday:  "text-purple-400 bg-purple-500/10 border-purple-500/20",
  Sunday:    "text-blue-400   bg-blue-500/10   border-blue-500/20",
  Monday:    "text-[#00D084]  bg-[#00D084]/10  border-[#00D084]/20",
  Tuesday:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  Wednesday: "text-pink-400   bg-pink-500/10   border-pink-500/20",
  Thursday:  "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

export type Tab = "home" | "courses" | "schedule" | "attendance" | "history" | "stats" | "achievements" | "quiz-history";

export function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) + " min";
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function getLocalSessions(users: any[]): any[] {
  const all: any[] = [];
  const seen = new Set<string>();
  users.filter((u: any) => u.role === "DOCTOR").forEach((doctor: any) => {
    try {
      const raw = localStorage.getItem("geo_sessions_" + doctor.id);
      if (raw) {
        JSON.parse(raw).forEach((s: any) => {
          if (!seen.has(s.id)) { seen.add(s.id); all.push(s); }
        });
      }
    } catch { }
  });
  try {
    const ar = localStorage.getItem("geo_admin_sessions");
    if (ar) {
      JSON.parse(ar).forEach((s: any) => {
        if (!seen.has(s.id)) { seen.add(s.id); all.push(s); }
      });
    }
  } catch { }
  return all;
}

export function didStudentAttend(session: any, userId: string): boolean {
  if (!session.attendees || session.attendees.length === 0) return false;
  return session.attendees.some((a: any) => a.studentId === userId && a.status !== "kicked");
}
