import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../firebase";
import { collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";

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
  quizActive?: boolean;
  quizQuestions?: any[];
  geoEnabled?: boolean;
  centerLat?: number | null;
  centerLng?: number | null;
  radiusMeters?: number;
  randomCheckEnabled?: boolean;
  selfieEnabled?: boolean;
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
    setIsConnected(true);

    // 1. Listen for LIVE attendance events
    const attQ = query(collection(db, "attendance"), orderBy("timestamp", "desc"), limit(100));
    const unsubAtt = onSnapshot(attQ, (snap) => {
        const events = snap.docs.map(d => ({
            sessionId: d.data().sessionId,
            studentId: d.data().studentId,
            studentName: d.data().studentName || "Student",
            courseId: d.data().courseId,
            timestamp: d.data().timestamp || new Date().toISOString(),
            geoStatus: d.data().geoStatus,
            status: d.data().status || "present",
            leftAt: d.data().leftAt,
        } as AttendanceEvent));
        setAttendanceEvents(events);
    });

    // 2. Listen for LIVE session lifecycle events (Including Quiz status)
    const sessQ = query(collection(db, "sessions"), orderBy("updatedAt", "desc"), limit(50));
    const unsubSess = onSnapshot(sessQ, (snap) => {
        const events: SessionEvent[] = [];
        snap.docs.forEach(d => {
            const data = d.data();
            if (data.status === "ACTIVE" || data.isActive) {
                events.push({
                    sessionId: d.id,
                    courseId: data.courseId,
                    courseName: data.courseName || "Lecture",
                    action: "started",
                    timestamp: data.startTime || data.createdAt || new Date().toISOString(),
                    doctorId: data.professorId || data.doctorId,
                    // QUIZ FIELDS FROM OMAR'S LOGIC
                    quizActive: data.quizActive || false,
                    quizQuestions: data.quizQuestions || [],
                });
            } else if (data.status === "ENDED") {
                events.push({
                    sessionId: d.id,
                    courseId: data.courseId,
                    courseName: data.courseName || "Lecture",
                    action: "ended",
                    timestamp: data.endTime || data.updatedAt || new Date().toISOString(),
                    doctorId: data.professorId || data.doctorId,
                });
            }
        });
        setSessionEvents(events);
    });

    return () => {
        unsubAtt();
        unsubSess();
    };
  }, [isAuthenticated, user]);

  const emitAttendance = async (event: AttendanceEvent) => {
    try {
      const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
      const ref = doc(db, "attendance", `${event.sessionId}_${event.studentId}`);
      await setDoc(ref, {
        ...event,
        status: event.status || "present",
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to emit attendance to Firestore:", err);
    }
  };

  const emitSession = async (event: SessionEvent) => {
    try {
      const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
      const ref = doc(db, "sessions", event.sessionId);
      await setDoc(ref, {
        courseId: event.courseId,
        courseName: event.courseName,
        professorId: event.doctorId || user?.id,
        status: event.action === "started" ? "ACTIVE" : "ENDED",
        isActive: event.action === "started",
        startTime: event.action === "started" ? event.timestamp : undefined,
        endTime: event.action === "ended" ? event.timestamp : undefined,
        // Anti-cheating fields
        geoEnabled: event.geoEnabled ?? false,
        centerLat: event.centerLat ?? null,
        centerLng: event.centerLng ?? null,
        radiusMeters: event.radiusMeters ?? 50,
        randomCheckEnabled: event.randomCheckEnabled ?? false,
        selfieEnabled: event.selfieEnabled ?? false,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Failed to emit session to Firestore:", err);
    }
  };

  const kickStudent = async (sessionId: string, studentId: string) => {
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const ref = doc(db, "attendance", `${sessionId}_${studentId}`);
      await updateDoc(ref, { status: "kicked", leftAt: new Date().toISOString() });
    } catch (err) {
      console.error("Failed to kick student in Firestore:", err);
    }
  };

  const studentLeave = async (sessionId: string, studentId: string) => {
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const ref = doc(db, "attendance", `${sessionId}_${studentId}`);
      await updateDoc(ref, { status: "left", leftAt: new Date().toISOString() });
    } catch (err) {
      console.error("Failed to record leave in Firestore:", err);
    }
  };

  const clearEvents = (mode: "all" | "keep_present" = "all") => {
    // Local clear for UI responsiveness
    if (mode === "keep_present") {
      setAttendanceEvents(prev => prev.filter(e => e.status === "present"));
    } else {
      setAttendanceEvents([]);
      setSessionEvents([]);
    }
  };

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
