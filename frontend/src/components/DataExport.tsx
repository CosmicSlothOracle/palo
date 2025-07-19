import React, { useEffect, useState } from 'react';
import { Event } from '../types';
import { authFetch } from '../context/AuthContext';

const DataExport: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await authFetch('/api/events', { skipAuth: true });
        const json = await res.json();
        setEvents(json.events);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }
    fetchEvents();
  }, []);

  const handleDownload = async (fmt: 'csv' | 'json') => {
    if (!selectedId) return;
    try {
      const res = await authFetch(`/api/events/${selectedId}/export?fmt=${fmt}`, {
        method: 'GET',
      });
      if (!res.ok) throw new Error('Export failed');
      if (fmt === 'csv') {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event_${selectedId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event_${selectedId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert('Export fehlgeschlagen');
    }
  };

  return (
    <div className="border p-4 rounded bg-gray-50">
      <h3 className="font-semibold mb-2">Teilnehmer exportieren</h3>
      <select
        className="border p-2 rounded w-full mb-3"
        value={selectedId ?? ''}
        onChange={(e) => setSelectedId(e.target.value)}
      >
        <option value="" disabled>
          Event wählen
        </option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.title}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <button
          className="bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded disabled:opacity-50"
          disabled={!selectedId}
          onClick={() => handleDownload('csv')}
        >
          CSV
        </button>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded disabled:opacity-50"
          disabled={!selectedId}
          onClick={() => handleDownload('json')}
        >
          JSON
        </button>
      </div>
    </div>
  );
};

export default DataExport;