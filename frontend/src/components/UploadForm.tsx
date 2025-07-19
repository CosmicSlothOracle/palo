import React, { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onUploaded: (bannerUrl: string) => void;
}

const MAX_SIZE_MB = 5;

const UploadForm: React.FC<Props> = ({ onUploaded }) => {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Datei zu groß (max. ${MAX_SIZE_MB} MB)`);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.png')) {
      setError('Nur PNG-Dateien erlaubt');
      return;
    }

    setError('');
    setUploading(true);

    // Convert file to base64 for Netlify function compatibility
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result?.toString().split(',')[1];
        if (!base64) {
          setError('Fehler beim Lesen der Datei');
          return;
        }

        const res = await fetch('/api/banners', {
          method: 'POST',
          body: JSON.stringify({
            filename: file.name,
            dataBase64: base64
          }),
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
        });
              const json = await res.json();
        if (res.ok) {
          onUploaded(json.url);
        } else {
          setError(json.error || 'Upload fehlgeschlagen');
        }
      } catch (err) {
        setError('Upload fehlgeschlagen');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setError('Fehler beim Lesen der Datei');
      setUploading(false);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="block mb-2 font-medium">Banner hochladen (PNG ≤ 5 MB)</label>
      <input
        type="file"
        accept="image/png"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="border border-gray-300 p-2 rounded w-full"
      />
      {uploading && <p className="text-sm mt-2">Lade hoch...</p>}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
};

export default UploadForm;