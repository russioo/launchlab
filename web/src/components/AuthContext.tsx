"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface User {
  id: string;
  email: string;
  username: string;
  wallet: {
    publicKey: string;
    privateKey?: string;
  };
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, username: string, password: string) => Promise<{ success: boolean; error?: string; wallet?: { publicKey: string; privateKey: string } }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("LAUNCHLAB_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        // Validate session with backend
        validateSession(parsed.id);
      } catch {
        localStorage.removeItem("LAUNCHLAB_user");
      }
    }
    setLoading(false);
  }, []);

  const validateSession = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/user/${userId}`);
      if (!res.ok) {
        // Session invalid
        localStorage.removeItem("LAUNCHLAB_user");
        setUser(null);
      }
    } catch {
      // Keep user logged in offline
    }
  };

  const login = async (emailOrUsername: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Login failed" };
      }

      setUser(data.user);
      localStorage.setItem("LAUNCHLAB_user", JSON.stringify(data.user));
      return { success: true };
    } catch {
      return { success: false, error: "Connection failed" };
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Registration failed" };
      }

      // Don't auto-login, return wallet info for user to save
      return { 
        success: true, 
        wallet: data.user.wallet 
      };
    } catch {
      return { success: false, error: "Connection failed" };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("LAUNCHLAB_user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
