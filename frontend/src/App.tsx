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
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await authFetch('/api/events', { skipAuth: true });
      const json = await res.json();
      if (Array.isArray(json?.events)) {
        // Ensure we have exactly 4 events
        const staticEvents = json.events.slice(0, 4);
        while (staticEvents.length < 4) {
          staticEvents.push({
            id: staticEvents.length + 1,
            title: `Event ${staticEvents.length + 1}`,
            description: `Beschreibung für Event ${staticEvents.length + 1}`,
            banner_url: '',
            participants: []
          });
        }
        setEvents(staticEvents);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error('Failed to load events', err);
    }
  };

  const handleParticipate = (event: Event) => {
    if (token) {
      // Admin view - show participants
      setSelectedEvent(event);
    }
  };

  const handleCloseForm = () => setSelectedEvent(null);

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleSaveEvent = (savedEvent: Event) => {
    // Update the event in the list
    setEvents(events.map(e => e.id === savedEvent.id ? savedEvent : e));
    setShowEventForm(false);
    setEditingEvent(null);
    // Refresh events to get updated data
    fetchEvents();
  };

  const handleCancelEventForm = () => {
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleResetEvent = async (event: Event) => {
    if (!confirm(`Event "${event.title}" wirklich zurücksetzen?`)) return;

    try {
      const res = await fetch(`/api/events/${event.id}/reset`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        fetchEvents(); // Refresh events
      } else {
        alert('Fehler beim Zurücksetzen des Events');
      }
    } catch (err) {
      alert('Fehler beim Zurücksetzen des Events');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">KOSGE Programm</h1>
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

      {/* Static grid of exactly 4 events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
        {events.map((ev) => (
          <EventCard
            key={ev.id}
            event={ev}
            onParticipate={token ? () => handleParticipate(ev) : undefined}
            onEdit={token ? () => handleEditEvent(ev) : undefined}
            onDelete={token ? () => handleResetEvent(ev) : undefined}
          />
        ))}
      </div>

      {/* Modals */}
      {selectedEvent && token && (
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