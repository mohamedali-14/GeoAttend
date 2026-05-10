// ─── Base URL from .env ────────────────────────────────────────────────────────
const defaultHost = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
  ? `http://${window.location.hostname}:5000/api` 
  : "http://localhost:5000/api";
const BASE_URL = import.meta.env.VITE_API_URL || defaultHost;

function getToken() {
  return localStorage.getItem("geo_token") || sessionStorage.getItem("geo_token") || "";
}

// Refresh Firebase ID token using stored refreshToken
async function refreshFirebaseToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem("geo_refresh_token");
    if (!refreshToken) return null;
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    if (!apiKey) return null;
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken }),
      }
    );
    const data = await res.json();
    if (data.id_token) {
      const expiresAt = Date.now() + (parseInt(data.expires_in || "3600") * 1000);
      localStorage.setItem("geo_token", data.id_token);
      localStorage.setItem("geo_token_expires_at", String(expiresAt));
      sessionStorage.setItem("geo_token", data.id_token);
      if (data.refresh_token) localStorage.setItem("geo_refresh_token", data.refresh_token);
      console.log("[auth] Token refreshed successfully, expires at:", new Date(expiresAt).toISOString());
      return data.id_token;
    }
    return null;
  } catch {
    return null;
  }
}

// Check if token is expired or will expire in the next 5 minutes
function isTokenExpiredOrExpiringSoon(): boolean {
  const expiresAt = parseInt(localStorage.getItem("geo_token_expires_at") || "0");
  if (!expiresAt) return false; // No expiry info — assume ok
  return Date.now() > expiresAt - 5 * 60 * 1000; // 5 min buffer
}

// Start proactive token refresh (call this after login)
let _refreshInterval: ReturnType<typeof setInterval> | null = null;
function startTokenAutoRefresh() {
  if (_refreshInterval) clearInterval(_refreshInterval);
  _refreshInterval = setInterval(async () => {
    if (isTokenExpiredOrExpiringSoon()) {
      console.log("[auth] Proactively refreshing token before expiry...");
      await refreshFirebaseToken();
    }
  }, 60 * 1000); // Check every 60 seconds
}

function authHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || "Something went wrong");
  return data as T;
}

// Fetch with auto token refresh on 401
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401) {
    const newToken = await refreshFirebaseToken();
    if (newToken) {
      res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newToken}`,
          ...(options.headers || {}),
        },
      });
    }
  }
  return res;
}

function mapUser(u: {
  id?: string; _id?: string; uid?: string;
  name?: string; fullName?: string;
  email: string; role: string;
  department?: string; studentId?: string; studentID?: string;
  isActive?: boolean; isBanned?: boolean;
  profilePicture?: string;
}) {
  const fullName = u.fullName || u.name || "";
  const parts    = fullName.split(" ");
  const rawRole  = u.role || "STUDENT";
  // Normalize PROFESSOR → DOCTOR for frontend
  const role = rawRole === "PROFESSOR" ? "DOCTOR" : rawRole as "STUDENT" | "DOCTOR" | "ADMIN";
  return {
    id:         u.uid || u.id || u._id || "",
    firstName:  parts[0] || "",
    lastName:   parts.slice(1).join(" ") || "",
    email:      u.email,
    role,
    department: u.department || "",
    studentID:  u.studentId || u.studentID || "",
    isBanned:   u.isBanned ?? (u.isActive === false),
    profilePicture: u.profilePicture || undefined,
  };
}

// ══════════════════════════════════════
// AUTH
// ══════════════════════════════════════

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<{ token: string; refreshToken?: string; expiresIn?: string; user: object }>(res);
  const token = (data as any).token;
  const expiresIn = parseInt((data as any).expiresIn || "3600");
  const expiresAt = Date.now() + expiresIn * 1000;
  localStorage.setItem("geo_token", token);
  localStorage.setItem("geo_token_expires_at", String(expiresAt));
  sessionStorage.setItem("geo_token", token);
  // Store refresh token for auto-renewal
  if ((data as any).refreshToken) {
    localStorage.setItem("geo_refresh_token", (data as any).refreshToken);
  }
  // Start proactive auto-refresh so token never expires mid-session
  startTokenAutoRefresh();
  return {
    token,
    user:  mapUser((data as any).user),
  };
}

export async function apiRegister(body: {
  email: string; password: string; fullName: string;
  role?: string; department?: string; studentId?: string;
}) {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
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

// ══════════════════════════════════════
// ADMIN — USERS
// ══════════════════════════════════════

export async function apiGetAllUsers(role?: string) {
  const q   = role ? `?role=${role}` : "";
  const res = await fetchWithAuth(`${BASE_URL}/admin/users${q}`);
  const data = await handleResponse<{ users: object[] }>(res);
  return (data as any).users.map((u: any) => mapUser(u));
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

// ══════════════════════════════════════
// COURSES
// ══════════════════════════════════════

export async function apiGetCourses() {
  const res = await fetch(`${BASE_URL}/courses`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  // Backend returns array directly
  return Array.isArray(data) ? data : (data.courses || data);
}

export async function apiCreateCourse(body: {
  name: string; code: string; department?: string;
  professorId: string; creditHours?: number; location?: string;
}) {
  // Map doctorId → professorId for backend
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

// ══════════════════════════════════════
// SCHEDULES
// ══════════════════════════════════════

export async function apiGetSchedules(filters?: { courseId?: string; professorId?: string; day?: string }) {
  const params = filters ? "?" + new URLSearchParams(filters as Record<string, string>) : "";
  const res = await fetch(`${BASE_URL}/schedules${params}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  // Backend returns array directly
  return Array.isArray(data) ? data : (data.schedules || data);
}

