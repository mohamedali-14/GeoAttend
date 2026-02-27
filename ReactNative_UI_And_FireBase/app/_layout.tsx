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
      </Stack>
    </AuthProvider>
  );
}