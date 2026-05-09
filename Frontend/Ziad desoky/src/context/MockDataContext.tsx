import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import type { User } from "./AuthContext";
import { apiGetCourses, apiGetSchedules, apiGetAllUsers,
  apiEnrollStudent, apiGetStudentEnrollments,
  apiCreateCourse, apiUpdateCourse, apiDeleteCourse,
  apiCreateSchedule, apiCreateUser, apiEditUser, apiDeleteUser,
  apiGetAllEnrollments,
} from "../services/api";
import { db } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export interface Lecture {
  id: string; title: string; doctorId: string; doctorName: string;
  department: string; scheduledAt: string; duration: number;
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  studentsPresent: number; location?: string; courseId?: string;
}
export interface Course {
  id: string; name: string; code: string; doctorId: string;
  department: string; creditHours: number; location: string;
}
export interface Schedule {
  id: string; courseId: string;
  day: "Saturday" | "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday";
  startTime: string; endTime: string; location: string;
}
export interface Enrollment { id: string; courseId: string; studentId: string; }
export interface AttendanceRecord {
  id: string; lectureId: string; studentId: string; courseId: string; timestamp: string;
}

// ── local helpers ─────────────────────────────────────────────────────────────
function load<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch (_e) { void _e; }
  return fallback;
}
function save<T>(key: string, data: T) { localStorage.setItem(key, JSON.stringify(data)); }

// ── Mock fallback data ────────────────────────────────────────────────────────
export const MOCK_USERS: (User & { password?: string; studentID?: string })[] = [
  { id:"admin1",   firstName:"Admin",   lastName:"User",    email:"admin@geo.com",   password:"admin123",   role:"ADMIN",   department:"CS" },
  { id:"doc1",     firstName:"Ahmed",   lastName:"Hassan",  email:"doctor@geo.com",  password:"doctor123",  role:"DOCTOR",  department:"CS" },
  { id:"stu1",     firstName:"Ziad",    lastName:"Desoky",  email:"student@geo.com", password:"student123", role:"STUDENT", department:"CS", studentID:"2021001" },
];

const DEFAULT_LECTURES: Lecture[] = [];
const DEFAULT_COURSES: Course[]   = [
  { id:"c1", name:"Data Structures", code:"CS301", doctorId:"doc1", department:"CS", creditHours:3, location:"Hall A" },
  { id:"c2", name:"Algorithms",      code:"CS302", doctorId:"doc1", department:"CS", creditHours:3, location:"Hall B" },
];
const DEFAULT_SCHEDULES: Schedule[] = [
  { id:"s1", courseId:"c1", day:"Sunday",   startTime:"09:00", endTime:"11:00", location:"Hall A" },
  { id:"s2", courseId:"c2", day:"Tuesday",  startTime:"11:00", endTime:"13:00", location:"Hall B" },
];
const DEFAULT_ENROLLMENTS: Enrollment[] = [
  { id:"e1", courseId:"c1", studentId:"stu1" },
];
const DEFAULT_ATTENDANCE: AttendanceRecord[] = [];

