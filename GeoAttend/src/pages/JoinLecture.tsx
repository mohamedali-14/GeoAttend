import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { ArrowLeft, MapPin, CheckCircle, AlertCircle, Camera } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useMockData } from "../context/MockDataContext";

export default function JoinLecture() {
  const { id } = useParams(); // قراءة ID المحاضرة من الرابط
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lectures } = useMockData();
  
  // البحث عن تفاصيل المحاضرة الحالية
  const lecture = lectures.find((l) => l.id === id);

  const [scanStatus, setScanStatus] = useState<"scanning" | "success" | "error">("scanning");

  // هذه الدالة تعمل تلقائياً عندما تلقط الكاميرا أي كود QR
  const handleScan = (text: string) => {
    if (text && scanStatus === "scanning") {
      // هنا في المستقبل سنرسل الكود للـ Backend للتأكد منه
      // حالياً سنعتبر أي كود يتم مسحه هو كود صحيح لمحاكاة العملية
      setScanStatus("success");
      
      // بعد 3 ثواني من النجاح، نرجعه لصفحة الطالب الرئيسية
      setTimeout(() => {
        navigate("/student");
      }, 3000);
    }
  };

  if (!lecture) {
    return (
      <div className="h-screen bg-[#0B1120] flex items-center justify-center text-white">
        Lecture not found!
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex flex-col items-center justify-center p-4">
      
      {/* شريط علوي بسيط للعودة */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center max-w-lg mx-auto right-0">
        <button 
          onClick={() => navigate(-1)}
          className="bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="font-bold text-slate-300">GeoAttend Scanner</span>
        <div className="w-10"></div> {/* عنصر فارغ لضبط التوسيط */}
      </div>

      <div className="w-full max-w-md bg-[#111827] rounded-2xl border border-slate-800 p-6 shadow-2xl flex flex-col items-center text-center mt-12">
        
        {/* معلومات المحاضرة */}
        <div className="mb-8">
          <div className="bg-[#00D084]/10 text-[#00D084] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-1">{lecture.title}</h2>
          <p className="text-slate-400 text-sm">Scan the QR code displayed by your instructor</p>
        </div>

        {/* منطقة الكاميرا (Scanner) */}
        <div className="w-full relative rounded-xl overflow-hidden border-2 border-slate-700 bg-black aspect-square flex items-center justify-center">
          
          {scanStatus === "scanning" && (
            <Scanner 
              onScan={(result: any) => {
                // المكتبة الجديدة تعيد النتيجة داخل مصفوفة
                if (result && result.length > 0) {
                  handleScan(result[0].rawValue);
                }
              }} 
              onError={(error: any) => {
                // حولنا الخطأ إلى any لكي يرضى TypeScript
                console.log(error?.message || "Scanner error");
              }}
            />
          )}

          {scanStatus === "success" && (
            <div className="absolute inset-0 bg-[#00D084]/90 flex flex-col items-center justify-center animate-in fade-in duration-300">
              <CheckCircle className="w-20 h-20 text-white mb-4" />
              <h3 className="text-2xl font-bold text-white">Attendance Recorded!</h3>
              <p className="text-white/80 mt-2">Redirecting you...</p>
            </div>
          )}

          {/* خط وهمي يتحرك لمحاكاة شكل المسح */}
          {scanStatus === "scanning" && (
            <div className="absolute top-0 left-0 w-full h-1 bg-[#00D084] animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_15px_#00D084]"></div>
          )}
        </div>

        {/* ملاحظة للطالب */}
        <p className="mt-6 text-sm text-slate-500 flex items-center justify-center gap-2">
          <Camera className="w-4 h-4" />
          Camera permission is required
        </p>
      </div>
    </div>
  );
}