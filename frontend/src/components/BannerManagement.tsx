import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UploadForm from './UploadForm';

interface Banner {
  id: string;
  url: string;
  filename: string;
  uploaded_at: string;
}

const BannerManagement: React.FC = () => {
  const { token } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/banners', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        // The API returns {banners: [urls]} but we need more info
        const bannerUrls = data.banners || [];
        const banners = bannerUrls.map((url: string, index: number) => ({
          id: `banner_${index}`,
          url: url,
          filename: url.split('/').pop() || `banner_${index}.png`,
          uploaded_at: new Date().toISOString(), // API doesn't provide this info
        }));
        setBanners(banners);
      } else {
        setError('Fehler beim Laden der Banner');
      }
    } catch (err) {
      setError('Fehler beim Laden der Banner');
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUploaded = (bannerUrl: string) => {
    // Refresh the banner list after upload
    fetchBanners();
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Banner wirklich löschen?')) return;

    try {
      const banner = banners.find(b => b.id === bannerId);
      if (!banner) return;

      const filename = banner.filename;
      const res = await fetch(`/api/banners/${filename}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setBanners(banners.filter(b => b.id !== bannerId));
      } else {
        setError('Fehler beim Löschen des Banners');
      }
    } catch (err) {
      setError('Fehler beim Löschen des Banners');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Lade Banner...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Banner-Management</h3>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h4 className="font-medium mb-2">Neues Banner hochladen</h4>
        <UploadForm onUploaded={handleBannerUploaded} />
      </div>

      <div>
        <h4 className="font-medium mb-2">Vorhandene Banner</h4>
        {banners.length === 0 ? (
          <p className="text-gray-500">Keine Banner vorhanden</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((banner) => (
              <div key={banner.id} className="border rounded-lg p-3">
                <img
                  src={banner.url}
                  alt={banner.filename}
                  className="w-full h-32 object-cover rounded mb-2"
                />
                <p className="text-sm text-gray-600 mb-2">{banner.filename}</p>
                <p className="text-xs text-gray-500 mb-2">
                  {new Date(banner.uploaded_at).toLocaleDateString('de-DE')}
                </p>
                <button
                  onClick={() => handleDeleteBanner(banner.id)}
                  className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm"
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerManagement;