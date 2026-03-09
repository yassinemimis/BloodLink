import { useState, useEffect, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup,
  Circle, useMap, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin, Building2, Users, Droplets,
  Filter, Locate, Layers, ChevronDown,
  Phone, Clock, X, Navigation,
} from 'lucide-react';
import api from '../services/api';
import { BLOOD_GROUP_LABELS } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import 'leaflet/dist/leaflet.css';

// ─── Types ───────────────────────────────────────────────────
interface BloodStock { id: string; bloodGroup: string; unitsAvailable: number; }
interface Center {
  id: string; name: string; address: string; city: string;
  phone?: string; email?: string; openingHours?: string;
  latitude: number; longitude: number; isActive: boolean;
  bloodStocks?: BloodStock[];
}
interface Donor {
  id: string; firstName: string; lastName: string;
  bloodGroup: string; city?: string;
  latitude?: number; longitude?: number;
  isAvailable: boolean; totalDonations: number;
}

// ─── Fix Leaflet icons ────────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── Custom Icons ─────────────────────────────────────────────
const makeIcon = (color: string, emoji: string) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        background:${color}; color:white; border-radius:50% 50% 50% 0;
        transform:rotate(-45deg); width:36px; height:36px;
        display:flex; align-items:center; justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.3); border:2px solid white;
      ">
        <span style="transform:rotate(45deg); font-size:16px">${emoji}</span>
      </div>`,
    iconSize:   [36, 36],
    iconAnchor: [18, 36],
    popupAnchor:[0, -38],
  });

const ICONS = {
  center:    makeIcon('#dc2626', '🏥'),
  donor:     makeIcon('#2563eb', '🩸'),
  user:      makeIcon('#16a34a', '📍'),
  urgent:    makeIcon('#ea580c', '🚨'),
};

// ─── Distance helper ──────────────────────────────────────────
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── FlyTo helper ─────────────────────────────────────────────
function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 14, { duration: 1.2 });
  }, [target, map]);
  return null;
}

// ─── User Location ────────────────────────────────────────────
function LocationMarker({
  onLocated, radius,
}: { onLocated: (pos: [number, number]) => void; radius: number }) {
  const [pos, setPos] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    map.locate({ setView: true, maxZoom: 12 });
    map.on('locationfound', (e) => {
      const p: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPos(p);
      onLocated(p);
    });
  }, [map]);

  return pos ? (
    <>
      <Marker position={pos} icon={ICONS.user}>
        <Popup><b>📍 Votre position</b></Popup>
      </Marker>
      <Circle
        center={pos} radius={radius * 1000}
        pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.06, dashArray: '6' }}
      />
    </>
  ) : null;
}

// ─── Click handler ────────────────────────────────────────────
function MapClickHandler({ onClick }: { onClick: (latlng: [number, number]) => void }) {
  useMapEvents({ click: (e) => onClick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

// ─── Stock bar ────────────────────────────────────────────────
function StockBar({ units }: { units: number }) {
  const pct = Math.min(100, (units / 30) * 100);
  const color = units < 5 ? '#dc2626' : units < 15 ? '#f59e0b' : '#16a34a';
  return (
    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 6, width: '100%', marginTop: 2 }}>
      <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function MapPage() {
  const { user } = useAuthStore();

  const [centers,    setCenters]    = useState<Center[]>([]);
  const [donors,     setDonors]     = useState<Donor[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [userPos,    setUserPos]    = useState<[number, number] | null>(null);
  const [flyTarget,  setFlyTarget]  = useState<[number, number] | null>(null);

  // Filters
  const [showCenters,  setShowCenters]  = useState(true);
  const [showDonors,   setShowDonors]   = useState(true);
  const [bloodFilter,  setBloodFilter]  = useState('');
  const [radius,       setRadius]       = useState(25);
  const [onlyAvail,    setOnlyAvail]    = useState(false);
  const [showFilters,  setShowFilters]  = useState(false);

  // Selected panel
  const [selected, setSelected] = useState<{ type: 'center' | 'donor'; data: any } | null>(null);

  // Load data
  useEffect(() => {
    Promise.all([
      api.get('/centers', { params: { limit: 100 } }),
      api.get('/users/donors', { params: { limit: 200 } }),
    ]).then(([cRes, dRes]) => {
      setCenters(cRes.data.data || []);
      setDonors(dRes.data.data  || []);
    }).finally(() => setLoading(false));
  }, []);

  // Filtered donors — only those with coordinates + optional filters
  const filteredDonors = donors.filter((d) => {
    if (!d.latitude || !d.longitude) return false;
    if (onlyAvail && !d.isAvailable)  return false;
    if (bloodFilter && d.bloodGroup !== bloodFilter) return false;
    if (userPos) {
      const dist = distanceKm(userPos[0], userPos[1], d.latitude, d.longitude);
      if (dist > radius) return false;
    }
    return true;
  });

  const filteredCenters = centers.filter((c) => {
    if (bloodFilter && c.bloodStocks) {
      return c.bloodStocks.some(
        (s) => s.bloodGroup === bloodFilter && s.unitsAvailable > 0,
      );
    }
    return true;
  });

  const stats = {
    centers: filteredCenters.length,
    donors:  filteredDonors.length,
    avail:   filteredDonors.filter((d) => d.isAvailable).length,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 relative">

      {/* ── Top Bar ── */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800
                      px-4 py-3 flex items-center gap-3 flex-wrap z-20 relative">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">🗺️ Carte interactive</h1>
          <p className="text-xs text-gray-500">
            {stats.centers} centres · {stats.donors} donneurs ({stats.avail} disponibles)
          </p>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Layers toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setShowCenters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${showCenters ? 'bg-red-500 text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              <Building2 className="w-3.5 h-3.5" /> Centres
            </button>
            <button
              onClick={() => setShowDonors((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                ${showDonors ? 'bg-blue-500 text-white' : 'text-gray-500 dark:text-gray-400'}`}>
              <Users className="w-3.5 h-3.5" /> Donneurs
            </button>
          </div>

          {/* Filters button */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
              ${showFilters
                ? 'bg-blood-600 text-white border-blood-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'}`}>
            <Filter className="w-4 h-4" />
            Filtres
            {(bloodFilter || onlyAvail) && (
              <span className="w-2 h-2 bg-yellow-400 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* ── Filters Panel ── */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800
                        px-4 py-3 flex flex-wrap gap-4 items-end z-20 relative">
          {/* Blood group */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Groupe sanguin</label>
            <select
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
              className="input-field text-sm py-1.5 w-40">
              <option value="">Tous</option>
              {Object.entries(BLOOD_GROUP_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Radius */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Rayon: <b>{radius} km</b>
            </label>
            <input type="range" min={5} max={100} step={5} value={radius}
              onChange={(e) => setRadius(+e.target.value)}
              className="w-36 accent-blood-600" />
          </div>

          {/* Only available */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={onlyAvail}
              onChange={(e) => setOnlyAvail(e.target.checked)}
              className="w-4 h-4 accent-blood-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Disponibles seulement</span>
          </label>

          {/* Reset */}
          {(bloodFilter || onlyAvail || radius !== 25) && (
            <button
              onClick={() => { setBloodFilter(''); setOnlyAvail(false); setRadius(25); }}
              className="flex items-center gap-1 text-xs text-blood-600 hover:text-blood-700">
              <X className="w-3.5 h-3.5" /> Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* ── Map + Side Panel ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Map */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center
                            justify-center z-30">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blood-600 border-t-transparent" />
            </div>
          )}

          <MapContainer
            center={[36.752887, 3.042048]} zoom={10}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}>

            {/* Tile Layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FlyTo target={flyTarget} />
            <LocationMarker onLocated={setUserPos} radius={radius} />
            <MapClickHandler onClick={() => setSelected(null)} />

            {/* Centers */}
            {showCenters && filteredCenters.map((c) => (
              <Marker key={c.id} position={[c.latitude, c.longitude]} icon={ICONS.center}
                eventHandlers={{ click: () => setSelected({ type: 'center', data: c }) }}>
                <Popup maxWidth={280}>
                  <div className="min-w-[240px] font-sans">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🏥</span>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.city}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">📍 {c.address}</p>
                    {c.phone       && <p className="text-xs text-gray-600 mb-1">📞 {c.phone}</p>}
                    {c.openingHours && <p className="text-xs text-gray-600 mb-2">🕐 {c.openingHours}</p>}
                    {userPos && (
                      <p className="text-xs text-blue-600 mb-2">
                        📏 {distanceKm(userPos[0], userPos[1], c.latitude, c.longitude).toFixed(1)} km
                      </p>
                    )}
                    {c.bloodStocks && c.bloodStocks.length > 0 && (
                      <div className="mt-2 border-t pt-2">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Stocks :</p>
                        <div className="space-y-1">
                          {c.bloodStocks.slice(0, 6).map((s) => (
                            <div key={s.id} className="flex items-center gap-2">
                              <span className="text-xs font-bold w-12 text-gray-700">
                                {BLOOD_GROUP_LABELS[s.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}
                              </span>
                              <div className="flex-1"><StockBar units={s.unitsAvailable} /></div>
                              <span className={`text-xs font-bold w-8 text-right
                                ${s.unitsAvailable < 5 ? 'text-red-600' : s.unitsAvailable < 15 ? 'text-yellow-600' : 'text-green-600'}`}>
                                {s.unitsAvailable}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Donors */}
            {showDonors && filteredDonors.map((d) => (
              <Marker key={d.id}
                position={[d.latitude!, d.longitude!]}
                icon={d.isAvailable ? ICONS.donor : makeIcon('#9ca3af', '🩸')}
                eventHandlers={{ click: () => setSelected({ type: 'donor', data: d }) }}>
                <Popup>
                  <div className="font-sans min-w-[180px]">
                    <p className="font-bold text-sm">{d.firstName} {d.lastName}</p>
                    <p className="text-xs text-gray-500 mb-1">{d.city || '—'}</p>
                    <p className="text-xs">
                      🩸 {BLOOD_GROUP_LABELS[d.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}
                    </p>
                    <p className="text-xs">
                      {d.isAvailable
                        ? <span className="text-green-600 font-medium">✅ Disponible</span>
                        : <span className="text-gray-400">⏸ Indisponible</span>}
                    </p>
                    <p className="text-xs text-gray-500">{d.totalDonations} don(s)</p>
                    {userPos && (
                      <p className="text-xs text-blue-600 mt-1">
                        📏 {distanceKm(userPos[0], userPos[1], d.latitude!, d.longitude!).toFixed(1)} km
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* ── Zoom Controls custom ── */}
          <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-1">
            <button
              onClick={() => userPos && setFlyTarget([...userPos] as [number, number])}
              className="w-10 h-10 bg-white dark:bg-gray-800 shadow-md rounded-lg flex items-center
                         justify-center text-blood-600 hover:bg-blood-50 transition-colors border border-gray-200"
              title="Ma position">
              <Locate className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Side Panel ── */}
        {selected && (
          <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800
                          overflow-y-auto flex-shrink-0 z-10">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800
                            px-4 py-3 flex items-center justify-between">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {selected.type === 'center' ? '🏥 Centre' : '🩸 Donneur'}
              </p>
              <button onClick={() => setSelected(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {selected.type === 'center' && (() => {
                const c: Center = selected.data;
                return (
                  <>
                    <div>
                      <h2 className="font-bold text-gray-900 dark:text-gray-100">{c.name}</h2>
                      <p className="text-sm text-gray-500">{c.city}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 flex-shrink-0" /> {c.address}
                      </div>
                      {c.phone && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Phone className="w-4 h-4 flex-shrink-0" /> {c.phone}
                        </div>
                      )}
                      {c.openingHours && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4 flex-shrink-0" /> {c.openingHours}
                        </div>
                      )}
                      {userPos && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Navigation className="w-4 h-4 flex-shrink-0" />
                          {distanceKm(userPos[0], userPos[1], c.latitude, c.longitude).toFixed(1)} km de vous
                        </div>
                      )}
                    </div>

                    {/* Stocks complets */}
                    {c.bloodStocks && c.bloodStocks.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Stocks de sang
                        </p>
                        <div className="space-y-2">
                          {c.bloodStocks.map((s) => (
                            <div key={s.id}
                              className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-10">
                                {BLOOD_GROUP_LABELS[s.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}
                              </span>
                              <div className="flex-1"><StockBar units={s.unitsAvailable} /></div>
                              <span className={`text-sm font-bold w-8 text-right
                                ${s.unitsAvailable < 5 ? 'text-red-600' : s.unitsAvailable < 15 ? 'text-yellow-600' : 'text-green-600'}`}>
                                {s.unitsAvailable}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => setFlyTarget([c.latitude, c.longitude])}
                      className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                      <Navigation className="w-4 h-4" /> Centrer sur la carte
                    </button>
                  </>
                );
              })()}

              {selected.type === 'donor' && (() => {
                const d: Donor = selected.data;
                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 rounded-full
                                      flex items-center justify-center text-blue-600 font-bold">
                        {d.firstName[0]}{d.lastName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-gray-100">
                          {d.firstName} {d.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{d.city || '—'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blood-50 dark:bg-blood-950 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-blood-700 dark:text-blood-400">
                          {BLOOD_GROUP_LABELS[d.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}
                        </p>
                        <p className="text-xs text-gray-500">Groupe</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                          {d.totalDonations}
                        </p>
                        <p className="text-xs text-gray-500">Dons</p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                      ${d.isAvailable
                        ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-500'}`}>
                      <span>{d.isAvailable ? '✅' : '⏸'}</span>
                      {d.isAvailable ? 'Disponible pour donner' : 'Indisponible'}
                    </div>

                    {userPos && d.latitude && d.longitude && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <Navigation className="w-4 h-4" />
                        {distanceKm(userPos[0], userPos[1], d.latitude, d.longitude).toFixed(1)} km de vous
                      </div>
                    )}

                    <button
                      onClick={() => d.latitude && d.longitude && setFlyTarget([d.latitude, d.longitude])}
                      className="btn-secondary w-full text-sm flex items-center justify-center gap-2">
                      <MapPin className="w-4 h-4" /> Localiser sur la carte
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ── Legend Bar ── */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800
                      px-6 py-2 flex items-center gap-6 flex-wrap z-20">
        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <div className="w-3 h-3 rounded-full bg-green-500" /> Votre position
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <div className="w-3 h-3 rounded-full bg-red-600" /> Centre de collecte
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <div className="w-3 h-3 rounded-full bg-blue-600" /> Donneur disponible
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <div className="w-3 h-3 rounded-full bg-gray-400" /> Donneur indisponible
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <div className="w-3 h-3 rounded-full border-2 border-blood-400 bg-blood-50" />
          Rayon {radius} km
        </div>
      </div>
    </div>
  );
}