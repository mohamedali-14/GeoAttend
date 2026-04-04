import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MockDataProvider } from "./context/MockDataContext";
import { SocketProvider } from "./context/SocketContext";
import { ToastProvider } from "./context/ToastContext";
import { QuizProvider } from "./context/QuizContext";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import StudentDashboard from "./pages/student/StudentDashboard";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminSchedule from "./pages/admin/AdminSchedule";
import AdminCourseEnrollment from "./pages/admin/AdminCourseEnrollment";
import AdminLectures from "./pages/admin/AdminLectures";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLayout from "./pages/admin/AdminLayout";
import LiveDashboard from "./pages/shared/LiveDashboard";
import AdminLive from "./pages/admin/AdminLive";
import AdminSessionHistory from "./pages/admin/AdminSessionHistory";
import AttendanceView from "./pages/shared/AttendanceView";
import AdminQuizzesPage from "./pages/admin/AdminQuizzesPage";
import QuizPage from "./pages/QuizPage";
import QuizResultsPage from "./pages/QuizResultsPage";

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1120]">
      <div className="w-8 h-8 border-2 border-[#00D084] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(user!.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const A = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allowedRoles={["ADMIN"]}>{children}</ProtectedRoute>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"                element={<Login />} />
      <Route path="/register"        element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/student" element={<ProtectedRoute allowedRoles={["STUDENT"]}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/doctor"  element={<ProtectedRoute allowedRoles={["DOCTOR"]}><DoctorDashboard /></ProtectedRoute>} />

      <Route path="/admin"                              element={<A><AdminDashboard /></A>} />
      <Route path="/admin/users"                        element={<A><AdminUsers /></A>} />
      <Route path="/admin/courses"                      element={<A><AdminCourses /></A>} />
      <Route path="/admin/course-enrollment" element={<A><AdminCourseEnrollment /></A>} />
      <Route path="/admin/courses/:courseId/enrollment" element={<A><AdminCourseEnrollment /></A>} />
      <Route path="/admin/schedule"                     element={<A><AdminSchedule /></A>} />
      
      <Route path="/admin/settings"                     element={<A><AdminSettings /></A>} />
      <Route path="/admin/live"                         element={<A><AdminLayout><AdminLive /></AdminLayout></A>} />
      <Route path="/admin/sessions"                     element={<A><AdminLayout><AdminSessionHistory /></AdminLayout></A>} />
      <Route path="/admin/attendance"                   element={<A><AdminLayout><AttendanceView /></AdminLayout></A>} />
      <Route path="/admin/quizzes"                      element={<A><AdminQuizzesPage /></A>} />

      <Route path="/quiz"            element={<ProtectedRoute allowedRoles={["STUDENT"]}><QuizPage /></ProtectedRoute>} />
      <Route path="/quiz/:sessionId" element={<ProtectedRoute allowedRoles={["STUDENT"]}><QuizPage /></ProtectedRoute>} />
      <Route path="/quiz/results"    element={<ProtectedRoute allowedRoles={["STUDENT"]}><QuizResultsPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MockDataProvider>
          <QuizProvider>
          <SocketProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </SocketProvider>
          </QuizProvider>
        </MockDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