export async function apiCreateSchedule(body: {
  courseId: string; day: string; startTime: string; endTime: string; location?: string;
}) {
  const res = await fetch(`${BASE_URL}/schedules`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  return handleResponse(res);
}

// ══════════════════════════════════════
// ENROLLMENTS
// ══════════════════════════════════════

// GET all enrollments (doctor/admin see all, student sees own)
export async function apiGetAllEnrollments() {
  const res = await fetchWithAuth(`${BASE_URL}/enrollments`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  const arr = Array.isArray(data) ? data : (data.enrollments || []);
  return arr;
}

export async function apiEnrollStudent(courseId: string, studentId: string) {
  const res = await fetch(`${BASE_URL}/enrollments`, {
    method: "POST", headers: authHeaders(),
    body: JSON.stringify({ courseId, studentId }),
  });
  return handleResponse(res);
}

export async function apiUnenrollStudent(courseId: string, studentId: string) {
  const res = await fetch(`${BASE_URL}/enrollments/student/${studentId}/course/${courseId}`, {
    method: "DELETE", headers: authHeaders(),
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

export async function apiGetEnrollmentStats() {
  const res = await fetch(`${BASE_URL}/enrollments/stats`, { headers: authHeaders() });
  return handleResponse(res);
}

// ══════════════════════════════════════
// SESSIONS
// ══════════════════════════════════════

export async function apiGetSessions() {
  const res = await fetch(`${BASE_URL}/sessions`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetSession(sessionId: string) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiCreateSession(body: {
  courseId: string;
  location: { lat: number; lng: number } | null;
  radiusMeters?: number;
  geoEnabled?: boolean;
  room?: string;
  randomCheckEnabled?: boolean;
  selfieEnabled?: boolean;
}) {
  const res = await fetchWithAuth(`${BASE_URL}/sessions`, {
    method: "POST", body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiStartSession(sessionId: string) {
  const res = await fetchWithAuth(`${BASE_URL}/sessions/${sessionId}/start`, {
    method: "POST",
  });
  return handleResponse(res);
}

export async function apiPauseSession(sessionId: string) {
  const res = await fetchWithAuth(`${BASE_URL}/sessions/${sessionId}/pause`, {
    method: "POST",
  });
  return handleResponse(res);
}

export async function apiResumeSession(sessionId: string) {
  const res = await fetchWithAuth(`${BASE_URL}/sessions/${sessionId}/resume`, {
    method: "POST",
  });
  return handleResponse(res);
}

export async function apiEndSession(sessionId: string) {
  const res = await fetchWithAuth(`${BASE_URL}/sessions/${sessionId}/end`, {
    method: "POST",
  });
  return handleResponse(res);
}

// ══════════════════════════════════════
// ATTENDANCE
// ══════════════════════════════════════

export async function apiJoinSession(sessionId: string, location: { lat: number; lng: number; selfieUrl?: string | null }) {
  const res = await fetchWithAuth(`${BASE_URL}/attendance/sessions/${sessionId}/join`, {
    method: "POST",
    body: JSON.stringify({ lat: location.lat, lng: location.lng, selfieUrl: location.selfieUrl }),
  });
  return handleResponse(res);
}

export async function apiGetNearbySessions(lat: number, lng: number) {
  const res = await fetch(`${BASE_URL}/attendance/sessions/nearby?lat=${lat}&lng=${lng}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiGetAttendanceHistory() {
  const res = await fetch(`${BASE_URL}/attendance/history`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetSessionSummary(sessionId: string) {
  const res = await fetch(`${BASE_URL}/attendance/sessions/${sessionId}/summary`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

// ══════════════════════════════════════
// USERS
// ══════════════════════════════════════

export async function apiGetUsers() {
  const res = await fetch(`${BASE_URL}/users`, { headers: authHeaders() });
  return handleResponse(res);
}

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS API  (paths match backend /api/analytics/*)
// ═══════════════════════════════════════════════════════════════════

export async function apiGetQuickStats() {
  const res = await fetch(`${BASE_URL}/analytics/quick-stats`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetAttendanceStats(params?: { courseId?: string; period?: string; startDate?: string; endDate?: string }) {
  const q = params ? "?" + new URLSearchParams(params as any).toString() : "";
  const res = await fetch(`${BASE_URL}/analytics/attendance-stats${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetAttendanceTrends(params?: { courseId?: string; interval?: string; days?: number }) {
  const q = params ? "?" + new URLSearchParams(params as any).toString() : "";
  const res = await fetch(`${BASE_URL}/analytics/attendance-trends${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetCourseAnalytics(courseId: string) {
  const res = await fetch(`${BASE_URL}/analytics/course/${courseId}/analytics`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetStudentEngagement(studentId: string, courseId?: string) {
  const q = courseId ? `?courseId=${courseId}` : "";
  const res = await fetch(`${BASE_URL}/analytics/student/${studentId}/engagement${q}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiGetRealtimeDashboard() {
  const res = await fetch(`${BASE_URL}/analytics/realtime-dashboard`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiCheckAtRiskStudents(courseId: string) {
  const res = await fetch(`${BASE_URL}/monitoring/check-at-risk`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ courseId }),
  });
  return handleResponse(res);
}

// ═══════════════════════════════════════════════════════════════════
// SELFIE VERIFICATION API
// ═══════════════════════════════════════════════════════════════════

export async function apiGetPendingSelfies(sessionId: string) {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/pending-selfies`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiVerifySelfie(selfieId: string) {
  const res = await fetch(`${BASE_URL}/selfies/${selfieId}/verify`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function apiRejectSelfie(selfieId: string, reason: string) {
  const res = await fetch(`${BASE_URL}/selfies/${selfieId}/reject`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(res);
}

export async function apiMarkAttendanceWithSelfie(sessionId: string, location: { lat: number; lng: number }, selfieBase64?: string) {
  const res = await fetch(`${BASE_URL}/attendance/mark-with-selfie`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ sessionId, location, selfieBase64 }),
  });
  return handleResponse(res);
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT API (PDF/Excel)
// ═══════════════════════════════════════════════════════════════════

export async function apiExportSessionPDF(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/export/pdf`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `attendance_${sessionId}.pdf`; a.click();
  URL.revokeObjectURL(url);
}

export async function apiExportSessionExcel(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/export/excel`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `attendance_${sessionId}.xlsx`; a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════
// QUIZ FROM PDF API
// ═══════════════════════════════════════════════════════════════════

export async function apiUploadLectureAndGenerateQuiz(sessionId: string, pdfFile: File) {
  const formData = new FormData();
  formData.append("pdf", pdfFile);
  const token = localStorage.getItem("geo_token") || sessionStorage.getItem("geo_token") || "";
  const res = await fetch(`${BASE_URL}/quiz/sessions/${sessionId}/upload-lecture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return handleResponse(res);
}

export async function apiGetQuiz(sessionId: string) {
  const res = await fetch(`${BASE_URL}/quiz/${sessionId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function apiSubmitQuiz(body: { sessionId: string; answers: Record<string, string> }) {
  const res = await fetch(`${BASE_URL}/quiz/submit`, {
    method: "POST", headers: authHeaders(), body: JSON.stringify(body),
  });
  return handleResponse(res);
}

export async function apiGetQuizAnalytics(sessionId: string) {
  const res = await fetch(`${BASE_URL}/quiz/sessions/${sessionId}/quiz-analytics`, { headers: authHeaders() });
  return handleResponse(res);
}
// Alias for backward compatibility
export const apiGetAdminUsers = apiGetAllUsers;