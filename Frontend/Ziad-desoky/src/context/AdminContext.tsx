import { createContext, useContext, useState, type ReactNode } from 'react'
import type { User, UserRole } from './AuthContext'

export interface Lecture {
  id: string
  title: string
  doctorId: string
  doctorName: string
  department: string
  scheduledAt: string
  duration: number
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  studentsCount: number
}

interface AdminContextType {
  users: User[]
  lectures: Lecture[]
  banUser: (userId: string) => void
  unbanUser: (userId: string) => void
  makeAdmin: (userId: string) => void
  removeAdmin: (userId: string) => void
  changeRole: (userId: string, role: UserRole) => void
  addLecture: (lecture: Omit<Lecture, 'id'>) => void
  editLecture: (id: string, data: Partial<Lecture>) => void
  deleteLecture: (id: string) => void
  setLectureDuration: (id: string, duration: number) => void
}

const AdminContext = createContext<AdminContextType | null>(null)

const FALLBACK_USERS: User[] = [
  { id: '3', firstName: 'Admin',   lastName: 'User',    email: 'admin@geo.com',    password: '123456', role: 'ADMIN',   isBanned: false },
  { id: '4', firstName: 'Mohamed', lastName: 'Khaled',  email: 'm.khaled@geo.com', password: '123456', role: 'STUDENT', department: 'Computer Science', studentID: '20240042', isBanned: false },
  { id: '5', firstName: 'Nour',    lastName: 'Ibrahim', email: 'nour@geo.com',     password: '123456', role: 'DOCTOR',  department: 'Mathematics', isBanned: false },
]

const MOCK_LECTURES: Lecture[] = [
  { id: 'l1', title: 'Introduction to CS',  doctorId: '5', doctorName: 'Dr. Nour Ibrahim', department: 'Computer Science', scheduledAt: '10:00 AM', duration: 120, status: 'ACTIVE',    studentsCount: 45 },
  { id: 'l2', title: 'Data Structures',     doctorId: '5', doctorName: 'Dr. Nour Ibrahim', department: 'Computer Science', scheduledAt: '02:00 PM', duration: 90,  status: 'SCHEDULED', studentsCount: 0  },
]

function loadUsers(): User[] {
  try {
    const s = localStorage.getItem('geo_all_users')
    if (s) return JSON.parse(s) as User[]
  } catch (_e) { void _e }
  return FALLBACK_USERS
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [users,    setUsers]    = useState<User[]>(loadUsers)
  const [lectures, setLectures] = useState<Lecture[]>(MOCK_LECTURES)

  const banUser     = (id: string) => setUsers(u => u.map(x => x.id === id ? { ...x, isBanned: true  } : x))
  const unbanUser   = (id: string) => setUsers(u => u.map(x => x.id === id ? { ...x, isBanned: false } : x))
  const makeAdmin   = (id: string) => setUsers(u => u.map(x => x.id === id ? { ...x, role: 'ADMIN'  } : x))
  const removeAdmin = (id: string) => setUsers(u => u.map(x => x.id === id ? { ...x, role: 'DOCTOR' } : x))
  const changeRole  = (id: string, role: UserRole) => setUsers(u => u.map(x => x.id === id ? { ...x, role } : x))

  const addLecture        = (l: Omit<Lecture, 'id'>)     => setLectures(prev => [...prev, { ...l, id: Date.now().toString() }])
  const editLecture       = (id: string, d: Partial<Lecture>) => setLectures(prev => prev.map(l => l.id === id ? { ...l, ...d } : l))
  const deleteLecture     = (id: string)                  => setLectures(prev => prev.filter(l => l.id !== id))
  const setLectureDuration= (id: string, duration: number)=> setLectures(prev => prev.map(l => l.id === id ? { ...l, duration } : l))

  return (
    <AdminContext.Provider value={{ users, lectures, banUser, unbanUser, makeAdmin, removeAdmin, changeRole, addLecture, editLecture, deleteLecture, setLectureDuration }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be inside AdminProvider')
  return ctx
}
