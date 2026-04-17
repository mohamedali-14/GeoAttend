const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return sessionStorage.getItem("geo_token") || "";
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data as T;
}

function mapUser(u: {
  id?: string; _id?: string; uid?: string;
  name?: string; fullName?: string;
  email: string; role: string;
  department?: string; studentId?: string; studentID?: string;
  isActive?: boolean; isBanned?: boolean;
}) {
  const fullName = u.fullName || u.name || "";
  const parts    = fullName.split(" ");
  return {
    id:         u.uid || u.id || u._id || "",
    firstName:  parts[0] || "",
    lastName:   parts.slice(1).join(" ") || "",
    email:      u.email,
    role:       u.role as "STUDENT" | "DOCTOR" | "ADMIN",
    department: u.department || "",
    studentID:  u.studentId || u.studentID || "",
    isBanned:   u.isBanned ?? (u.isActive === false),
  };
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<{ token: string; user: object }>(res);
  sessionStorage.setItem("geo_token", (data as { token: string }).token);
  return {
    token: (data as { token: string }).token,
    user:  mapUser((data as { user: object }).user as Parameters<typeof mapUser>[0]),
  };
}

export async function apiCreateUser(body: {
  email: string; password: string; fullName: string;
  role: string; department?: string; studentId?: string;
}) {
  const res = await fetch(`${BASE_URL}/auth/create-user`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiGetAllUsers(role?: string) {
  const q   = role ? `?role=${role}` : "";
  const res = await fetch(`${BASE_URL}/admin/users${q}`, { headers: authHeaders() });
  const data = await handleResponse<{ users: object[] }>(res);
  return data.users.map(u => mapUser(u as Parameters<typeof mapUser>[0]));
}

export async function apiEditUser(userId: string, body: { fullName: string; role: string }) {
  const res = await fetch(`${BASE_URL}/admin/users/${userId}`, {
    method: "PUT", headers: authHeaders(), body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiDeleteUser(userId: string) {
  const res = await fetch(`${BASE_URL}/admin/users/${userId}`, {
    method: "DELETE", headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiGetCourses() {
  const res = await fetch(`${BASE_URL}/courses`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiCreateCourse(body: {
  name: string; code: string; department?: string;
  professorId: string; creditHours?: number; location?: string;
}) {
  const res = await fetch(`${BASE_URL}/courses`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiUpdateCourse(courseId: string, body: object) {
  const res = await fetch(`${BASE_URL}/courses/${courseId}`, {
    method: "PUT", headers: authHeaders(), body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiDeleteCourse(courseId: string) {
  const res = await fetch(`${BASE_URL}/courses/${courseId}`, {
    method: "DELETE", headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiGetSchedules(filters?: { courseId?: string; professorId?: string; day?: string }) {
  const params = filters ? "?" + new URLSearchParams(filters as Record<string, string>) : "";
  const res = await fetch(`${BASE_URL}/schedules${params}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiCreateSchedule(body: {
  courseId: string; day: string; startTime: string; endTime: string; location?: string;
}) {
  const res = await fetch(`${BASE_URL}/schedules`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiEnrollStudent(courseId: string, studentId: string) {
  const res = await fetch(`${BASE_URL}/enrollments`, {
    method: "POST", headers: authHeaders(),
    body: JSON.stringify({ courseId, studentId }),
  });
  return handleResponse(res);
}

export async function apiGetStudentEnrollments(studentId: string) {
  const res = await fetch(`${BASE_URL}/enrollments/student/${studentId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetProfessorCourses() {
  const res = await fetch(`${BASE_URL}/enrollments/professor-courses`, { headers: authHeaders() });
  return handleResponse(res);
}
