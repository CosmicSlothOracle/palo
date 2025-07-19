import React from 'react';
import { Event } from '../types';
import { useAuth } from '../context/AuthContext';

interface Props {
  event: Event;
  onParticipate: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const EventCard: React.FC<Props> = ({ event, onParticipate, onEdit, onDelete }) => {
  const { token } = useAuth();

  return (
    <div className="bg-white shadow rounded overflow-hidden flex flex-col">
      <img
        src={event.banner_url}
        alt={event.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4 flex-1 flex flex-col">
        <h2 className="text-xl font-semibold mb-2 flex-1">{event.title}</h2>

        {token ? (
          // Admin view with edit/delete buttons
          <div className="flex gap-2 mt-4">
            <button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm"
              onClick={onParticipate}
            >
              Teilnehmer anzeigen
            </button>
            {onEdit && (
              <button
                className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-3 rounded text-sm"
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
                Löschen
              </button>
            )}
          </div>
        ) : (
          // Public view with participate button
          <button
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            onClick={onParticipate}
          >
            Teilnehmen
          </button>
        )}
      </div>
    </div>
  );
};

export default EventCard;