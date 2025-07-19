import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import App from '../../App';

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

// Helper function to render App with AuthProvider
const renderApp = () => {
  return render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

// Mock data
const mockEvents = [
  {
    id: '1',
    title: 'Test Event 1',
    banner_url: '/api/banners/banner1.png',
    created_at: '2024-01-01T00:00:00Z',
    participants: []
  },
  {
    id: '2',
    title: 'Test Event 2',
    banner_url: '/api/banners/banner2.png',
    created_at: '2024-01-02T00:00:00Z',
    participants: []
  }
];

const mockBanners = [
  '/api/banners/banner1.png',
  '/api/banners/banner2.png'
];

describe('Admin Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Login Flow', () => {
    it('should show login button when not authenticated', () => {
      renderApp();
      expect(screen.getByText('Admin Login')).toBeInTheDocument();
    });

    it('should open login modal when login button is clicked', () => {
      renderApp();
      fireEvent.click(screen.getByText('Admin Login'));
      expect(screen.getByText('Admin Login')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Benutzername')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Passwort')).toBeInTheDocument();
    });

    it('should successfully login with valid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'mock-jwt-token', user: 'admin' })
      });

      renderApp();
      fireEvent.click(screen.getByText('Admin Login'));

      fireEvent.change(screen.getByPlaceholderText('Benutzername'), {
        target: { value: 'admin' }
      });
      fireEvent.change(screen.getByPlaceholderText('Passwort'), {
        target: { value: 'password' }
      });
      fireEvent.click(screen.getByText('Anmelden'));

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('should show error on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid credentials' })
      });

      renderApp();
      fireEvent.click(screen.getByText('Admin Login'));

      fireEvent.change(screen.getByPlaceholderText('Benutzername'), {
        target: { value: 'wrong' }
      });
      fireEvent.change(screen.getByPlaceholderText('Passwort'), {
        target: { value: 'wrong' }
      });
      fireEvent.click(screen.getByText('Anmelden'));

      await waitFor(() => {
        expect(screen.getByText('Login fehlgeschlagen')).toBeInTheDocument();
      });
    });
  });

  describe('Event Management Flow', () => {
    beforeEach(() => {
      // Mock authenticated state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'jwt') return 'mock-jwt-token';
        if (key === 'user') return 'admin';
        return null;
      });

      // Mock events API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: mockEvents })
      });
    });

    it('should show admin controls when authenticated', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('Neues Event erstellen')).toBeInTheDocument();
        expect(screen.getByText('Banner-Management')).toBeInTheDocument();
      });
    });

    it('should open event creation form', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Neues Event erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Neues Event erstellen'));

      expect(screen.getByText('Neues Event erstellen')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Event-Titel eingeben')).toBeInTheDocument();
    });

    it('should create new event successfully', async () => {
      const newEvent = {
        id: '3',
        title: 'New Test Event',
        banner_url: '/api/banners/new-banner.png',
        created_at: '2024-01-03T00:00:00Z',
        participants: []
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ events: mockEvents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ event: newEvent })
        });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Neues Event erstellen')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Neues Event erstellen'));

      fireEvent.change(screen.getByPlaceholderText('Event-Titel eingeben'), {
        target: { value: 'New Test Event' }
      });

      // Mock banner upload
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: '/api/banners/new-banner.png' })
      });

      fireEvent.click(screen.getByText('Speichern'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          },
          body: JSON.stringify({
            title: 'New Test Event',
            banner_url: '/api/banners/new-banner.png'
          })
        });
      });
    });

    it('should edit existing event', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ events: mockEvents })
        });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      });

      // Find and click edit button
      const editButtons = screen.getAllByText('Bearbeiten');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Event bearbeiten')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Event 1')).toBeInTheDocument();
      });
    });

    it('should delete event with confirmation', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ events: mockEvents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      });

      // Find and click delete button
      const deleteButtons = screen.getAllByText('Löschen');
      fireEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Event "Test Event 1" wirklich löschen?');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/events/1', {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer mock-jwt-token'
          }
        });
      });

      confirmSpy.mockRestore();
    });
  });

  describe('Banner Management Flow', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'jwt') return 'mock-jwt-token';
        if (key === 'user') return 'admin';
        return null;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ events: mockEvents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ banners: mockBanners })
        });
    });

    it('should open banner management panel', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Banner-Management')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Banner-Management'));

      await waitFor(() => {
        expect(screen.getByText('Banner-Management')).toBeInTheDocument();
        expect(screen.getByText('Neues Banner hochladen')).toBeInTheDocument();
        expect(screen.getByText('Vorhandene Banner')).toBeInTheDocument();
      });
    });

    it('should upload new banner', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ events: mockEvents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ banners: mockBanners })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ url: '/api/banners/new-banner.png' })
        });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Banner-Management')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Banner-Management'));

      await waitFor(() => {
        expect(screen.getByText('Banner hochladen (PNG ≤ 5 MB)')).toBeInTheDocument();
      });

      // Mock file input
      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByLabelText('Banner hochladen (PNG ≤ 5 MB)');

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        result: 'data:image/png;base64,dGVzdA==',
        onload: null,
        onerror: null
      };
      global.FileReader = vi.fn(() => mockFileReader) as any;

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Simulate FileReader onload
      setTimeout(() => {
        mockFileReader.onload?.();
      }, 0);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/banners', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          },
          body: JSON.stringify({
            filename: 'test.png',
            dataBase64: 'dGVzdA=='
          })
        });
      });
    });
  });

  describe('Participant Management Flow', () => {
    it('should allow public users to participate in events', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: mockEvents })
      });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      });

      // Find and click participate button
      const participateButtons = screen.getAllByText('Teilnehmen');
      fireEvent.click(participateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Teilnahme an „Test Event 1"')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('E-Mail')).toBeInTheDocument();
      });
    });

    it('should submit participant form successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ events: mockEvents })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });

      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      });

      const participateButtons = screen.getAllByText('Teilnehmen');
      fireEvent.click(participateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Teilnahme an „Test Event 1"')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText('Name'), {
        target: { value: 'John Doe' }
      });
      fireEvent.change(screen.getByPlaceholderText('E-Mail'), {
        target: { value: 'john@example.com' }
      });
      fireEvent.change(screen.getByPlaceholderText('Nachricht (optional)'), {
        target: { value: 'Test message' }
      });

      fireEvent.click(screen.getByText('Teilnehmen'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/events/1/participants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'John Doe',
            email: 'john@example.com',
            message: 'Test message'
          }),
          skipAuth: true
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Danke für deine Teilnahme!')).toBeInTheDocument();
      });
    });
  });

  describe('Data Export Flow', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'jwt') return 'mock-jwt-token';
        if (key === 'user') return 'admin';
        return null;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ events: mockEvents })
        });
    });

    it('should show export options for authenticated users', async () => {
      renderApp();

      await waitFor(() => {
        const exportElements = screen.getAllByText('Teilnehmer exportieren');
        expect(exportElements.length).toBeGreaterThan(0);
      });
    });

    it('should export data in CSV format', async () => {
      const csvData = 'Event ID,Title,Name,Email,Message,Timestamp\n"1","Test Event 1","John","john@example.com","Test","2024-01-01"';

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ events: mockEvents })
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => csvData,
          headers: {
            get: () => 'text/csv'
          }
        });

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Mock document.createElement for download link
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      renderApp();

      await waitFor(() => {
        const exportElements = screen.getAllByText('Teilnehmer exportieren');
        expect(exportElements.length).toBeGreaterThan(0);
      });

      // Select event
      const select = screen.getByDisplayValue('Event wählen');
      fireEvent.change(select, { target: { value: '1' } });

      // Click CSV export button
      const csvButton = screen.getByText('CSV');
      fireEvent.click(csvButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/events/1/export?fmt=csv', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer mock-jwt-token'
          }
        });
      });
    });
  });

  describe('Logout Flow', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'jwt') return 'mock-jwt-token';
        if (key === 'user') return 'admin';
        return null;
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: mockEvents })
      });
    });

    it('should show logout button when authenticated', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    it('should logout when logout button is clicked', async () => {
      renderApp();

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('jwt');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
      });

      // Should show login button again
      expect(screen.getByText('Admin Login')).toBeInTheDocument();
    });
  });
});