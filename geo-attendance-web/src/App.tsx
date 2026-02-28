import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";

function StudentDashboard() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0B1120] text-2xl font-bold text-[#00D084]">
      🎓 Welcome to Student Dashboard!
    </div>
  );
}

function DoctorDashboard() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0B1120] text-2xl font-bold text-[#00D084]">
      👨‍🏫 Welcome to Doctor Dashboard!
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* أضفنا مسار صفحة نسيان كلمة المرور هنا */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/doctor" element={<DoctorDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}