import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import apiClient from '../api/client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'supplier';
}

export interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function decodePayload(token: string): User | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));

    // Check expiry
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return {
      id: payload.userId,
      email: payload.email,
      name: payload.name ?? payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const storedToken = localStorage.getItem('token');
    return storedToken ? decodePayload(storedToken) : null;
  });

  // On mount, validate stored token
  useEffect(() => {
    if (token) {
      const decoded = decodePayload(token);
      if (!decoded) {
        // Token expired or invalid — clear it
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, user: userFromResponse } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userFromResponse);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
