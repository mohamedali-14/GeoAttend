import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';

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
        <Stack.Screen name="professor/ProfessorPanel.tsx" />
        <Stack.Screen name="professor/ProfessorAttendanceScreen.tsx" />
        <Stack.Screen name="professor/ProfessorCoursesScreen.tsx" />
        <Stack.Screen name="professor/ProfessorScheduleScreen.tsx" />
        <Stack.Screen name="professor/ProfessorSessionsScreen.tsx" />
        <Stack.Screen name="student/StudentPanel.tsx" />
        <Stack.Screen name="student/StudentCoursesScreen" />
      </Stack>
    </AuthProvider>
  );
}