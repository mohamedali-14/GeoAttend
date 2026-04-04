import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

export interface AttendanceEvent {
  sessionId: string;
  studentId: string;
  studentName: string;
  courseId: string;
  timestamp: string;
  geoStatus?: "inside" | "outside" | "no_geo";
  status?: "present" | "left" | "kicked"; // NEW
  leftAt?: string; // NEW
}

export interface SessionEvent {
  sessionId: string;
  courseId: string;
  courseName: string;
  action: "started" | "ended";
  timestamp: string;
  doctorId?: string;
}

interface SocketContextType {
  isConnected: boolean;
  attendanceEvents: AttendanceEvent[];
  sessionEvents: SessionEvent[];
  emitAttendance: (event: AttendanceEvent) => void;
  emitSession: (event: SessionEvent) => void;
  clearEvents: (mode?: "all" | "keep_present") => void;
  kickStudent: (sessionId: string, studentId: string) => void;
  studentLeave: (sessionId: string, studentId: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected]           = useState(false);
  const [attendanceEvents, setAttendanceEvents] = useState<AttendanceEvent[]>([]);
  const [sessionEvents,    setSessionEvents]    = useState<SessionEvent[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) { setIsConnected(false); return; }
    const t = setTimeout(() => setIsConnected(true), 600);
    return () => { clearTimeout(t); setIsConnected(false); };
  }, [isAuthenticated, user]);

  const emitAttendance = (event: AttendanceEvent) => {
    const ev = { ...event, status: event.status || "present" };
    setAttendanceEvents(prev => [ev, ...prev].slice(0, 100));
    localStorage.setItem("geo_rt_attendance", JSON.stringify({ ...ev, _ts: Date.now() }));

    // Also update the doctor's session attendees list in real-time
    try {
      const activeRaw = localStorage.getItem("geo_active_session");
      if (!activeRaw) return;
      const active = JSON.parse(activeRaw);
      // Find which doctor owns this session's course
      const adminSessions = JSON.parse(localStorage.getItem("geo_admin_sessions") || "[]");
      const adminSess = adminSessions.find((s: any) => s.id === event.sessionId);
      const doctorId = adminSess?.doctorId;
      if (!doctorId) return;
      const key = "geo_sessions_" + doctorId;
      const sessions = JSON.parse(localStorage.getItem(key) || "[]");
      const updated = sessions.map((s: any) => {
        if (s.id !== event.sessionId) return s;
        const attendees = s.attendees || [];
        const exists = attendees.some((a: any) => a.studentId === event.studentId);
        if (exists) {
          return { ...s, attendees: attendees.map((a: any) =>
            a.studentId === event.studentId ? { ...a, status: ev.status, leftAt: ev.leftAt } : a
          )};
        }
        return { ...s, attendees: [...attendees, { studentId: ev.studentId, studentName: ev.studentName, timestamp: ev.timestamp, geoStatus: ev.geoStatus, status: ev.status }] };
      });
      localStorage.setItem(key, JSON.stringify(updated));
    } catch { }
  };

  const emitSession = (event: SessionEvent) => {
    setSessionEvents(prev => [event, ...prev].slice(0, 50));
    localStorage.setItem("geo_rt_session", JSON.stringify({ ...event, _ts: Date.now() }));
  };

  const kickStudent = (sessionId: string, studentId: string) => {
    const kickEvent = { type: "kick", sessionId, studentId, _ts: Date.now() };
    localStorage.setItem("geo_rt_kick", JSON.stringify(kickEvent));
    setAttendanceEvents(prev => prev.map(e =>
      e.sessionId === sessionId && e.studentId === studentId
        ? { ...e, status: "kicked", leftAt: new Date().toISOString() }
        : e
    ));
  };

  const studentLeave = (sessionId: string, studentId: string) => {
    setAttendanceEvents(prev => prev.map(e =>
      e.sessionId === sessionId && e.studentId === studentId
        ? { ...e, status: "left", leftAt: new Date().toISOString() }
        : e
    ));
    localStorage.setItem("geo_rt_leave", JSON.stringify({ sessionId, studentId, _ts: Date.now() }));
  };

  const clearEvents = (mode: "all" | "keep_present" = "all") => {
    if (mode === "keep_present") {
      setAttendanceEvents(prev => prev.filter(e => e.status === "present"));
    } else {
      setAttendanceEvents([]);
      setSessionEvents([]);
    }
  };

  useEffect(() => {
    // Track last seen timestamps to avoid re-processing old events
    const lastSeen: Record<string, number> = {};

    const processLocalStorage = () => {
      // Attendance events
      try {
        const raw = localStorage.getItem("geo_rt_attendance");
        if (raw) {
          const ev = JSON.parse(raw) as AttendanceEvent & { _ts?: number };
          const ts = ev._ts || 0;
          if (!lastSeen["att"] || ts > lastSeen["att"]) {
            lastSeen["att"] = ts;
            setAttendanceEvents(prev => {
              const exists = prev.some(p => p.studentId === ev.studentId && p.sessionId === ev.sessionId);
              if (exists) {
                return prev.map(p =>
                  p.studentId === ev.studentId && p.sessionId === ev.sessionId
                    ? { ...p, status: ev.status || p.status, leftAt: ev.leftAt || p.leftAt }
                    : p
                );
              }
              return [{ ...ev, status: ev.status || "present" }, ...prev].slice(0, 100);
            });
          }
        }
      } catch { }

      // Session events
      try {
        const raw = localStorage.getItem("geo_rt_session");
        if (raw) {
          const ev = JSON.parse(raw) as SessionEvent & { _ts?: number };
          const ts = ev._ts || 0;
          if (!lastSeen["sess"] || ts > lastSeen["sess"]) {
            lastSeen["sess"] = ts;
            setSessionEvents(prev => {
              if (prev.some(p => p.sessionId === ev.sessionId && p.action === ev.action)) return prev;
              return [ev, ...prev].slice(0, 50);
            });
          }
        }
      } catch { }

      // Kick events
      try {
        const raw = localStorage.getItem("geo_rt_kick");
        if (raw) {
          const { sessionId, studentId, _ts } = JSON.parse(raw);
          if (!lastSeen["kick"] || _ts > lastSeen["kick"]) {
            lastSeen["kick"] = _ts;
            setAttendanceEvents(prev => prev.map(e =>
              e.sessionId === sessionId && e.studentId === studentId
                ? { ...e, status: "kicked" as const, leftAt: new Date().toISOString() }
                : e
            ));
          }
        }
      } catch { }

      // Leave events
      try {
        const raw = localStorage.getItem("geo_rt_leave");
        if (raw) {
          const { sessionId, studentId, _ts } = JSON.parse(raw);
          if (!lastSeen["leave"] || _ts > lastSeen["leave"]) {
            lastSeen["leave"] = _ts;
            setAttendanceEvents(prev => prev.map(e =>
              e.sessionId === sessionId && e.studentId === studentId
                ? { ...e, status: "left" as const, leftAt: new Date().toISOString() }
                : e
            ));
          }
        }
      } catch { }
    };

    // Poll every 2s for same-tab real-time updates
    const iv = setInterval(processLocalStorage, 2000);
    // Also fire on cross-tab storage events
    const handler = (e: StorageEvent) => {
      if (["geo_rt_attendance","geo_rt_session","geo_rt_kick","geo_rt_leave"].includes(e.key || "")) {
        processLocalStorage();
      }
    };
    window.addEventListener("storage", handler);
    return () => { clearInterval(iv); window.removeEventListener("storage", handler); };
  }, []);

  return (
    <SocketContext.Provider value={{ isConnected, attendanceEvents, sessionEvents, emitAttendance, emitSession, clearEvents, kickStudent, studentLeave }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
