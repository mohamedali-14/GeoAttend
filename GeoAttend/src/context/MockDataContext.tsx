import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "./AuthContext";

export interface Lecture {
  id: string;
  title: string;
  doctorId: string;
  doctorName: string;
  department: string;
  scheduledAt: string;
  duration: number;
  status: "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  studentsPresent: number;
  location?: string;
  courseId?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  doctorId: string;
  department: string;
  creditHours: number;
  location: string;
}

export interface Schedule {
  id: string;
  courseId: string;
  day: "Saturday" | "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday";
  startTime: string;
  endTime: string;
  location: string;
}

export interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
}

// NEW: track attendance per student per lecture
export interface AttendanceRecord {
  id: string;
  lectureId: string;
  studentId: string;
  courseId: string;
  timestamp: string;
}

export interface MockDataContextType {
  users: User[];
  lectures: Lecture[];
  courses: Course[];
  schedules: Schedule[];
  enrollments: Enrollment[];
  attendance: AttendanceRecord[];

  addUser: (u: User) => void;
  updateUserInList: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;

  addLecture: (l: Omit<Lecture, "id">) => void;
  updateLecture: (id: string, data: Partial<Lecture>) => void;
  deleteLecture: (id: string) => void;

  addCourse: (c: Omit<Course, "id">) => void;
  updateCourse: (id: string, data: Partial<Course>) => void;
  deleteCourse: (id: string) => void;

