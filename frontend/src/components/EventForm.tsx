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
  const [description, setDescription] = useState(event?.description || '');
  // Pre-populate banner URL with default image if not already set with a custom value
  const [bannerUrl, setBannerUrl] = useState(() => {
    if (event?.banner_url && event?.banner_url !== event?.default_image_url) {
      return event.banner_url; // Keep custom URL if different from default
    }
    return event?.default_image_url || event?.banner_url || '';
  });
  const [uploadedImage, setUploadedImage] = useState(event?.uploaded_image || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }

    if (!event?.id) {
      setError('Event ID ist erforderlich');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const eventData = {
        title: title.trim(),
        description: description.trim(),
        banner_url: bannerUrl,
      };

      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(eventData),
      });

      if (res.ok) {
        const result = await res.json();
        onSave(result.event);
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

  const handleImageUpload = async (file: File) => {
    if (!event?.id) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/events/${event.id}/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setUploadedImage(result.filename);
        // The uploaded image takes priority, so we can show this in preview
      } else {
        alert('Fehler beim Hochladen des Bildes');
      }
    } catch (err) {
      alert('Fehler beim Hochladen des Bildes');
    }
  };

  const handleRemoveImage = async () => {
    if (!event?.id || !uploadedImage) return;

    try {
      const res = await fetch(`/api/events/${event.id}/remove-image`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        setUploadedImage('');
      } else {
        alert('Fehler beim Entfernen des Bildes');
      }
    } catch (err) {
      alert('Fehler beim Entfernen des Bildes');
    }
  };

  // Get display image URL with proper priority logic
  const getDisplayImageUrl = () => {
    // Priority 1: Uploaded image
    if (uploadedImage) {
      return `/uploads/${uploadedImage}`;
    }

    // Priority 2: Custom banner URL (if different from default)
    if (bannerUrl && bannerUrl !== event?.default_image_url) {
      return bannerUrl;
    }

    // Priority 3: Default image URL
    if (event?.default_image_url) {
      return event.default_image_url;
    }

    // Priority 4: Any banner URL
    if (bannerUrl) {
      return bannerUrl;
    }

    return '/uploads/placeholder.png';
  };

  // Check if currently showing default image
  const isShowingDefaultImage = () => {
    return !uploadedImage && (!bannerUrl || bannerUrl === event?.default_image_url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          Event {event?.id} bearbeiten
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
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border border-gray-300 p-2 rounded w-full"
              placeholder="Event-Beschreibung eingeben"
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Bild</label>

            {/* Image Preview */}
            <div className="mb-3">
              <img
                src={getDisplayImageUrl()}
                alt="Preview"
                className="w-full h-32 object-cover rounded"
                style={{ aspectRatio: '4/3' }}
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  (e.target as HTMLImageElement).src = '/uploads/placeholder.png';
                }}
              />
              <div className="mt-1 text-xs text-gray-600">
                {uploadedImage ? (
                  <span className="text-green-600">✓ Zeigt hochgeladenes Bild</span>
                ) : bannerUrl && bannerUrl !== event?.default_image_url ? (
                  <span className="text-blue-600">✓ Zeigt benutzerdefinierte URL</span>
                ) : isShowingDefaultImage() ? (
                  <span className="text-gray-500">✓ Zeigt Standard-Bild für Event {event?.id}</span>
                ) : (
                  <span className="text-gray-400">Zeigt Platzhalter-Bild</span>
                )}
              </div>
            </div>

            {/* Image Upload */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Bild hochladen (bevorzugt)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadedImage && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Hochgeladenes Bild entfernen
                </button>
              )}
            </div>

            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium mb-1">Oder Bild-URL eingeben</label>
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="border border-gray-300 p-2 rounded w-full text-sm"
                placeholder={event?.default_image_url || "https://example.com/image.jpg"}
              />
              <div className="text-xs text-gray-500 mt-1">
                <p>Wird nur verwendet, wenn kein Bild hochgeladen wurde.</p>
                {event?.default_image_url && (
                  <p className="mt-1">
                    <span className="font-medium">Standard-URL für Event {event.id}:</span>{' '}
                    <button
                      type="button"
                      onClick={() => setBannerUrl(event.default_image_url || '')}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Auf Standard zurücksetzen
                    </button>
                  </p>
                )}
              </div>
            </div>
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