import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import StudentDashboard from "./pages/StudentDashboard";


function DoctorDashboard() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0B1120] text-2xl font-bold text-[#00D084]">
      👨‍🏫 Welcome to Doctor Dashboard!
    </div>
  );
}

// أضفنا صفحة الإدمن الجديدة هنا
function AdminDashboard() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0B1120] text-2xl font-bold text-blue-500">
      🛡️ Welcome to System Admin Dashboard!
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/doctor" element={<DoctorDashboard />} />
        {/* أضفنا مسار الإدمن هنا */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
