import React, { useState } from 'react';
import { Event } from '../types';
import { authFetch } from '../context/AuthContext';

interface Props {
  event: Event;
  onClose: () => void;
}

const ParticipantForm: React.FC<Props> = ({ event, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/events/${event.id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, message }),
        skipAuth: true,
      });
      if (res.ok) {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Failed to submit participation', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        {success ? (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Danke für deine Teilnahme!</h2>
            <button
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              onClick={onClose}
            >
              Schließen
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-4">Teilnahme an „{event.title}“</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded p-2"
                required
              />
              <input
                type="email"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded p-2"
                required
              />
              <textarea
                placeholder="Nachricht (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full border border-gray-300 rounded p-2"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded"
                  onClick={onClose}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
                >
                  {submitting ? 'Sende...' : 'Teilnehmen'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ParticipantForm;