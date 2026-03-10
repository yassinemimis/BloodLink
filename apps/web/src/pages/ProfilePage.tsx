import { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, MapPin, Droplets, Shield, Calendar,
  Award, Edit3, Save, X, Camera, Loader2, ToggleLeft,
  ToggleRight, Lock, Eye, EyeOff, CheckCircle, Clock,
  Crosshair, Heart, Star,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore }  from '../store/useAuthStore';
import { BLOOD_GROUP_LABELS, Role } from '../types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ── Helpers ───────────────────────────────────────────────────
const ROLE_CONFIG = {
  DONOR:   { label: 'Donneur',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',   icon: '🩸' },
  PATIENT: { label: 'Patient',  color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', icon: '🏥' },
  DOCTOR:  { label: 'Médecin',  color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',  icon: '👨‍⚕️' },
  ADMIN:   { label: 'Admin',    color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',       icon: '⚙️' },
};

// ── Section Card ──────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string; icon: any; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100
                    dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="w-7 h-7 bg-blood-100 dark:bg-blood-950 rounded-lg flex items-center justify-center">
          <Icon className="w-3.5 h-3.5 text-blood-600 dark:text-blood-400" />
        </div>
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Field ─────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{value || '—'}</p>
    </div>
  );
}

// ── Stars renderer ────────────────────────────────────────────
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-[${size}px] h-[${size}px] ${i < rounded ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();

  const [profile,       setProfile]       = useState<any>(null);
  const [loading,       setLoading]       = useState(true);
  const [editInfo,      setEditInfo]      = useState(false);
  const [editLocation,  setEditLocation]  = useState(false);
  const [editPassword,  setEditPassword]  = useState(false);
  const [savingInfo,    setSavingInfo]    = useState(false);
  const [savingLoc,     setSavingLoc]     = useState(false);
  const [savingPwd,     setSavingPwd]     = useState(false);
  const [savingAvail,   setSavingAvail]   = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showMap,       setShowMap]       = useState(false);
  const [gpsLoading,    setGpsLoading]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Ratings state
  const [ratingStats, setRatingStats] = useState<{ avg: number; count: number } | null>(null);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Form states
  const [infoForm, setInfoForm] = useState({ phone: '', address: '', city: '' });
  const [locForm,  setLocForm]  = useState({ lat: 0, lng: 0, address: '', city: '' });
  const [pwdForm,  setPwdForm]  = useState({ current: '', next: '', confirm: '' });
  const [showPwd,  setShowPwd]  = useState({ current: false, next: false, confirm: false });

  // ── Load profile ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await api.get(`/users/${user?.id}`);
        setProfile(r.data);
        setInfoForm({ phone: r.data.phone || '', address: r.data.address || '', city: r.data.city || '' });
        setLocForm({ lat: r.data.latitude || 0, lng: r.data.longitude || 0, address: r.data.address || '', city: r.data.city || '' });
        // load rating stats & recent reviews if donor
        if (r.data.role === 'DONOR') {
          fetchRatingStats(r.data.id);
          fetchRecentReviews(r.data.id);
        } else {
          setRatingStats(null);
          setRecentReviews([]);
        }
      } catch {
        toast.error('Erreur chargement profil');
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) load();
  }, [user?.id]);

  // ── Fetch rating stats and reviews ─────────────────────────
  const fetchRatingStats = async (userId: string) => {
    try {
      const res = await api.get(`/ratings/stats/${userId}`);
      setRatingStats(res.data);
    } catch {
      // Fallback: try via /ratings?donorId=... and compute
      try {
        const res2 = await api.get('/ratings', { params: { donorId: userId, limit: 1000 } });
        const arr = res2.data.data || [];
        if (arr.length === 0) { setRatingStats({ avg: 0, count: 0 }); return; }
        const avg = arr.reduce((s: number, r: any) => s + (r.rating || 0), 0) / arr.length;
        setRatingStats({ avg, count: arr.length });
      } catch {
        setRatingStats(null);
      }
    }
  };

  const fetchRecentReviews = async (userId: string) => {
    setReviewsLoading(true);
    try {
      // Expecting backend to return patient info inside each rating (patient.firstName, comment, createdAt, rating)
      const res = await api.get('/ratings', { params: { donorId: userId, limit: 5 } });
      setRecentReviews(res.data.data || []);
    } catch {
      setRecentReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  // ── Avatar upload ─────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image trop grande (max 2 Mo)'); return; }
    setAvatarLoading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post('/users/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile((p: any) => ({ ...p, avatar: res.data.avatar }));
      updateUser({ avatar: res.data.avatar });
      toast.success('Photo mise à jour !');
    } catch {
      toast.error('Erreur upload avatar');
    } finally {
      setAvatarLoading(false);
    }
  };

  // ── Save info ─────────────────────────────────────────────
  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      const res = await api.patch('/users/profile', infoForm);
      setProfile((p: any) => ({ ...p, ...res.data }));
      updateUser(res.data);
      setEditInfo(false);
      toast.success('Profil mis à jour !');
    } catch {
      toast.error('Erreur mise à jour');
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Save location ─────────────────────────────────────────
  const saveLocation = async () => {
    if (!locForm.lat || !locForm.lng) { toast.error('Définissez votre position'); return; }
    setSavingLoc(true);
    try {
      const res = await api.patch('/users/location', {
        latitude: locForm.lat, longitude: locForm.lng,
        address:  locForm.address, city: locForm.city,
      });
      setProfile((p: any) => ({ ...p, ...res.data }));
      updateUser(res.data);
      setEditLocation(false);
      setShowMap(false);
      toast.success('Localisation mise à jour !');
    } catch {
      toast.error('Erreur mise à jour');
    } finally {
      setSavingLoc(false);
    }
  };

  // ── GPS ──────────────────────────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) { toast.error('GPS non supporté'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setShowMap(true);
        toast.success('📍 Position détectée !');
        setGpsLoading(false);
      },
      () => { toast.error('Impossible d\'accéder au GPS'); setGpsLoading(false); },
      { timeout: 8000 },
    );
  };

  // ── Toggle availability ───────────────────────────────────
  const toggleAvailability = async () => {
    setSavingAvail(true);
    try {
      const res = await api.patch('/users/toggle-availability');
      setProfile((p: any) => ({ ...p, isAvailable: res.data.isAvailable }));
      updateUser({ isAvailable: res.data.isAvailable });
      toast.success(res.data.isAvailable ? '✅ Vous êtes disponible' : '⏸️ Vous êtes indisponible');
    } catch {
      toast.error('Erreur');
    } finally {
      setSavingAvail(false);
    }
  };

  // ── Change password ───────────────────────────────────────
  const savePassword = async () => {
    if (pwdForm.next.length < 8) { toast.error('Mot de passe trop court (min 8)'); return; }
    if (pwdForm.next !== pwdForm.confirm) { toast.error('Mots de passe différents'); return; }
    setSavingPwd(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: pwdForm.current,
        newPassword:     pwdForm.next,
      });
      setPwdForm({ current: '', next: '', confirm: '' });
      setEditPassword(false);
      toast.success('Mot de passe modifié !');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Mot de passe actuel incorrect');
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blood-600" />
    </div>
  );

  if (!profile) return null;

  const roleConf  = ROLE_CONFIG[profile.role as keyof typeof ROLE_CONFIG];
  const initials  = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase();
  const joinDate  = new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Hero Card ── */}
      <div className="bg-gradient-to-br from-blood-600 via-blood-700 to-blood-900
                      rounded-3xl p-8 text-white relative overflow-hidden">
        {/* Déco */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center
                            justify-center overflow-hidden border-2 border-white/30">
              {avatarLoading ? (
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              ) : profile.avatar ? (
                <img src={profile.avatar} className="w-full h-full object-cover" alt="avatar" />
              ) : (
                <span className="text-3xl font-black text-white">{initials}</span>
              )}
            </div>
            {/* Camera button */}
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-xl shadow-lg
                         flex items-center justify-center hover:scale-110 transition-transform">
              <Camera className="w-4 h-4 text-blood-600" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Infos principales */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
              <h1 className="text-2xl font-black">
                {profile.firstName} {profile.lastName}
              </h1>
              {profile.isVerified && (
                <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur
                                 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  <CheckCircle className="w-3 h-3" /> Vérifié
                </span>
              )}
            </div>

            <p className="text-blood-200 text-sm mb-3">{profile.email}</p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {/* Role */}
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur
                               px-3 py-1 rounded-full text-sm font-semibold">
                <span>{roleConf.icon}</span> {roleConf.label}
              </span>

              {/* Blood group */}
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur
                               px-3 py-1 rounded-full text-sm font-semibold">
                🩸 {BLOOD_GROUP_LABELS[profile.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}
              </span>

              {/* Rating display (DONOR only) */}
              {profile.role === 'DONOR' && ratingStats && (
                <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur
                                 px-3 py-1 rounded-full text-sm font-semibold">
                  <Stars value={ratingStats.avg} />
                  <span className="text-xs text-white/90">{ratingStats.avg.toFixed(2)} · {ratingStats.count} avis</span>
                </span>
              )}

              {/* Membre depuis */}
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur
                               px-3 py-1 rounded-full text-sm font-semibold">
                <Calendar className="w-3.5 h-3.5" /> Depuis {joinDate}
              </span>
            </div>
          </div>

          {/* Stats (DONOR only) */}
          {profile.role === 'DONOR' && (
            <div className="flex sm:flex-col gap-4 sm:gap-2 text-center flex-shrink-0">
              <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
                <p className="text-2xl font-black">{profile.totalDonations}</p>
                <p className="text-blood-200 text-xs">Dons</p>
              </div>
              {profile.lastDonationAt && (
                <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
                  <p className="text-sm font-bold">
                    {new Date(profile.lastDonationAt).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-blood-200 text-xs">Dernier don</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne gauche ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* ── Informations personnelles ── */}
          <Section title="Informations personnelles" icon={User}>
            {!editInfo ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Field label="Prénom"    value={profile.firstName} />
                  <Field label="Nom"       value={profile.lastName} />
                  <Field label="Email"     value={profile.email} />
                  <Field label="Téléphone" value={profile.phone} />
                  <Field label="Ville"     value={profile.city} />
                  <Field label="Adresse"   value={profile.address} />
                </div>
                <button onClick={() => setEditInfo(true)}
                  className="flex items-center gap-2 text-sm text-blood-600 hover:text-blood-700
                             font-semibold transition-colors">
                  <Edit3 className="w-4 h-4" /> Modifier
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Prénom/Nom (lecture seule) */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Prénom</label>
                    <p className="input-field text-sm bg-gray-50 dark:bg-gray-800 text-gray-500 mt-1 cursor-not-allowed">
                      {profile.firstName}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nom</label>
                    <p className="input-field text-sm bg-gray-50 dark:bg-gray-800 text-gray-500 mt-1 cursor-not-allowed">
                      {profile.lastName}
                    </p>
                  </div>
                </div>

                {[
                  { key: 'phone',   label: 'Téléphone', placeholder: '+213 5XX XXX XXX', type: 'tel'  },
                  { key: 'city',    label: 'Ville',     placeholder: 'Alger, Oran...',   type: 'text' },
                  { key: 'address', label: 'Adresse',   placeholder: 'Votre adresse',    type: 'text' },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">
                      {label}
                    </label>
                    <input
                      type={type}
                      value={infoForm[key as keyof typeof infoForm]}
                      onChange={(e) => setInfoForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    />
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <button onClick={saveInfo} disabled={savingInfo}
                    className="flex items-center gap-2 px-4 py-2 bg-blood-600 hover:bg-blood-700
                               text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                    {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enregistrer
                  </button>
                  <button onClick={() => setEditInfo(false)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700
                               rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300
                               hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <X className="w-4 h-4" /> Annuler
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* ── Localisation ── */}
          <Section title="Localisation" icon={MapPin}>
            {!editLocation ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Field label="Ville"    value={profile.city} />
                  <Field label="Adresse"  value={profile.address} />
                  <Field label="Latitude" value={profile.latitude?.toFixed(4)} />
                  <Field label="Longitude"value={profile.longitude?.toFixed(4)} />
                </div>

                {/* Mini map si coords */}
                {profile.latitude && profile.longitude && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-4">
                    <MapContainer
                      center={[profile.latitude, profile.longitude]}
                      zoom={13}
                      style={{ height: 180, zIndex: 0 }}
                      zoomControl={false}
                      dragging={false}
                      scrollWheelZoom={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[profile.latitude, profile.longitude]} />
                    </MapContainer>
                  </div>
                )}

                <button onClick={() => setEditLocation(true)}
                  className="flex items-center gap-2 text-sm text-blood-600 hover:text-blood-700 font-semibold">
                  <Edit3 className="w-4 h-4" /> Modifier
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Ville</label>
                    <input value={locForm.city} onChange={(e) => setLocForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="Alger" className="input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">Adresse</label>
                    <input value={locForm.address} onChange={(e) => setLocForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="Rue, quartier..." className="input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />
                  </div>
                </div>

                {/* Boutons GPS / Carte */}
                <div className="flex gap-2">
                  <button type="button" onClick={handleGPS} disabled={gpsLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl
                               border border-blood-200 bg-blood-50 dark:bg-blood-950 dark:border-blood-800
                               text-blood-700 dark:text-blood-300 text-sm font-medium
                               hover:bg-blood-100 transition-colors disabled:opacity-50">
                    {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                    GPS
                  </button>
                  <button type="button" onClick={() => setShowMap((p) => !p)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl
                               border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                               text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors">
                    <MapPin className="w-4 h-4" />
                    {showMap ? 'Masquer' : 'Carte'}
                  </button>
                </div>

                {/* Coords */}
                {(locForm.lat !== 0 || locForm.lng !== 0) && (
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                      <span className="text-[10px] text-gray-400 block">Latitude</span>{locForm.lat.toFixed(6)}
                    </div>
                    <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                      <span className="text-[10px] text-gray-400 block">Longitude</span>{locForm.lng.toFixed(6)}
                    </div>
                  </div>
                )}

                {/* Map */}
                {showMap && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <MapContainer
                      center={locForm.lat ? [locForm.lat, locForm.lng] : [36.752, 3.042]}
                      zoom={locForm.lat ? 14 : 6}
                      style={{ height: 220, zIndex: 0 }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <MapClickHandler onChange={(lat, lng) => setLocForm((f) => ({ ...f, lat, lng }))} />
                      {locForm.lat !== 0 && <Marker position={[locForm.lat, locForm.lng]} />}
                    </MapContainer>
                    <p className="text-xs text-gray-400 text-center py-1.5 bg-gray-50 dark:bg-gray-800">
                      💡 Cliquez pour définir votre position
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={saveLocation} disabled={savingLoc}
                    className="flex items-center gap-2 px-4 py-2 bg-blood-600 hover:bg-blood-700
                               text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                    {savingLoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Enregistrer
                  </button>
                  <button onClick={() => { setEditLocation(false); setShowMap(false); }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700
                               rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300
                               hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <X className="w-4 h-4" /> Annuler
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* ── Mot de passe ── */}
          <Section title="Sécurité" icon={Lock}>
            {!editPassword ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Mot de passe</p>
                  <p className="text-xs text-gray-400 mt-0.5">••••••••••••</p>
                </div>
                <button onClick={() => setEditPassword(true)}
                  className="flex items-center gap-2 text-sm text-blood-600 font-semibold hover:underline">
                  <Edit3 className="w-4 h-4" /> Modifier
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { key: 'current', label: 'Mot de passe actuel',    placeholder: '••••••••' },
                  { key: 'next',    label: 'Nouveau mot de passe',   placeholder: 'Min. 8 caractères' },
                  { key: 'confirm', label: 'Confirmer le mot de passe', placeholder: '••••••••' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPwd[key as keyof typeof showPwd] ? 'text' : 'password'}
                        value={pwdForm[key as keyof typeof pwdForm]}
                        onChange={(e) => setPwdForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="input-field pl-10 pr-10 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      />
                      <button type="button"
                        onClick={() => setShowPwd((s) => ({ ...s, [key]: !s[key as keyof typeof showPwd] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPwd[key as keyof typeof showPwd]
                          ? <EyeOff className="w-4 h-4" />
                          : <Eye    className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 pt-1">
                  <button onClick={savePassword} disabled={savingPwd}
                    className="flex items-center gap-2 px-4 py-2 bg-blood-600 hover:bg-blood-700
                               text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                    {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Modifier
                  </button>
                  <button onClick={() => { setEditPassword(false); setPwdForm({ current: '', next: '', confirm: '' }); }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700
                               rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300
                               hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <X className="w-4 h-4" /> Annuler
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>

        {/* ── Colonne droite ── */}
        <div className="space-y-6">

          {/* ── Statut (DONOR) ── */}
          {profile.role === 'DONOR' && (
            <Section title="Disponibilité" icon={Heart}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {profile.isAvailable ? 'Disponible' : 'Indisponible'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {profile.isAvailable
                      ? 'Vous recevez des alertes de dons'
                      : 'Vous ne recevez pas d\'alertes'}
                  </p>
                </div>
                <button onClick={toggleAvailability} disabled={savingAvail}
                  className="transition-transform hover:scale-110">
                  {savingAvail
                    ? <Loader2 className="w-8 h-8 animate-spin text-blood-600" />
                    : profile.isAvailable
                      ? <ToggleRight className="w-10 h-10 text-green-500" />
                      : <ToggleLeft  className="w-10 h-10 text-gray-400" />
                  }
                </button>
              </div>

              <div className={`rounded-xl p-3 text-xs font-medium
                ${profile.isAvailable
                  ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700'}`}>
                {profile.isAvailable
                  ? '✅ Les patients peuvent vous contacter'
                  : '⏸️ Activez pour recevoir des demandes'}
              </div>
            </Section>
          )}

          {/* ── Récapitulatif ── */}
          <Section title="Récapitulatif" icon={Shield}>
            <div className="space-y-3">
              {[
                { label: 'Rôle',         value: `${roleConf.icon} ${roleConf.label}` },
                { label: 'Groupe sanguin', value: `🩸 ${BLOOD_GROUP_LABELS[profile.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}` },
                { label: 'Statut',       value: profile.isVerified ? '✅ Vérifié' : '⏳ Non vérifié' },
                { label: 'Membre depuis', value: joinDate },
                ...(profile.role === 'DONOR' ? [
                  { label: 'Total dons', value: `🏅 ${profile.totalDonations}` },
                  { label: 'Dernier don', value: profile.lastDonationAt
                    ? new Date(profile.lastDonationAt).toLocaleDateString('fr-FR')
                    : '—' },
                ] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2
                                            border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{value}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Ratings (DONOR) ── */}
          {profile.role === 'DONOR' && (
            <Section title="Évaluations" icon={Award}>
              <div className="mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-black text-gray-900 dark:text-gray-100">
                    {ratingStats ? ratingStats.avg.toFixed(2) : '—'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Stars value={ratingStats?.avg ?? 0} />
                      <span className="text-xs text-gray-500">· {ratingStats?.count ?? 0} avis</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Note moyenne · Basée sur les retours patients</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Derniers avis</h4>

                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-blood-600" />
                  </div>
                ) : recentReviews.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun avis pour le moment</p>
                ) : (
                  <div className="space-y-3">
                    {recentReviews.map((r) => (
                      <div key={r.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-semibold text-sm">
                            {r.patient?.firstName?.[0] ?? 'P'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                  {r.patient?.firstName} {r.patient?.lastName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Stars value={r.rating ?? 0} />
                                  <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                                </div>
                              </div>
                            </div>
                            {r.comment && <p className="text-sm text-gray-700 dark:text-gray-200 mt-2">{r.comment}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* ── Statut vérification ── */}
          <div className={`rounded-2xl p-4 border-2
            ${profile.isVerified
              ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'
              : 'border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800'}`}>
            <div className="flex items-center gap-3">
              {profile.isVerified
                ? <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
                : <Clock       className="w-8 h-8 text-orange-500 flex-shrink-0" />}
              <div>
                <p className={`font-bold text-sm
                  ${profile.isVerified ? 'text-green-800 dark:text-green-300' : 'text-orange-800 dark:text-orange-300'}`}>
                  {profile.isVerified ? 'Compte vérifié' : 'Vérification en attente'}
                </p>
                <p className={`text-xs mt-0.5
                  ${profile.isVerified ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {profile.isVerified
                    ? 'Votre identité a été confirmée'
                    : 'Un admin va vérifier votre profil'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}