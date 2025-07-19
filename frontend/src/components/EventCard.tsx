import React, { useState } from 'react';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../context/AuthContext';

interface Props {
  event: Event;
  onParticipate?: () => void; // For admin view - show participants
  onEdit?: () => void;
  onDelete?: () => void;
}

const EventCard: React.FC<Props> = ({ event, onParticipate, onEdit, onDelete }) => {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    try {
      const res = await authFetch(`/api/events/${event.id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
        skipAuth: true,
      });

      if (res.ok) {
        setSuccess(true);
        setName('');
        setEmail('');
        setMessage('');
        // Reset success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert('Fehler beim Senden der Teilnahme');
      }
    } catch (err) {
      console.error('Failed to submit participation', err);
      alert('Fehler beim Senden der Teilnahme');
    } finally {
      setSubmitting(false);
    }
  };

  // Get image URL with proper fallback
  const imageUrl = event.display_image_url || event.banner_url || '/uploads/placeholder.png';

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
      {/* Image with 4:3 aspect ratio */}
      <div className="w-full" style={{ aspectRatio: '4/3' }}>
        <img
          src={imageUrl}
          alt={event.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            (e.target as HTMLImageElement).src = '/uploads/placeholder.png';
          }}
        />
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-xl font-bold mb-2">{event.title}</h3>
        {event.description && (
          <p className="text-gray-600 mb-4 text-sm">{event.description}</p>
        )}

        {token ? (
          // Admin view with edit controls
          <div className="mt-auto">
            <div className="flex gap-2 mb-2">
              {onParticipate && (
                <button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
                  onClick={onParticipate}
                >
                  Teilnehmer anzeigen ({event.participants?.length || 0})
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {onEdit && (
                <button
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-3 rounded text-sm"
                  onClick={onEdit}
                >
                  Bearbeiten
                </button>
              )}
              {onDelete && (
                <button
                  className="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded text-sm"
                  onClick={onDelete}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        ) : (
          // Public view with embedded participation form
          <div className="mt-auto">
            {success ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded mb-4">
                <p className="text-sm font-medium">✓ Vielen Dank für Ihre Teilnahme!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Vorname und Nachname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="E-Mail-Adresse"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={submitting}
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Persönliche Nachricht (optional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    disabled={submitting}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !email.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Wird gesendet...' : 'Teilnehmen'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventCard;