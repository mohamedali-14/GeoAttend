/**
 * AuthContext — uses sessionStorage for auth state
 * sessionStorage is per-tab, so each tab can have a different logged-in user
 * localStorage is used ONLY for app data (sessions, courses, etc.), NOT for auth
 */
import { createContext, useContext, useState, type ReactNode } from "react";

export type UserRole = "STUDENT" | "DOCTOR" | "ADMIN";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gmail?: string;
  password?: string;
  role: UserRole;
  department?: string;
  studentID?: string;
  isBanned?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── helpers: use sessionStorage (per-tab) not localStorage ─────────────────
const SESSION_KEY = "geo_user_session";

function readUser(): User | null {
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    return s ? (JSON.parse(s) as User) : null;
  } catch {
    return null;
  }
}

function writeUser(u: User | null) {
  if (u) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readUser());
  const [isLoading]     = useState(false);

  const login = (u: User) => {
    setUser(u);
    writeUser(u);
  };

  const logout = () => {
    setUser(null);
    writeUser(null);
    // Also clear the auth token from localStorage
    localStorage.removeItem("geo_token");
  };

  const updateUser = (u: User) => {
    setUser(u);
    writeUser(u);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
