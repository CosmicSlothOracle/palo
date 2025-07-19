import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthState {
  token: string | null;
  user: string | null;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const defaultCtx: AuthContextValue = {
  token: null,
  user: null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login: async (_u: string, _p: string) => false,
  logout: () => {},
};

const AuthContext = createContext<AuthContextValue>(defaultCtx);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jwt'));
  const [user, setUser] = useState<string | null>(() => localStorage.getItem('user'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('jwt', token);
    } else {
      localStorage.removeItem('jwt');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', user);
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (res.ok && json.token) {
        setToken(json.token);
        setUser(json.user || username);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    // Force a full page reload & return to landing page after logout
    window.location.href = '/';
  };

  return <AuthContext.Provider value={{ token, user, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

// Helper fetch wrapper that automatically attaches Authorization header if token exists
export async function authFetch(input: RequestInfo, init: RequestInit & { skipAuth?: boolean } = {}) {
  const { skipAuth, ...restInit } = init;
  const headers = new Headers(restInit.headers || {});
  if (!skipAuth) {
    const token = localStorage.getItem('jwt');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return fetch(input, { ...restInit, headers: Object.fromEntries(headers.entries()) });
}