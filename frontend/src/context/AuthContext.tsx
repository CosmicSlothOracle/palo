import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiCall, API_ENDPOINTS } from '../config/api';

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
      const res = await apiCall(API_ENDPOINTS.login, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }, true); // Skip auth for login
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
// Updated to use new API configuration
export async function authFetch(input: RequestInfo, init: RequestInit & { skipAuth?: boolean } = {}) {
  const { skipAuth = false, ...restInit } = init;

  // Convert relative URLs to absolute URLs using new backend
  let url: string;
  if (typeof input === 'string') {
    if (input.startsWith('/api/')) {
      // Use new API configuration for relative API calls
      const { authFetch: configAuthFetch } = await import('../config/api');
      return configAuthFetch(input, init);
    }
    url = input;
  } else if (input instanceof Request) {
    url = input.url;
  } else {
    url = input.toString();
  }

  const headers = new Headers(restInit.headers || {});
  if (!skipAuth) {
    const token = localStorage.getItem('jwt');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(url, { ...restInit, headers: Object.fromEntries(headers.entries()) });
}