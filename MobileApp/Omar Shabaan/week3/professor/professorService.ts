import { db } from '@/firebaseConfig';
import {
    collection, getDocs, addDoc, updateDoc,
    doc, query, where, Timestamp,
} from 'firebase/firestore';
import {
    Course, LectureSession, AttendanceRecord,
    Schedule, StudentAttendanceSummary, COURSE_COLORS,
} from './types';

const safeToDate = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
};

export async function fetchProfessorCourses(professorId: string): Promise<Course[]> {
    const q = query(collection(db, 'courses'), where('professorId', '==', professorId));
    const snap = await getDocs(q);
    return snap.docs.map((d, i) => ({
        id: d.id,
        name: d.data().name || 'Unnamed',
        code: d.data().code || '---',
        department: d.data().department || '',
        professorId: d.data().professorId || '',
        creditHours: d.data().creditHours || 0,
        studentCount: d.data().enrolledStudents?.length || 0,
        color: COURSE_COLORS[i % COURSE_COLORS.length],
    }));
}

export async function fetchActiveSessions(
    professorId: string,
    courses: Course[]
): Promise<LectureSession[]> {
    const q = query(
        collection(db, 'sessions'),
        where('professorId', '==', professorId),
        where('isActive', '==', true)
    );
    const snap = await getDocs(q);

    return Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        const course = courses.find(c => c.id === data.courseId);

        const attQ = query(
            collection(db, 'attendance'),
            where('sessionId', '==', d.id),
            where('status', '==', 'present')
        );
        const attSnap = await getDocs(attQ);

        return {
            id: d.id,
            courseId: data.courseId || '',
            courseName: course?.name || '',
            courseCode: course?.code || '',
            professorId: data.professorId || '',
            startTime: safeToDate(data.startTime),
            endTime: safeToDate(data.endTime),
            room: data.room || '',
            location: data.room || '',
            isActive: data.isActive ?? true,
            attendeeCount: attSnap.size,
            totalStudents: course?.studentCount || 0,
        };
    }));
}

export async function createSession(params: {
    professorId: string;
    professorName: string;
    course: Course;
    startTime: string;
    endTime: string;
    room: string;
    // ── Geo-attendance fields ──
    geoEnabled?: boolean;
    centerLat?: number;
    centerLng?: number;
    radiusMeters?: number;
}): Promise<string> {
    const ref = await addDoc(collection(db, 'sessions'), {
        professorId: params.professorId,
        professorName: params.professorName,
        courseId: params.course.id,
        courseName: params.course.name,
        courseCode: params.course.code,
        startTime: Timestamp.now(),
        endTime: Timestamp.now(),
        room: params.room,
        isActive: true,
        createdAt: Timestamp.now(),
        // Geo-attendance
        geoEnabled: params.geoEnabled ?? false,
        centerLat:  params.centerLat  ?? null,
        centerLng:  params.centerLng  ?? null,
        radiusMeters: params.radiusMeters ?? 50,
    });
    return ref.id;
}

export async function endSession(sessionId: string): Promise<void> {
    await updateDoc(doc(db, 'sessions', sessionId), {
        isActive: false,
        endedAt: Timestamp.now(),
    });
}

export async function fetchAttendanceSummary(
    professorId: string,
    courses: Course[]
): Promise<StudentAttendanceSummary[]> {
    const sessQ = query(collection(db, 'sessions'), where('professorId', '==', professorId));
    const sessSnap = await getDocs(sessQ);
    const sessionIds = sessSnap.docs.map(d => d.id);
    if (sessionIds.length === 0) return [];

    const allRecords: AttendanceRecord[] = [];
    for (let i = 0; i < sessionIds.length; i += 10) {
        const chunk = sessionIds.slice(i, i + 10);
        const attQ = query(collection(db, 'attendance'), where('sessionId', 'in', chunk));
        const attSnap = await getDocs(attQ);
        attSnap.docs.forEach(d => {
            const data = d.data();
            allRecords.push({
                id: d.id,
                sessionId: data.sessionId,
                courseId: data.courseId,
                studentId: data.studentId,
                studentName: data.studentName || 'Unknown',
                status: data.status || 'absent',
                timestamp: safeToDate(data.timestamp),
            });
        });
    }

    const map = new Map<string, StudentAttendanceSummary>();
    allRecords.forEach(r => {
        const ex = map.get(r.studentId);
        if (!ex) {
            map.set(r.studentId, {
                studentId: r.studentId,
                studentName: r.studentName,
                totalSessions: 1,
                attendedSessions: r.status === 'present' ? 1 : 0,
                percentage: 0,
                lastStatus: r.status,
            });
        } else {
            ex.totalSessions += 1;
            if (r.status === 'present') ex.attendedSessions += 1;
            ex.lastStatus = r.status;
        }
    });

    return Array.from(map.values())
        .map(s => ({
            ...s,
            percentage: Math.round((s.attendedSessions / s.totalSessions) * 100),
        }))
        .sort((a, b) => b.percentage - a.percentage);
}

export async function fetchSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
    const q = query(collection(db, 'attendance'), where('sessionId', '==', sessionId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
        id: d.id,
        sessionId: d.data().sessionId,
        courseId: d.data().courseId,
        studentId: d.data().studentId,
        studentName: d.data().studentName || 'Unknown',
        status: d.data().status || 'absent',
        timestamp: safeToDate(d.data().timestamp),
    }));
}

export async function markAttendance(params: {
    sessionId: string;
    courseId: string;
    studentId: string;
    studentName: string;
    status: 'present' | 'absent' | 'late';
}): Promise<void> {
    const q = query(
        collection(db, 'attendance'),
        where('sessionId', '==', params.sessionId),
        where('studentId', '==', params.studentId)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
        await updateDoc(doc(db, 'attendance', snap.docs[0].id), {
            status: params.status,
            updatedAt: Timestamp.now(),
        });
    } else {
        await addDoc(collection(db, 'attendance'), {
            ...params,
            timestamp: Timestamp.now(),
        });
    }
}

export async function fetchProfessorSchedule(
    professorId: string,
    courses: Course[]
): Promise<Schedule[]> {
    const q = query(collection(db, 'schedules'), where('professorId', '==', professorId));
    const snap = await getDocs(q);
    return snap.docs.map((d, i) => {
        const data = d.data();
        const course = courses.find(c => c.id === data.courseId);
        return {
            id: d.id,
            courseId: data.courseId || '',
            courseName: course?.name || '',
            courseCode: course?.code || '',
            professorId: data.professorId || '',
            location: data.location || '',
            color: course?.color || COURSE_COLORS[i % COURSE_COLORS.length],
        };
    });
}

export async function fetchDashboardStats(professorId: string, courses: Course[]) {
    const totalStudents = courses.reduce((s, c) => s + c.studentCount, 0);
    const totalCourses = courses.length;
    const summary = await fetchAttendanceSummary(professorId, courses);
    const avgAttendance = summary.length > 0
        ? Math.round(summary.reduce((s, r) => s + r.percentage, 0) / summary.length)
        : 0;
    return { totalStudents, totalCourses, avgAttendance };
}