  addSchedule: (s: Omit<Schedule, "id">) => void;
  updateSchedule: (id: string, data: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;

  enrollStudent: (courseId: string, studentId: string) => void;
  unenrollStudent: (courseId: string, studentId: string) => void;

  markAttendance: (lectureId: string, studentId: string, courseId: string) => void;
  unmarkAttendance: (lectureId: string, studentId: string) => void;

  banUser: (id: string) => void;
  unbanUser: (id: string) => void;
  promoteToAdmin: (id: string) => void;
  demoteFromAdmin: (id: string, newRole: "STUDENT" | "DOCTOR") => void;
}

const MockDataContext = createContext<MockDataContextType | null>(null);

const DEFAULT_USERS: User[] = [
  { id: "3", firstName: "Admin",   lastName: "User",    email: "admin@geo.com",    password: "123456", role: "ADMIN",   isBanned: false },
  { id: "4", firstName: "Mohamed", lastName: "Khaled",  email: "m.khaled@geo.com", password: "123456", role: "STUDENT", department: "Computer Science", studentID: "20240042", isBanned: false },
  { id: "5", firstName: "Nour",    lastName: "Ibrahim", email: "nour@geo.com",     password: "123456", role: "DOCTOR",  department: "Mathematics",      isBanned: false },
  { id: "6", firstName: "Omar",    lastName: "Tarek",   email: "omar@geo.com",     password: "123456", role: "STUDENT", department: "Physics",          studentID: "20240099", isBanned: true },
  { id: "7", firstName: "Sara",    lastName: "Ahmed",   email: "sara@geo.com",     password: "123456", role: "STUDENT", department: "Computer Science", studentID: "20240010", isBanned: false },
  { id: "8", firstName: "Khaled",  lastName: "Hassan",  email: "khaled@geo.com",   password: "123456", role: "DOCTOR",  department: "Computer Science", isBanned: false },
];

const DEFAULT_COURSES: Course[] = [
  { id: "C1", name: "Data Structures",  code: "CS201",  doctorId: "8", department: "Computer Science", creditHours: 3, location: "Hall A-101" },
  { id: "C2", name: "Calculus II",       code: "MTH202", doctorId: "5", department: "Mathematics",     creditHours: 3, location: "Hall B-202" },
  { id: "C3", name: "Web Development",   code: "CS301",  doctorId: "8", department: "Computer Science", creditHours: 3, location: "Lab C-103" },
  { id: "C4", name: "Linear Algebra",    code: "MTH301", doctorId: "5", department: "Mathematics",     creditHours: 2, location: "Hall B-301" },
];

const DEFAULT_SCHEDULES: Schedule[] = [
  { id: "S1", courseId: "C1", day: "Sunday",    startTime: "09:00", endTime: "11:00", location: "Hall A-101" },
  { id: "S2", courseId: "C1", day: "Tuesday",   startTime: "09:00", endTime: "11:00", location: "Hall A-101" },
  { id: "S3", courseId: "C2", day: "Monday",    startTime: "10:00", endTime: "12:00", location: "Hall B-202" },
  { id: "S4", courseId: "C3", day: "Wednesday", startTime: "13:00", endTime: "15:00", location: "Lab C-103" },
  { id: "S5", courseId: "C4", day: "Thursday",  startTime: "08:00", endTime: "10:00", location: "Hall B-301" },
  { id: "S6", courseId: "C2", day: "Wednesday", startTime: "10:00", endTime: "12:00", location: "Hall B-202" },
];

const DEFAULT_ENROLLMENTS: Enrollment[] = [
  { id: "E1", courseId: "C1", studentId: "4" },
  { id: "E2", courseId: "C3", studentId: "4" },
  { id: "E3", courseId: "C1", studentId: "7" },
  { id: "E4", courseId: "C2", studentId: "7" },
];

const DEFAULT_LECTURES: Lecture[] = [
  { id: "L1", title: "Introduction to CS",     doctorId: "8", doctorName: "Dr. Khaled Hassan", department: "Computer Science", scheduledAt: "10:00 AM - 12:00 PM", duration: 120, status: "ACTIVE",    studentsPresent: 2, courseId: "C1" },
  { id: "L2", title: "Data Structures & Algo", doctorId: "8", doctorName: "Dr. Khaled Hassan", department: "Computer Science", scheduledAt: "02:00 PM - 04:00 PM", duration: 90,  status: "SCHEDULED", studentsPresent: 0, courseId: "C1" },
  { id: "L3", title: "Calculus II",             doctorId: "5", doctorName: "Dr. Nour Ibrahim",  department: "Mathematics",      scheduledAt: "08:00 AM - 10:00 AM", duration: 120, status: "COMPLETED", studentsPresent: 1, courseId: "C2" },
];

const DEFAULT_ATTENDANCE: AttendanceRecord[] = [
  { id: "A1", lectureId: "L1", studentId: "4", courseId: "C1", timestamp: new Date().toISOString() },
  { id: "A2", lectureId: "L1", studentId: "7", courseId: "C1", timestamp: new Date().toISOString() },
  { id: "A3", lectureId: "L3", studentId: "7", courseId: "C2", timestamp: new Date().toISOString() },
];

function load<T>(key: string, fallback: T[]): T[] {
  try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch (_e) { void _e; }
  return fallback;
}
function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function MockDataProvider({ children }: { children: ReactNode }) {
  const [users,       setUsers]       = useState<User[]>(() => load("geo_all_users",       DEFAULT_USERS));
  const [lectures,    setLectures]    = useState<Lecture[]>(() => load("geo_all_lectures",   DEFAULT_LECTURES));
  const [courses,     setCourses]     = useState<Course[]>(() => load("geo_all_courses",     DEFAULT_COURSES));
  const [schedules,   setSchedules]   = useState<Schedule[]>(() => load("geo_all_schedules", DEFAULT_SCHEDULES));
  const [enrollments, setEnrollments] = useState<Enrollment[]>(() => load("geo_all_enrollments", DEFAULT_ENROLLMENTS));
  const [attendance,  setAttendance]  = useState<AttendanceRecord[]>(() => load("geo_all_attendance", DEFAULT_ATTENDANCE));

  useEffect(() => { save("geo_all_users",       users);       }, [users]);
  useEffect(() => { save("geo_all_lectures",    lectures);    }, [lectures]);
  useEffect(() => { save("geo_all_courses",     courses);     }, [courses]);
  useEffect(() => { save("geo_all_schedules",   schedules);   }, [schedules]);
  useEffect(() => { save("geo_all_enrollments", enrollments); }, [enrollments]);
  useEffect(() => { save("geo_all_attendance",  attendance);  }, [attendance]);

  // Users
  const addUser          = (u: User)                            => setUsers(p => [...p, u]);
  const updateUserInList = (id: string, data: Partial<User>)   => setUsers(p => p.map(u => u.id === id ? { ...u, ...data } : u));
  const deleteUser       = (id: string)                         => setUsers(p => p.filter(u => u.id !== id));
  const banUser          = (id: string)                         => setUsers(p => p.map(u => u.id === id ? { ...u, isBanned: true  } : u));
  const unbanUser        = (id: string)                         => setUsers(p => p.map(u => u.id === id ? { ...u, isBanned: false } : u));
  const promoteToAdmin   = (id: string)                         => setUsers(p => p.map(u => u.id === id ? { ...u, role: "ADMIN"  } : u));
  const demoteFromAdmin  = (id: string, r: "STUDENT"|"DOCTOR") => setUsers(p => p.map(u => u.id === id ? { ...u, role: r       } : u));

  // Lectures
  const addLecture    = (l: Omit<Lecture,"id">)            => setLectures(p => [...p, { ...l, id: "L" + Date.now() }]);
  const updateLecture = (id: string, d: Partial<Lecture>)  => setLectures(p => p.map(l => l.id === id ? { ...l, ...d } : l));
  const deleteLecture = (id: string)                        => setLectures(p => p.filter(l => l.id !== id));

  // Courses
  const addCourse    = (c: Omit<Course,"id">)             => setCourses(p => [...p, { ...c, id: "C" + Date.now() }]);
  const updateCourse = (id: string, d: Partial<Course>)   => setCourses(p => p.map(c => c.id === id ? { ...c, ...d } : c));
  const deleteCourse = (id: string)                        => {
    setCourses(p => p.filter(c => c.id !== id));
    setSchedules(p => p.filter(s => s.courseId !== id));
    setEnrollments(p => p.filter(e => e.courseId !== id));
  };

  // Schedules
  const addSchedule    = (s: Omit<Schedule,"id">)            => setSchedules(p => [...p, { ...s, id: "S" + Date.now() }]);
  const updateSchedule = (id: string, d: Partial<Schedule>)  => setSchedules(p => p.map(s => s.id === id ? { ...s, ...d } : s));
  const deleteSchedule = (id: string)                         => setSchedules(p => p.filter(s => s.id !== id));

  // Enrollments
  const enrollStudent   = (courseId: string, studentId: string) => setEnrollments(p => [...p, { id: "E" + Date.now(), courseId, studentId }]);
  const unenrollStudent = (courseId: string, studentId: string) => setEnrollments(p => p.filter(e => !(e.courseId === courseId && e.studentId === studentId)));

  // Attendance
  const markAttendance = (lectureId: string, studentId: string, courseId: string) => {
    const already = attendance.some(a => a.lectureId === lectureId && a.studentId === studentId);
    if (already) return;
    const rec: AttendanceRecord = { id: "A" + Date.now(), lectureId, studentId, courseId, timestamp: new Date().toISOString() };
    setAttendance(p => [...p, rec]);
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
