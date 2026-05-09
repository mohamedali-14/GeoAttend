import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MockDataProvider } from "./context/MockDataContext";
import { SocketProvider } from "./context/SocketContext";
import { ToastProvider } from "./context/ToastContext";
import { QuizProvider } from "./context/QuizContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageSkeleton } from "./components/Skeleton";

// Lazy-loaded pages for better performance
const Login            = lazy(() => import("./pages/auth/Login"));
const Register         = lazy(() => import("./pages/auth/Register"));
const ForgotPassword   = lazy(() => import("./pages/auth/ForgotPassword"));
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const DoctorDashboard  = lazy(() => import("./pages/doctor/DoctorDashboard"));
const AdminDashboard   = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers       = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCourses     = lazy(() => import("./pages/admin/AdminCourses"));
const AdminSchedule    = lazy(() => import("./pages/admin/AdminSchedule"));
const AdminCourseEnrollment = lazy(() => import("./pages/admin/AdminCourseEnrollment"));
const AdminEnrollmentHub    = lazy(() => import("./pages/admin/AdminEnrollmentHub"));
const AdminLectures    = lazy(() => import("./pages/admin/AdminLectures"));
const AdminSettings    = lazy(() => import("./pages/admin/AdminSettings"));
const AdminLayout      = lazy(() => import("./pages/admin/AdminLayout"));
const LiveDashboard    = lazy(() => import("./pages/shared/LiveDashboard"));
const AdminLive        = lazy(() => import("./pages/admin/AdminLive"));
const AdminSessionHistory = lazy(() => import("./pages/admin/AdminSessionHistory"));
const AttendanceView   = lazy(() => import("./pages/shared/AttendanceView"));
const AdminQuizzesPage = lazy(() => import("./pages/admin/AdminQuizzesPage"));
const QuizPage         = lazy(() => import("./pages/QuizPage"));
const QuizResultsPage  = lazy(() => import("./pages/QuizResultsPage"));

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["ADMIN"]}>{children}</ProtectedRoute>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/student"  element={<ProtectedRoute allowedRoles={["STUDENT"]}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/doctor"   element={<ProtectedRoute allowedRoles={["DOCTOR"]}><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/live"     element={<ProtectedRoute allowedRoles={["STUDENT","DOCTOR","ADMIN"]}><LiveDashboard /></ProtectedRoute>} />
        <Route path="/attend"   element={<ProtectedRoute allowedRoles={["STUDENT"]}><AttendanceView /></ProtectedRoute>} />
        <Route path="/quiz"           element={<ProtectedRoute allowedRoles={["STUDENT"]}><QuizPage /></ProtectedRoute>} />
        <Route path="/quiz/results"    element={<ProtectedRoute allowedRoles={["STUDENT"]}><QuizResultsPage /></ProtectedRoute>} />
        <Route path="/quiz/:sessionId" element={<ProtectedRoute allowedRoles={["STUDENT"]}><QuizPage /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index         element={<AdminDashboard />} />
          <Route path="users"       element={<AdminUsers />} />
          <Route path="courses"     element={<AdminCourses />} />
          <Route path="schedule"    element={<AdminSchedule />} />
          <Route path="enrollment"  element={<AdminEnrollmentHub />} />
          <Route path="courses/:courseId/enrollment" element={<AdminCourseEnrollment />} />
          <Route path="lectures"    element={<AdminLectures />} />
          <Route path="live"        element={<AdminLive />} />
          <Route path="sessions"    element={<AdminSessionHistory />} />
          <Route path="quizzes"     element={<AdminQuizzesPage />} />
          <Route path="settings"    element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <MockDataProvider>
            <SocketProvider>
              <ToastProvider>
                <QuizProvider>
                  <AppRoutes />
                </QuizProvider>
              </ToastProvider>
            </SocketProvider>
          </MockDataProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
