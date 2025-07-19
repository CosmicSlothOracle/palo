import React, { useState, useEffect } from 'react';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import UploadForm from './UploadForm';

interface Props {
  event?: Event;
  onSave: (event: Event) => void;
  onCancel: () => void;
}

const EventForm: React.FC<Props> = ({ event, onSave, onCancel }) => {
  const { token } = useAuth();
  const [title, setTitle] = useState(event?.title || '');
  const [bannerUrl, setBannerUrl] = useState(event?.banner_url || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }
    if (!bannerUrl) {
      setError('Banner ist erforderlich');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const eventData = {
        id: event?.id || undefined,
        title: title.trim(),
        banner_url: bannerUrl,
      };

      const url = event ? `/api/events/${event.id}` : '/api/events';
      const method = event ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(eventData),
      });

      if (res.ok) {
        const savedEvent = await res.json();
        // API returns {event: Event} for create, {event: Event} for update
        const event = savedEvent.event || savedEvent;
        onSave(event);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Fehler beim Speichern');
      }
    } catch (err) {
      setError('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {event ? 'Event bearbeiten' : 'Neues Event erstellen'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 font-medium">Titel</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-gray-300 p-2 rounded w-full"
              placeholder="Event-Titel eingeben"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Banner</label>
            {bannerUrl && (
              <img
                src={bannerUrl}
                alt="Banner preview"
                className="w-full h-32 object-cover mb-2 rounded"
              />
            )}
            <UploadForm onUploaded={setBannerUrl} />
          </div>

          {error && (
            <p className="text-red-600 text-sm mb-4">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded"
            >
              {saving ? 'Speichere...' : 'Speichern'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;