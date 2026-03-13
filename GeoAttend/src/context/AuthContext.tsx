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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("geo_user");
      return saved ? (JSON.parse(saved) as User) : null;
    } catch (_ignored) {
      return null;
    }
  });
  const [isLoading] = useState(false);

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem("geo_user", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("geo_user");
    localStorage.removeItem("geo_token");
  };

  const updateUser = (u: User) => {
    setUser(u);
    localStorage.setItem("geo_user", JSON.stringify(u));
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
