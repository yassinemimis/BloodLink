import { useState, useEffect, useRef } from 'react';
import {
  Building2, MapPin, Phone, Mail, Clock, Droplets,
  PlusCircle, Pencil, Trash2, X, Loader2, Search,
  Plus, Minus, ChevronDown, ChevronUp,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import type { Center, BloodStock } from '../types';
import { Role, BloodGroup, BLOOD_GROUP_LABELS } from '../types';

// Fix leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─────────────────── MAP PICKER ───────────────────
function MapPicker({
  lat, lng, onChange,
}: {
  lat: number; lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  function ClickHandler() {
    useMapEvents({
      click(e) { onChange(e.latlng.lat, e.latlng.lng); },
    });
    return null;
  }
  return (
    <MapContainer
      center={[lat || 36.752, lng || 3.042]}
      zoom={12}
      style={{ height: 220, borderRadius: 12, zIndex: 0 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler />
      {lat && lng && <Marker position={[lat, lng]} />}
    </MapContainer>
  );
}

// ─────────────────── STOCK QUICK CONTROLS ───────────────────
function StockControls({
  centerId, stocks, onUpdated,
}: {
  centerId: string;
  stocks: BloodStock[];
  onUpdated: (centerId: string, updated: BloodStock[]) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const adjust = async (stock: BloodStock, delta: number) => {
    const newVal = Math.max(0, stock.unitsAvailable + delta);
    setLoading(stock.bloodGroup);
    try {
      await api.patch(`/centers/${centerId}/stock`, {
        bloodGroup: stock.bloodGroup,
        units: newVal,
      });
      const updated = stocks.map((s) =>
        s.bloodGroup === stock.bloodGroup ? { ...s, unitsAvailable: newVal } : s,
      );
      onUpdated(centerId, updated);
    } catch {
      toast.error('Erreur mise à jour stock');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {stocks.map((stock) => {
        const color =
          stock.unitsAvailable === 0 ? 'border-red-300 bg-red-50'
          : stock.unitsAvailable < 5  ? 'border-orange-300 bg-orange-50'
          : stock.unitsAvailable < 15 ? 'border-yellow-300 bg-yellow-50'
          : 'border-green-300 bg-green-50';

        const textColor =
          stock.unitsAvailable === 0 ? 'text-red-700'
          : stock.unitsAvailable < 5  ? 'text-orange-700'
          : stock.unitsAvailable < 15 ? 'text-yellow-700'
          : 'text-green-700';

        return (
          <div key={stock.bloodGroup}
            className={`rounded-xl border-2 p-2 flex flex-col items-center gap-1 ${color}`}>
            <span className={`text-xs font-bold ${textColor}`}>
              {BLOOD_GROUP_LABELS[stock.bloodGroup as BloodGroup]}
            </span>
            <span className={`text-lg font-extrabold leading-none ${textColor}`}>
              {stock.unitsAvailable}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => adjust(stock, -1)}
                disabled={loading === stock.bloodGroup || stock.unitsAvailable === 0}
                className="w-5 h-5 rounded-md bg-white/80 hover:bg-white flex items-center justify-center
                           disabled:opacity-40 transition-colors border border-gray-200"
              >
                {loading === stock.bloodGroup
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Minus className="w-3 h-3" />}
              </button>
              <button
                onClick={() => adjust(stock, 1)}
                disabled={loading === stock.bloodGroup}
                className="w-5 h-5 rounded-md bg-white/80 hover:bg-white flex items-center justify-center
                           disabled:opacity-40 transition-colors border border-gray-200"
              >
                {loading === stock.bloodGroup
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Plus className="w-3 h-3" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────── FORM MODAL ───────────────────
interface CenterForm {
  name: string; address: string; city: string;
  phone: string; email: string; openingHours: string;
  latitude: number; longitude: number;
  stocks: Record<BloodGroup, number>;
}

const defaultStocks = (): Record<BloodGroup, number> =>
  Object.values(BloodGroup).reduce((acc, g) => ({ ...acc, [g]: 0 }), {} as Record<BloodGroup, number>);

function CenterModal({
  center, onClose, onSaved,
}: { center: Center | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!center;

  const [form, setForm] = useState<CenterForm>(() => ({
    name: center?.name || '',
    address: center?.address || '',
    city: center?.city || '',
    phone: center?.phone || '',
    email: center?.email || '',
    openingHours: center?.openingHours || '',
    latitude:  center?.latitude  || 36.752,
    longitude: center?.longitude || 3.042,
    stocks: center?.bloodStocks
      ? center.bloodStocks.reduce((acc, s) => ({
          ...acc, [s.bloodGroup]: s.unitsAvailable,
        }), defaultStocks())
      : defaultStocks(),
  }));

  const [loading, setLoading]           = useState(false);
  const [showStocks, setShowStocks]     = useState(!isEdit);
  const [latInput, setLatInput]         = useState(String(form.latitude));
  const [lngInput, setLngInput]         = useState(String(form.longitude));

  const setCoords = (lat: number, lng: number) => {
    setForm((p) => ({ ...p, latitude: lat, longitude: lng }));
    setLatInput(lat.toFixed(6));
    setLngInput(lng.toFixed(6));
  };

  const handleLatLngBlur = () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);
    if (!isNaN(lat) && !isNaN(lng)) setCoords(lat, lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        // Mise à jour centre
        await api.patch(`/centers/${center!.id}`, {
          name: form.name, address: form.address, city: form.city,
          phone: form.phone, email: form.email,
          openingHours: form.openingHours,
          latitude: form.latitude, longitude: form.longitude,
        });
        // Mise à jour stocks
        await Promise.all(
          Object.entries(form.stocks).map(([bg, units]) =>
            api.patch(`/centers/${center!.id}/stock`, { bloodGroup: bg, units }),
          ),
        );
        toast.success('✅ Centre mis à jour');
      } else {
        // Création centre
        const res = await api.post('/centers', {
          name: form.name, address: form.address, city: form.city,
          phone: form.phone, email: form.email,
          openingHours: form.openingHours,
          latitude: form.latitude, longitude: form.longitude,
        });
        const newId = res.data.center.id;
        // Init stocks
        await Promise.all(
          Object.entries(form.stocks)
            .filter(([, units]) => units > 0)
            .map(([bg, units]) =>
              api.patch(`/centers/${newId}/stock`, { bloodGroup: bg, units }),
            ),
        );
        toast.success('✅ Centre créé');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const f = (k: keyof CenterForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blood-600" />
            {isEdit ? 'Modifier le centre' : 'Nouveau centre'}
          </h2>
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* ── Informations générales ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Informations générales
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input value={form.name} onChange={f('name')} required
                  className="input-field" placeholder="Centre de Transfusion Sanguine - Alger" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                  <input value={form.address} onChange={f('address')} required
                    className="input-field" placeholder="Rue principale" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                  <input value={form.city} onChange={f('city')} required
                    className="input-field" placeholder="Alger" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input value={form.phone} onChange={f('phone')}
                    className="input-field" placeholder="+213 21 XX XX XX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={f('email')}
                    className="input-field" placeholder="centre@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horaires</label>
                <input value={form.openingHours} onChange={f('openingHours')}
                  className="input-field" placeholder="Dim-Jeu: 08h00-16h00" />
              </div>
            </div>
          </div>

          {/* ── Localisation ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              📍 Localisation — cliquer sur la carte
            </h3>

            {/* Map */}
            <div className="rounded-xl overflow-hidden border border-gray-200 mb-3">
              <MapPicker
                lat={form.latitude}
                lng={form.longitude}
                onChange={setCoords}
              />
            </div>

            {/* Lat / Lng inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
                <input
                  type="number" step="any"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  onBlur={handleLatLngBlur}
                  required
                  className="input-field font-mono text-sm"
                  placeholder="36.752887"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
                <input
                  type="number" step="any"
                  value={lngInput}
                  onChange={(e) => setLngInput(e.target.value)}
                  onBlur={handleLatLngBlur}
                  required
                  className="input-field font-mono text-sm"
                  placeholder="3.042048"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              💡 Cliquez directement sur la carte pour définir la position
            </p>
          </div>

          {/* ── Stocks de sang ── */}
          <div>
            <button
              type="button"
              onClick={() => setShowStocks((p) => !p)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blood-500" />
                Stocks de sang initiaux
              </h3>
              {showStocks
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showStocks && (
              <div className="mt-3 grid grid-cols-4 gap-3">
                {Object.values(BloodGroup).map((bg) => {
                  const color =
                    form.stocks[bg] === 0 ? 'border-gray-200'
                    : form.stocks[bg] < 5  ? 'border-orange-400'
                    : form.stocks[bg] < 15 ? 'border-yellow-400'
                    : 'border-green-400';

                  return (
                    <div key={bg}
                      className={`border-2 ${color} rounded-xl p-3 flex flex-col items-center gap-2 bg-white`}>
                      <span className="text-sm font-bold text-gray-800">
                        {BLOOD_GROUP_LABELS[bg]}
                      </span>
                      <div className="flex items-center gap-1">
                        <button type="button"
                          onClick={() => setForm((p) => ({
                            ...p,
                            stocks: { ...p.stocks, [bg]: Math.max(0, p.stocks[bg] - 1) },
                          }))}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <input
                          type="number" min={0}
                          value={form.stocks[bg]}
                          onChange={(e) => setForm((p) => ({
                            ...p,
                            stocks: { ...p.stocks, [bg]: parseInt(e.target.value) || 0 },
                          }))}
                          className="w-12 text-center border border-gray-200 rounded-lg py-1 text-sm font-bold
                                     focus:outline-none focus:border-blood-400"
                        />
                        <button type="button"
                          onClick={() => setForm((p) => ({
                            ...p,
                            stocks: { ...p.stocks, [bg]: p.stocks[bg] + 1 },
                          }))}
                          className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer le centre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────── MAIN PAGE ───────────────────
export default function CentersPage() {
  const { user } = useAuthStore();
  const isAdmin  = user?.role === Role.ADMIN;

  const [centers, setCenters]   = useState<Center[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState<'create' | Center | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadCenters(); }, []);

  const loadCenters = async () => {
    setLoading(true);
    try {
      const res = await api.get('/centers', { params: { limit: 100 } });
      setCenters(res.data.data);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce centre ?')) return;
    setDeleting(id);
    try {
      await api.delete(`/centers/${id}`);
      toast.success('Centre supprimé');
      setCenters((p) => p.filter((c) => c.id !== id));
    } catch {
      toast.error('Erreur suppression');
    } finally {
      setDeleting(null);
    }
  };

  // Mise à jour rapide des stocks depuis la carte principale
  const handleStockUpdated = (centerId: string, updated: BloodStock[]) => {
    setCenters((prev) =>
      prev.map((c) =>
        c.id === centerId ? { ...c, bloodStocks: updated } : c,
      ),
    );
  };

  const filtered = centers.filter((c) =>
    search ? c.city.toLowerCase().includes(search.toLowerCase())
          || c.name.toLowerCase().includes(search.toLowerCase())
    : true,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centres de collecte</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} centres actifs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom ou ville..."
              className="input-field pl-9 w-52 text-sm"
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => setModal('create')}
              className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" /> Nouveau centre
            </button>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blood-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((center) => (
            <div key={center.id} className="card hover:shadow-md transition-shadow">

              {/* ── Top Row ── */}
              <div className="flex items-start gap-4 mb-3">
                <div className="w-11 h-11 bg-blood-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blood-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{center.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{center.address}, {center.city}</span>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal(center)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Modifier">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(center.id)}
                      disabled={deleting === center.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Supprimer">
                      {deleting === center.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Contact Info ── */}
              <div className="flex flex-wrap gap-3 mb-4 text-sm">
                {center.phone && (
                  <a href={`tel:${center.phone}`}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-blood-600 transition-colors">
                    <Phone className="w-3.5 h-3.5" /> {center.phone}
                  </a>
                )}
                {center.email && (
                  <a href={`mailto:${center.email}`}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-blood-600 transition-colors">
                    <Mail className="w-3.5 h-3.5" /> {center.email}
                  </a>
                )}
                {center.openingHours && (
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Clock className="w-3.5 h-3.5" /> {center.openingHours}
                  </span>
                )}
              </div>

              {/* ── Stocks Section ── */}
              {center.bloodStocks && center.bloodStocks.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === center.id ? null : center.id)}
                    className="flex items-center justify-between w-full mb-2 group"
                  >
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blood-500" />
                      <span className="text-sm font-medium text-gray-700">Stocks de sang</span>
                      {isAdmin && (
                        <span className="text-xs text-blood-500 font-medium">
                          — cliquer +/- pour ajuster
                        </span>
                      )}
                    </div>
                    {expanded === center.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {expanded === center.id && (
                    isAdmin ? (
                      /* Admin: avec boutons +/- */
                      <StockControls
                        centerId={center.id}
                        stocks={center.bloodStocks}
                        onUpdated={handleStockUpdated}
                      />
                    ) : (
                      /* Autres: lecture seule */
                      <div className="grid grid-cols-4 gap-2">
                        {center.bloodStocks.map((stock) => {
                          const color =
                            stock.unitsAvailable === 0 ? 'bg-red-50 border-red-200 text-red-700'
                            : stock.unitsAvailable < 5  ? 'bg-orange-50 border-orange-200 text-orange-700'
                            : stock.unitsAvailable < 15 ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                            : 'bg-green-50 border-green-200 text-green-700';
                          return (
                            <div key={stock.bloodGroup}
                              className={`text-center p-2 rounded-lg border ${color}`}>
                              <p className="text-xs font-bold">
                                {BLOOD_GROUP_LABELS[stock.bloodGroup as BloodGroup]}
                              </p>
                              <p className="text-lg font-bold">{stock.unitsAvailable}</p>
                              <p className="text-[10px]">unités</p>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}

                  {/* Summary quand fermé */}
                  {expanded !== center.id && (
                    <div className="flex flex-wrap gap-1.5">
                      {center.bloodStocks.map((stock) => (
                        <span key={stock.bloodGroup}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full
                            ${stock.unitsAvailable === 0 ? 'bg-red-100 text-red-700'
                            : stock.unitsAvailable < 5  ? 'bg-orange-100 text-orange-700'
                            : stock.unitsAvailable < 15 ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'}`}
                        >
                          {BLOOD_GROUP_LABELS[stock.bloodGroup as BloodGroup]} {stock.unitsAvailable}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-2 card text-center py-16">
              <Building2 className="w-14 h-14 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucun centre trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <CenterModal
          center={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={loadCenters}
        />
      )}
    </div>
  );
}