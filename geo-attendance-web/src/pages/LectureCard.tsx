import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, User } from 'lucide-react';

// تعريف شكل البيانات كما هو مطلوب في الـ PDF بالضبط
interface Lecture {
  _id: string;
  title: string;
  doctor: { name: string };
  scheduledAt: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

interface LectureCardProps {
  lecture: Lecture;
}

// ألوان الحالات المطلوبة في المشروع
const statusColors = {
  SCHEDULED: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
  ACTIVE: 'bg-[#00D084]/20 text-[#00D084] border-[#00D084]/30',
  COMPLETED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function LectureCard({ lecture }: LectureCardProps) {
  const navigate = useNavigate();
  
  // التحقق من حالة المحاضرة
  const isActive = lecture.status === 'ACTIVE';
  const isJoinable = isActive || lecture.status === 'SCHEDULED';

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-all shadow-md flex flex-col justify-between">
      
      {/* الجزء العلوي: العنوان والحالة */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <h3 className="text-lg font-bold text-white leading-tight">
          {lecture.title}
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[lecture.status]}`}>
          {lecture.status}
        </span>
      </div>

      {/* الجزء الأوسط: تفاصيل الدكتور والوقت */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <User className="w-4 h-4 text-slate-500" />
          <span>{lecture.doctor.name}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>{lecture.scheduledAt}</span>
        </div>
      </div>

      {/* الجزء السفلي: زر التفاعل */}
      <button 
        disabled={!isJoinable}
        onClick={() => isActive && navigate(`/join/${lecture._id}`)}
        className={`w-full py-2.5 rounded-lg font-semibold transition-colors border flex items-center justify-center gap-2
          ${isActive 
            ? 'bg-[#00D084] hover:bg-[#00B070] text-gray-900 border-transparent shadow-[0_0_15px_rgba(0,208,132,0.3)]' 
            : isJoinable 
              ? 'bg-[#1E293B] hover:bg-slate-700 text-white border-slate-700'
              : 'bg-[#1E293B]/30 text-slate-600 border-transparent cursor-not-allowed'
          }
        `}
      >
        {isActive ? (
          <>
            <MapPin className="w-4 h-4" />
            Join Now
          </>
        ) : isJoinable ? (
          'View Details'
        ) : (
          'Not Available'
        )}
      </button>

    </div>
  );
}