import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, Mail, Lock, User, Phone, Loader2, MapPin, Crosshair } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';
import { BloodGroup, BLOOD_GROUP_LABELS } from '../types';

// Fix leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Map click handler ──
function MapClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onChange(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ── Schema ──
const registerSchema = z
  .object({
    firstName:   z.string().min(2, 'Au moins 2 caractères'),
    lastName:    z.string().min(2, 'Au moins 2 caractères'),
    email:       z.string().email('Email invalide'),
    phone:       z.string().optional(),
    bloodGroup:  z.nativeEnum(BloodGroup, { error: 'Sélectionnez un groupe sanguin' }),
    password:    z.string().min(8, 'Au moins 8 caractères'),
    confirmPassword: z.string(),
    role:        z.enum(['DONOR', 'PATIENT']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [loading, setLoading]       = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords]         = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap]       = useState(false);

  const navigate    = useNavigate();
  const { setAuth } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'DONOR' },
  });

  // ── GPS ──
  const handleGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setShowMap(true);
        toast.success('📍 Position détectée !');
        setGpsLoading(false);
      },
      () => {
        toast.error('Impossible d\'accéder à votre position');
        setGpsLoading(false);
      },
      { timeout: 8000 },
    );
  };

  // ── Map click ──
  const handleMapClick = (lat: number, lng: number) => {
    setCoords({ lat, lng });
  };

  // ── Submit ──
  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const { confirmPassword, ...rest } = data;
      const payload = {
        ...rest,
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      };
      const response = await authService.register(payload);
      setAuth(response.user, response.accessToken);
      toast.success('Inscription réussie ! Bienvenue sur BloodLink 🎉');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg">
        <div className="card">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="w-12 h-12 bg-blood-600 rounded-xl flex items-center justify-center">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-blood-600">BloodLink</h1>
          </div>

          <h2 className="text-xl font-bold text-center text-gray-900 mb-1">Créer un compte</h2>
          <p className="text-center text-gray-500 mb-6 text-sm">Rejoignez la communauté BloodLink</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Role */}
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer">
                <input type="radio" value="DONOR" {...register('role')} className="peer hidden" />
                <div className="p-3 rounded-lg border-2 border-gray-200 text-center transition-all peer-checked:border-blood-600 peer-checked:bg-blood-50">
                  <span className="text-2xl">🩸</span>
                  <p className="text-sm font-semibold mt-1">Donneur</p>
                </div>
              </label>
              <label className="cursor-pointer">
                <input type="radio" value="PATIENT" {...register('role')} className="peer hidden" />
                <div className="p-3 rounded-lg border-2 border-gray-200 text-center transition-all peer-checked:border-blood-600 peer-checked:bg-blood-50">
                  <span className="text-2xl">🏥</span>
                  <p className="text-sm font-semibold mt-1">Patient</p>
                </div>
              </label>
            </div>

            {/* Nom / Prénom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('firstName')} className="input-field pl-10 text-sm" placeholder="Ahmed" />
                </div>
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input {...register('lastName')} className="input-field text-sm" placeholder="Benali" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" {...register('email')} className="input-field pl-10 text-sm" placeholder="votre@email.com" />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone (optionnel)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('phone')} className="input-field pl-10 text-sm" placeholder="+213 5XX XXX XXX" />
              </div>
            </div>

            {/* Groupe sanguin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Groupe sanguin</label>
              <select {...register('bloodGroup')} className="input-field text-sm">
                <option value="">-- Sélectionnez --</option>
                {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {errors.bloodGroup && <p className="text-red-500 text-xs mt-1">{errors.bloodGroup.message}</p>}
            </div>

            {/* ── Localisation ── */}
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blood-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Ma localisation
                    <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                  </span>
                </div>
                {coords && (
                  <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                    ✓ Définie
                  </span>
                )}
              </div>

              {/* Boutons */}
              <div className="flex gap-2">
                {/* GPS */}
                <button
                  type="button"
                  onClick={handleGPS}
                  disabled={gpsLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg
                             border border-blood-200 bg-blood-50 text-blood-700 text-sm font-medium
                             hover:bg-blood-100 transition-colors disabled:opacity-50"
                >
                  {gpsLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Crosshair className="w-4 h-4" />}
                  Ma position GPS
                </button>

                {/* Toggle Map */}
                <button
                  type="button"
                  onClick={() => setShowMap((p) => !p)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg
                             border border-gray-200 bg-white text-gray-600 text-sm font-medium
                             hover:bg-gray-50 transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  {showMap ? 'Masquer la carte' : 'Choisir sur la carte'}
                </button>
              </div>

              {/* Map */}
              {showMap && (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <MapContainer
                    center={coords ? [coords.lat, coords.lng] : [36.752, 3.042]}
                    zoom={coords ? 14 : 6}
                    style={{ height: 220, zIndex: 0 }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClickHandler onChange={handleMapClick} />
                    {coords && <Marker position={[coords.lat, coords.lng]} />}
                  </MapContainer>
                  <p className="text-xs text-gray-400 text-center py-1.5 bg-gray-50">
                    💡 Cliquez sur la carte pour définir votre position
                  </p>
                </div>
              )}

              {/* Coordonnées affichées */}
              {coords && (
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-600">
                    <span className="text-gray-400 text-[10px] block">Latitude</span>
                    {coords.lat.toFixed(6)}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-xs font-mono text-gray-600">
                    <span className="text-gray-400 text-[10px] block">Longitude</span>
                    {coords.lng.toFixed(6)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCoords(null)}
                    className="px-3 py-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Mots de passe */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" {...register('password')} className="input-field pl-10 text-sm" placeholder="••••••••" />
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
                <input type="password" {...register('confirmPassword')} className="input-field text-sm" placeholder="••••••••" />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "S'inscrire"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-blood-600 font-semibold hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}