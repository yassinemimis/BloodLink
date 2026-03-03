import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Building2, Droplets } from 'lucide-react';
import api from '../services/api';
import type { Center } from '../types';
import { BLOOD_GROUP_LABELS } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const centerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function LocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 13 });
    map.on('locationfound', (e) => {
      setPosition([e.latlng.lat, e.latlng.lng]);
    });
  }, [map]);

  return position ? (
    <>
      <Marker position={position}>
        <Popup>📍 Votre position</Popup>
      </Marker>
      <Circle center={position} radius={25000} pathOptions={{ color: '#DC2626', fillOpacity: 0.05 }} />
    </>
  ) : null;
}

export default function MapPage() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    try {
      const response = await api.get('/centers', { params: { limit: 100 } });
      setCenters(response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Carte interactive</h1>
        <p className="text-gray-500 text-sm mt-1">
          Visualisez les centres de collecte et les donneurs à proximité
        </p>
      </div>

      <div className="card p-0 overflow-hidden" style={{ height: '70vh' }}>
        <MapContainer
          center={[36.752887, 3.042048]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <LocationMarker />

          {centers.map((center) => (
            <Marker
              key={center.id}
              position={[center.latitude, center.longitude]}
              icon={centerIcon}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-bold text-sm mb-1">{center.name}</h3>
                  <p className="text-xs text-gray-600 mb-1">📍 {center.address}</p>
                  {center.openingHours && (
                    <p className="text-xs text-gray-600 mb-1">🕐 {center.openingHours}</p>
                  )}
                  {center.phone && (
                    <p className="text-xs text-gray-600 mb-2">📞 {center.phone}</p>
                  )}

                  {center.bloodStocks && center.bloodStocks.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1">Stock disponible :</p>
                      <div className="grid grid-cols-4 gap-1">
                        {center.bloodStocks.map((stock) => (
                          <div
                            key={stock.id}
                            className={`text-center text-xs p-1 rounded ${
                              stock.unitsAvailable < 5
                                ? 'bg-red-100 text-red-700'
                                : stock.unitsAvailable < 15
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                            }`}
                          >
                            <div className="font-bold">
                              {BLOOD_GROUP_LABELS[stock.bloodGroup]}
                            </div>
                            <div>{stock.unitsAvailable}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Légende</h3>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full" />
            <span className="text-gray-600">Votre position</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full" />
            <span className="text-gray-600">Centre de collecte</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-red-400 rounded-full bg-red-50" />
            <span className="text-gray-600">Rayon de recherche (25 km)</span>
          </div>
        </div>
      </div>
    </div>
  );
}