// ── Context type ──────────────────────────────────────────────────────────────
export interface MockDataContextType {
  users: User[]; lectures: Lecture[]; courses: Course[];
  schedules: Schedule[]; enrollments: Enrollment[]; attendance: AttendanceRecord[];
  addUser: (u: User) => void;
  updateUserInList: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addLecture: (l: Omit<Lecture,"id">) => void;
  updateLecture: (id: string, data: Partial<Lecture>) => void;
  deleteLecture: (id: string) => void;
  addCourse: (c: Omit<Course,"id">) => void;
  updateCourse: (id: string, data: Partial<Course>) => void;
  deleteCourse: (id: string) => void;
  addSchedule: (s: Omit<Schedule,"id">) => void;
  updateSchedule: (id: string, data: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  enrollStudent: (courseId: string, studentId: string) => void;
  unenrollStudent: (courseId: string, studentId: string) => void;
  markAttendance: (lectureId: string, studentId: string, courseId: string) => void;
  unmarkAttendance: (lectureId: string, studentId: string) => void;
  banUser: (id: string) => void;
  unbanUser: (id: string) => void;
  promoteToAdmin: (id: string) => void;
  demoteFromAdmin: (id: string, r: "STUDENT" | "DOCTOR") => void;
  refreshFromBackend: () => Promise<void>;
}

const MockDataContext = createContext<MockDataContextType | null>(null);

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [users,       setUsers]       = useState<User[]>(() => load("geo_all_users",       MOCK_USERS));
  const [lectures,    setLectures]    = useState<Lecture[]>(() => load("geo_all_lectures",   DEFAULT_LECTURES));
  const [courses,     setCourses]     = useState<Course[]>(() => load("geo_all_courses",     DEFAULT_COURSES));
  const [schedules,   setSchedules]   = useState<Schedule[]>(() => load("geo_all_schedules", DEFAULT_SCHEDULES));
  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => load("geo_all_enrollments", DEFAULT_ENROLLMENTS));
  const [attendance,  setAttendance]  = useState<AttendanceRecord[]>(() => load("geo_all_attendance", DEFAULT_ATTENDANCE));

  // ── Persist to localStorage ─────────────────────────────────────────────────
  useEffect(() => { save("geo_all_users",       users);       }, [users]);
  useEffect(() => { save("geo_all_lectures",    lectures);    }, [lectures]);
  useEffect(() => { save("geo_all_courses",     courses);     }, [courses]);
  useEffect(() => { save("geo_all_schedules",   schedules);   }, [schedules]);
  useEffect(() => { save("geo_all_enrollments", enrollments); }, [enrollments]);
  useEffect(() => { save("geo_all_attendance",  attendance);  }, [attendance]);

  // ── Fetch from backend on mount ─────────────────────────────────────────────
  const refreshFromBackend = async () => {
    try {
      const [coursesRes, schedulesRes, usersRes] = await Promise.allSettled([
        apiGetCourses(),
        apiGetSchedules(),
        apiGetAllUsers(),
      ]);

      // Backend /courses returns array directly (not { courses: [...] })
      if (coursesRes.status === "fulfilled") {
        const raw = coursesRes.value as any;
        const arr: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.courses) ? raw.courses : null);
        if (arr && arr.length > 0) {
          const mapped = arr.map((c: any) => ({
            id: c._id || c.id,
            name: c.name,
            code: c.code,
            doctorId: c.professorId || c.doctorId || "",
            department: c.department || "",
            creditHours: c.creditHours || 3,
            location: c.location || "",
          }));
          setCourses(mapped);
          save("geo_all_courses", mapped);
        }
      }

      // Backend /schedules returns array directly
      if (schedulesRes.status === "fulfilled") {
        const raw = schedulesRes.value as any;
        const arr: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.schedules) ? raw.schedules : null);
        if (arr && arr.length > 0) {
          const mapped = arr.map((s: any) => ({
            id: s._id || s.id,
            courseId: s.courseId,
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location || "",
          }));
          setSchedules(mapped);
          save("geo_all_schedules", mapped);
        }
      }

      // Backend /admin/users returns { users: [...] }
      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value)) {
        const mapped = (usersRes.value as User[]);
        if (mapped.length > 0) {
          setUsers(mapped);
          save("geo_all_users", mapped);
        }
      }
    } catch {
      // Backend unavailable — keep using localStorage/mock data
    }
  };

  // Fetch enrollments separately (can fail independently)
  const refreshEnrollments = async () => {
    try {
      const arr = await apiGetAllEnrollments() as any[];
      if (arr && arr.length >= 0) {
        const mapped: Enrollment[] = arr.map((e: any) => ({
          id: e.id || e._id || "E" + Date.now() + Math.random(),
          courseId: e.courseId || "",
          studentId: e.studentId || "",
        }));
        setEnrollments(mapped);
        save("geo_all_enrollments", mapped);
      }
    } catch {
      // Ignore — keep local enrollments
    }
  };

  // Real-time synchronization using Firestore (Direct linking like Omar Shabaan)
  useEffect(() => {
    // 1. Listen for Courses
    const unsubCourses = onSnapshot(collection(db, "courses"), (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() } as Course));
      if (arr.length > 0) setCourses(arr);
    });

    // 2. Listen for Schedules
    const unsubSchedules = onSnapshot(collection(db, "schedules"), (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule));
      if (arr.length > 0) setSchedules(arr);
    });

    // 3. Listen for Enrollments
    const unsubEnrollments = onSnapshot(collection(db, "enrollments"), (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() } as Enrollment));
      if (arr.length >= 0) setEnrollments(arr);
    });

    return () => {
      unsubCourses();
      unsubSchedules();
      unsubEnrollments();
    };
  }, []);

  // ── Users ───────────────────────────────────────────────────────────────────
  const addUser = async (u: User) => {
    setUsers(p => [...p, u]);
    try { await apiCreateUser({ email: u.email, password: "temp1234", fullName: `${u.firstName} ${u.lastName}`, role: u.role }); } catch { }
  };
  const updateUserInList = async (id: string, data: Partial<User>) => {
    setUsers(p => p.map(u => u.id === id ? { ...u, ...data } : u));
    try { await apiEditUser(id, { fullName: `${data.firstName || ""} ${data.lastName || ""}`.trim(), role: data.role || "STUDENT" }); } catch { }
  };
  const deleteUser = async (id: string) => {
    setUsers(p => p.filter(u => u.id !== id));
    try { await apiDeleteUser(id); } catch { }
  };
  const banUser        = (id: string) => setUsers(p => p.map(u => u.id === id ? { ...u, isBanned: true  } : u));
  const unbanUser      = (id: string) => setUsers(p => p.map(u => u.id === id ? { ...u, isBanned: false } : u));
  const promoteToAdmin = (id: string) => setUsers(p => p.map(u => u.id === id ? { ...u, role: "ADMIN"  } : u));
  const demoteFromAdmin = (id: string, r: "STUDENT" | "DOCTOR") => setUsers(p => p.map(u => u.id === id ? { ...u, role: r } : u));

  // ── Lectures ────────────────────────────────────────────────────────────────
  const addLecture    = (l: Omit<Lecture,"id">)           => setLectures(p => [...p, { ...l, id: "L" + Date.now() }]);
  const updateLecture = (id: string, d: Partial<Lecture>) => setLectures(p => p.map(l => l.id === id ? { ...l, ...d } : l));
  const deleteLecture = (id: string)                       => setLectures(p => p.filter(l => l.id !== id));

  // ── Courses ─────────────────────────────────────────────────────────────────
  const addCourse = async (c: Omit<Course,"id">) => {
    const tmpId = "C" + Date.now();
    setCourses(p => [...p, { ...c, id: tmpId }]);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "courses", tmpId), { ...c, id: tmpId });
    } catch (err) {
      console.error("Direct Firestore write failed:", err);
    }
  };
  const updateCourse = async (id: string, d: Partial<Course>) => {
    setCourses(p => p.map(c => c.id === id ? { ...c, ...d } : c));
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "courses", id), d, { merge: true });
    } catch { }
  };
  const deleteCourse = async (id: string) => {
    setCourses(p => p.filter(c => c.id !== id));
    setSchedules(p => p.filter(s => s.courseId !== id));
    setEnrollments(p => p.filter(e => e.courseId !== id));
    try {
      const { doc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "courses", id));
    } catch { }
  };

  // ── Schedules ───────────────────────────────────────────────────────────────
  const addSchedule = async (s: Omit<Schedule,"id">) => {
    const tmpId = "S" + Date.now();
    setSchedules(p => [...p, { ...s, id: tmpId }]);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "schedules", tmpId), { ...s, id: tmpId });
    } catch { }
  };
  const updateSchedule = (id: string, d: Partial<Schedule>) => setSchedules(p => p.map(s => s.id === id ? { ...s, ...d } : s));
  const deleteSchedule = async (id: string) => {
    setSchedules(p => p.filter(s => s.id !== id));
    try {
      const { doc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "schedules", id));
    } catch { }
  };

  // ── Enrollments ─────────────────────────────────────────────────────────────
  const enrollStudent = async (courseId: string, studentId: string) => {
    const tmpId = `E_${courseId}_${studentId}`;
    setEnrollments(p => [...p, { id: tmpId, courseId, studentId }]);
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "enrollments", tmpId), { id: tmpId, courseId, studentId });
    } catch { }
  };
  const unenrollStudent = async (courseId: string, studentId: string) => {
    setEnrollments(p => p.filter(e => !(e.courseId === courseId && e.studentId === studentId)));
    try {
      const { doc, deleteDoc } = await import("firebase/firestore");
      const tmpId = `E_${courseId}_${studentId}`;
      await deleteDoc(doc(db, "enrollments", tmpId));
    } catch { }
  };

  // ── Attendance ──────────────────────────────────────────────────────────────
  const markAttendance = (lectureId: string, studentId: string, courseId: string) => {
    if (attendance.some(a => a.lectureId === lectureId && a.studentId === studentId)) return;
    setAttendance(p => [...p, { id: "A" + Date.now(), lectureId, studentId, courseId, timestamp: new Date().toISOString() }]);
    setLectures(p => p.map(l => l.id === lectureId ? { ...l, studentsPresent: l.studentsPresent + 1 } : l));
  };
  const unmarkAttendance = (lectureId: string, studentId: string) => {
    setAttendance(p => p.filter(a => !(a.lectureId === lectureId && a.studentId === studentId)));
    setLectures(p => p.map(l => l.id === lectureId ? { ...l, studentsPresent: Math.max(0, l.studentsPresent - 1) } : l));
  };

  return (
    <MockDataContext.Provider value={{
      users, lectures, courses, schedules, enrollments, attendance,
      addUser, updateUserInList, deleteUser,
      addLecture, updateLecture, deleteLecture,
      addCourse, updateCourse, deleteCourse,
      addSchedule, updateSchedule, deleteSchedule,
      enrollStudent, unenrollStudent,
      markAttendance, unmarkAttendance,
      banUser, unbanUser, promoteToAdmin, demoteFromAdmin,
      refreshFromBackend,
    }}>
      {children}
    </MockDataContext.Provider>
  );
}

export function useMockData() {
  const ctx = useContext(MockDataContext);
  if (!ctx) throw new Error("useMockData must be inside MockDataProvider");
  return ctx;
}
