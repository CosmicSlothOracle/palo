// API Configuration for KOSGE Frontend

// Environment-based API URL configuration
const getApiBaseUrl = (): string => {
  // Check if we're in development (Vite dev server)
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || 'http://localhost:10000';
  }

  // Production: Use environment variable or default to Render backend
  return import.meta.env.VITE_API_URL || 'https://kosge-backend.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function for authenticated API calls
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<Response> => {
  const url = `${API_BASE_URL}/api${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>
  };

  // Add authentication header if token exists and not skipped
  if (!skipAuth) {
    const token = localStorage.getItem('jwt');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return fetch(url, {
    ...options,
    headers
  });
};

// Specific API endpoints
export const API_ENDPOINTS = {
  // Authentication
  login: '/login',
  verify: '/verify',

  // Events
  events: '/events',
  event: (id: number) => `/events/${id}`,
  updateEvent: (id: number) => `/events/${id}`,
  resetEvent: (id: number) => `/events/${id}/reset`,

  // Participants
  participants: (id: number) => `/events/${id}/participants`,
  addParticipant: (id: number) => `/events/${id}/participants`,
  exportParticipants: (id: number) => `/events/${id}/export`,

  // File Upload
  uploadImage: (id: number) => `/events/${id}/upload`,
  removeImage: (id: number) => `/events/${id}/remove-image`,

  // Health Check
  health: '/health'
} as const;

// Legacy compatibility function for existing code
export const authFetch = (endpoint: string, options: { skipAuth?: boolean } & RequestInit = {}) => {
  const { skipAuth = false, ...fetchOptions } = options;
  return apiCall(endpoint, fetchOptions, skipAuth);
};

export default {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: API_ENDPOINTS,
  call: apiCall,
  authFetch
};