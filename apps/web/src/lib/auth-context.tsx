'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';
import { MOCK_USERS } from './mock-data';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CLIENT' | 'PROFESSIONAL' | 'ADMIN';
  phone?: string;
  avatarUrl?: string;
  latitude?: number;
  longitude?: number;
  professionalProfile?: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'CLIENT' | 'PROFESSIONAL';
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const DEMO_USER_KEY = 'jonny_demo_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check real token first
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then(setUser)
        .catch(() => {
          api.setToken(null);
          // Check for demo user fallback
          loadDemoUser();
        })
        .finally(() => setLoading(false));
    } else {
      loadDemoUser();
      setLoading(false);
    }
  }, []);

  function loadDemoUser() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(DEMO_USER_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }

  function saveDemoUser(u: User) {
    setUser(u);
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(u));
    }
  }

  const login = async (email: string, password: string) => {
    // Try real API first
    try {
      const res = await api.login(email, password);
      api.setToken(res.accessToken);
      setUser(res.user);
      return;
    } catch {
      // Fallback to demo login
    }

    // Demo mode: check mock users
    const mockUser = MOCK_USERS[email];
    if (mockUser) {
      saveDemoUser(mockUser);
    } else {
      throw new Error('Email non trovata. Prova con client@test.com');
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'CLIENT' | 'PROFESSIONAL';
  }) => {
    // Try real API first
    try {
      const res = await api.register(data);
      api.setToken(res.accessToken);
      setUser(res.user);
      return;
    } catch {
      // Fallback to demo register
    }

    // Demo mode: create a local user
    const demoUser: User = {
      id: `demo-${Date.now()}`,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'CLIENT',
    };
    saveDemoUser(demoUser);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DEMO_USER_KEY);
    }
  };

  const refreshUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      // Keep current user in demo mode
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
