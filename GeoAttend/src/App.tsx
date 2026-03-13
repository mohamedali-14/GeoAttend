import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MockDataProvider } from "./context/MockDataContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import StudentDashboard from "./pages/StudentDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminSchedule from "./pages/admin/AdminSchedule";
import AdminCourseEnrollment from "./pages/admin/AdminCourseEnrollment";
import AdminLectures from "./pages/admin/AdminLectures";
import AdminSettings from "./pages/admin/AdminSettings";
import JoinLecture from "./pages/JoinLecture";

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
      <Route path="/admin/courses/:courseId/enrollment" element={<A><AdminCourseEnrollment /></A>} />
      <Route path="/admin/schedule"                     element={<A><AdminSchedule /></A>} />
      <Route path="/admin/lectures"                     element={<A><AdminLectures /></A>} />
      <Route path="/admin/settings"                     element={<A><AdminSettings /></A>} />
      <Route path="/join/:id" element={<ProtectedRoute allowedRoles={["STUDENT"]}><JoinLecture /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MockDataProvider>
          <AppRoutes />
        </MockDataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
