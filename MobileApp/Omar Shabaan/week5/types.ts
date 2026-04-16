export interface Course {
    id: string;
    name: string;
    code: string;
    department: string;
    professorId: string;
    creditHours: number;
    studentCount: number;
    color: string;
}

export interface LectureSession {
    location: string;
    id: string;
    courseId: string;
    courseName: string;
    courseCode: string;
    professorId: string;
    startTime: Date;
    endTime: Date;
    room: string;
    isActive: boolean;
    attendeeCount: number;
    totalStudents: number;
    pdfUrl?: string;
    pdfName?: string;
    qrCode?: string;
    quizActive?: boolean;
    quizQuestions?: QuizQuestion[];

    geoEnabled?: boolean;
    centerLat?: number;
    centerLng?: number;
    radiusMeters?: number;
}

export interface AttendanceRecord {
    id: string;
    sessionId: string;
    courseId: string;
    studentId: string;
    studentName: string;
    status: 'present' | 'absent' | 'late';
    timestamp: Date;
}

export interface StudentAttendanceSummary {
    studentId: string;
    studentName: string;
    totalSessions: number;
    attendedSessions: number;
    percentage: number;
    lastStatus: 'present' | 'absent' | 'late';
}

export interface Schedule {
    id: string;
    courseId: string;
    courseName: string;
    courseCode: string;
    professorId: string;
    location: string;
    color: string;
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctIndex: number;
}

export interface QuizResult {
    id: number;
    studentId: string;
    studentName: string;
    sessionId: string;
    courseId: string;
    answers: number[];
    score: number;
    submittedAt: string;
}

export interface StudentLocation {
    studentId: string;
    studentName: string;
    sessionId: string;
    latitude: number;
    longitude: number;
    updatedAt: Date;
    distanceMeters?: number;
    isOutside?: boolean;
}

export const COURSE_COLORS = [
    '#10B981', '#3B82F6', '#F59E0B',
    '#8B5CF6', '#EC4899', '#14B8A6',
];
