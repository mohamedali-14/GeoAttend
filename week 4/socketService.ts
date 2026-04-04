import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (userId: string, sessionId: string, serverUrl: string) => {
  if (socket?.connected) {
    console.log('✅ Socket already connected');
    return socket;
  }

  socket = io(serverUrl, {
    transports: ['websocket'],
    query: { userId, role: 'student', sessionId },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('✅ Socket connected'));
  socket.on('connect_error', (err) => console.log('❌ Socket error:', err.message));
  socket.on('disconnect', (reason) => console.log('🔌 Socket disconnected:', reason));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket manually disconnected');
  }
};

// دوال إرسال الأحداث (Task 1)
export const emitAttendanceConfirmed = (sessionId: string, studentId: string, studentName: string) => {
  socket?.emit('student_confirm_attendance', { sessionId, studentId, studentName });
};

export const emitLocationUpdate = (location: { latitude: number; longitude: number }) => {
  socket?.emit('student_location_update', location);
};
