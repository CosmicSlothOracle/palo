import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authFetch } from '../../context/AuthContext';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Basic Admin Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Authentication Flow', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ token: 'mock-jwt-token', user: 'admin' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password' })
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password' })
      });
    });

    it('should reject invalid credentials', async () => {
      const mockResponse = {
        ok: false,
        json: async () => ({ error: 'Invalid credentials' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'wrong', password: 'wrong' })
      });

      expect(response.ok).toBe(false);
    });
  });

  describe('Event Management Flow', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'jwt') return 'mock-jwt-token';
        if (key === 'user') return 'admin';
        return null;
      });
    });

    it('should fetch events list', async () => {
      const mockEvents = [
        { id: '1', title: 'Test Event', banner_url: '/api/banners/test.png' }
      ];
      const mockResponse = {
        ok: true,
        json: async () => ({ events: mockEvents })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/events', { skipAuth: true });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.events).toEqual(mockEvents);
    });

    it('should create new event', async () => {
      const newEvent = {
        id: '2',
        title: 'New Event',
        banner_url: '/api/banners/new.png',
        created_at: '2024-01-01T00:00:00Z'
      };
      const mockResponse = {
        ok: true,
        json: async () => ({ event: newEvent })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Event',
          banner_url: '/api/banners/new.png'
        })
      });

      expect(response.ok).toBe(true);
      // Check that the request was made with correct headers
      expect(mockFetch).toHaveBeenCalledWith('/api/events', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'authorization': 'Bearer mock-jwt-token'
        }),
        body: JSON.stringify({
          title: 'New Event',
          banner_url: '/api/banners/new.png'
        })
      }));
    });

    it('should update existing event', async () => {
      const updatedEvent = {
        id: '1',
        title: 'Updated Event',
        banner_url: '/api/banners/updated.png',
        updated_at: '2024-01-01T00:00:00Z'
      };
      const mockResponse = {
        ok: true,
        json: async () => ({ event: updatedEvent })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/events/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Event',
          banner_url: '/api/banners/updated.png'
        })
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/events/1', expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'authorization': 'Bearer mock-jwt-token'
        }),
        body: JSON.stringify({
          title: 'Updated Event',
          banner_url: '/api/banners/updated.png'
        })
      }));
    });

    it('should delete event', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/events/1', {
        method: 'DELETE'
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/events/1', expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'authorization': 'Bearer mock-jwt-token'
        })
      }));
    });
  });

  describe('Participant Management Flow', () => {
    it('should add participant to event', async () => {
      const participant = {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message'
      };
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true, participant })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/events/1/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participant),
        skipAuth: true
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/events/1/participants', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json'
        }),
        body: JSON.stringify(participant)
      }));
    });

    it('should list participants for authenticated users', async () => {
      localStorageMock.getItem.mockReturnValue('mock-jwt-token');

      const participants = [
        { name: 'John Doe', email: 'john@example.com', message: 'Test' }
      ];
      const mockResponse = {
        ok: true,
        json: async () => ({ participants })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/events/1/participants', {
        method: 'GET'
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/events/1/participants', expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'authorization': 'Bearer mock-jwt-token'
        })
      }));
    });
  });

  describe('Banner Management Flow', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('mock-jwt-token');
    });

    it('should list banners', async () => {
      const banners = ['/api/banners/banner1.png', '/api/banners/banner2.png'];
      const mockResponse = {
        ok: true,
        json: async () => ({ banners })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/banners', {
        method: 'GET'
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/banners', expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'authorization': 'Bearer mock-jwt-token'
        })
      }));
    });

    it('should upload banner', async () => {
      const uploadData = {
        filename: 'test.png',
        dataBase64: 'dGVzdA=='
      };
      const mockResponse = {
        ok: true,
        json: async () => ({ url: '/api/banners/test.png' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadData)
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/banners', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'authorization': 'Bearer mock-jwt-token'
        }),
        body: JSON.stringify(uploadData)
      }));
    });

    it('should delete banner', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/banners/test.png', {
        method: 'DELETE'
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/banners/test.png', expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'authorization': 'Bearer mock-jwt-token'
        })
      }));
    });
  });

  describe('Data Export Flow', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('mock-jwt-token');
    });

    it('should export participants as JSON', async () => {
      const exportData = {
        event_id: '1',
        title: 'Test Event',
        participants: [
          { name: 'John Doe', email: 'john@example.com' }
        ]
      };
      const mockResponse = {
        ok: true,
        json: async () => exportData
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/events/1/export?fmt=json', {
        method: 'GET'
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/events/1/export?fmt=json', expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'authorization': 'Bearer mock-jwt-token'
        })
      }));
    });

    it('should export participants as CSV', async () => {
      const csvData = 'Event ID,Title,Name,Email,Message,Timestamp\n"1","Test Event","John","john@example.com","","2024-01-01"';
      const mockResponse = {
        ok: true,
        text: async () => csvData,
        headers: {
          get: () => 'text/csv'
        }
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/events/1/export?fmt=csv', {
        method: 'GET'
      });

      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/events/1/export?fmt=csv', expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'authorization': 'Bearer mock-jwt-token'
        })
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      try {
        await authFetch('/api/events', { skipAuth: true });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle 404 errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Event not found' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/events/999', {
        method: 'GET'
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });

    it('should handle 401 unauthorized errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid token' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const response = await authFetch('/api/events', {
        method: 'POST'
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });
});