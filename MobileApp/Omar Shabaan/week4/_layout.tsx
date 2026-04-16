import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_LOCATION_TASK } from './professor/geoService';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) {
        console.error('Background location error:', error.message);
        return;
    }

    const locations = data?.locations ?? [];
    if (locations.length === 0) return;

    const { latitude, longitude } = locations[locations.length - 1].coords;

    const studentId  = (global as any).__geotrack_studentId;
    const studentName = (global as any).__geotrack_studentName;
    const sessionId  = (global as any).__geotrack_sessionId;

    if (!studentId || !sessionId) return;

    await setDoc(
        doc(db, 'studentLocations', `${studentId}_${sessionId}`),
        {
            studentId,
            studentName: studentName ?? 'Unknown',
            sessionId,
            latitude,
            longitude,
            updatedAt: Timestamp.now(),
        },
        { merge: true },
    );
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="RoleSelectionScreen" />
        <Stack.Screen name="LoginScreen" />
        <Stack.Screen name="RegisterScreen" />
        <Stack.Screen name="ProfileScreen" />
        <Stack.Screen name="admin/AdminPanel" />
        <Stack.Screen name="admin/AdminUsersScreen" />
        <Stack.Screen name="admin/AdminCoursesScreen" />
        <Stack.Screen name="admin/AdminScheduleScreen" />
        <Stack.Screen name="professor/ProfessorPanel" />
        <Stack.Screen name="professor/ProfessorAttendanceScreen" />
        <Stack.Screen name="professor/ProfessorCoursesScreen" />
        <Stack.Screen name="professor/ProfessorScheduleScreen" />
        <Stack.Screen name="professor/ProfessorSessionsScreen" />
        <Stack.Screen name="professor/ProfessorMaterialsScreen" />
        <Stack.Screen name="student/StudentPanel" />
        <Stack.Screen name="student/StudentCoursesScreen" />
        <Stack.Screen name="student/StudentQRScanner.tsx" />
        <Stack.Screen name="student/StudentQuizScreen" />
        <Stack.Screen name='EditProfileScreen' />
        <Stack screenOptions={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}