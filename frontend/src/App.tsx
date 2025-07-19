import React, { useEffect, useState } from 'react';
import EventCard from './components/EventCard';
import ParticipantForm from './components/ParticipantForm';
import { Event } from './types';
import LoginForm from './components/LoginForm';
import DataExport from './components/DataExport';
import EventForm from './components/EventForm';
import BannerManagement from './components/BannerManagement';
import { useAuth } from './context/AuthContext';
import { authFetch } from './context/AuthContext';

const App: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showBannerManagement, setShowBannerManagement] = useState(false);
  const { token, user, logout } = useAuth();

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await authFetch('/api/events', { skipAuth: true });
        const json = await res.json();
        // API is expected to return { events: Event[] } but guard against other shapes
        if (Array.isArray(json?.events)) {
          setEvents(json.events);
        } else if (Array.isArray(json)) {
          // Some environments might return the array directly
          setEvents(json as Event[]);
        } else {
          // Fallback to empty list to avoid runtime errors
          setEvents([]);
        }
      } catch (err) {
        console.error('Failed to load events', err);
      }
    }
    fetchEvents();
  }, []);

  const handleParticipate = (event: Event) => {
    setSelectedEvent(event);
  };

  const handleCloseForm = () => setSelectedEvent(null);

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (event: Event) => {
    if (!confirm(`Event "${event.title}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setEvents(events.filter(e => e.id !== event.id));
      } else {
        alert('Fehler beim Löschen des Events');
      }
    } catch (err) {
      alert('Fehler beim Löschen des Events');
    }
  };

  const handleSaveEvent = (savedEvent: Event) => {
    if (editingEvent) {
      // Update existing event
      setEvents(events.map(e => e.id === savedEvent.id ? savedEvent : e));
    } else {
      // Add new event
      setEvents([...events, savedEvent]);
    }
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleCancelEventForm = () => {
    setShowEventForm(false);
    setEditingEvent(null);
  };

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">KOSGE Events</h1>
        <div>
          {token ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">{user}</span>
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-1 px-3 rounded"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded"
              onClick={() => setShowLogin(true)}
            >
              Admin Login
            </button>
          )}
        </div>
      </header>

      {token && (
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            <button
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
              onClick={handleCreateEvent}
            >
              Neues Event erstellen
            </button>
            <button
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
              onClick={() => setShowBannerManagement(!showBannerManagement)}
            >
              Banner-Management
            </button>
          </div>
          <DataExport />
        </div>
      )}

      {showBannerManagement && (
        <div className="mb-6">
          <BannerManagement />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.length === 0 && (
          <p className="text-gray-500">Keine Events vorhanden. Melde dich als Admin an, um ein neues Event anzulegen.</p>
        )}
        {events.map((ev) => (
          <EventCard
            key={ev.id}
            event={ev}
            onParticipate={() => handleParticipate(ev)}
            onEdit={token ? () => handleEditEvent(ev) : undefined}
            onDelete={token ? () => handleDeleteEvent(ev) : undefined}
          />
        ))}
      </div>

      {selectedEvent && (
        <ParticipantForm event={selectedEvent} onClose={handleCloseForm} />
      )}
      {showLogin && <LoginForm onClose={() => setShowLogin(false)} />}
      {showEventForm && (
        <EventForm
          event={editingEvent || undefined}
          onSave={handleSaveEvent}
          onCancel={handleCancelEventForm}
        />
      )}
    </div>
  );
};

export default App;