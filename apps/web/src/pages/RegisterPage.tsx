import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Phone, Loader2, MapPin, Crosshair, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { authService }    from '../services/authService';
import { useAuthStore }   from '../store/useAuthStore';
import { BloodGroup, BLOOD_GROUP_LABELS } from '../types';
import logo from '../assets/blooslink-logo2.png';

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

const registerSchema = z
  .object({
    firstName:       z.string().min(2, 'Au moins 2 caractères'),
    lastName:        z.string().min(2, 'Au moins 2 caractères'),
    email:           z.string().email('Email invalide'),
    phone:           z.string().optional(),
    bloodGroup:      z.nativeEnum(BloodGroup, { error: 'Sélectionnez un groupe sanguin' }),
    password:        z.string().min(8, 'Au moins 8 caractères'),
    confirmPassword: z.string(),
    role:            z.enum(['DONOR', 'PATIENT']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

// ── Step indicator ──────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
            ${i < current  ? 'bg-blood-600 text-white' :
              i === current ? 'bg-blood-600 text-white ring-4 ring-blood-100' :
                              'bg-gray-200 text-gray-400'}`}>
            {i < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-8 h-0.5 transition-all ${i < current ? 'bg-blood-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Input wrapper ───────────────────────────────────────────
function InputField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && (
        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
          <span className="w-3.5 h-3.5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">!</span>
          {error}
        </p>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const [loading,    setLoading]    = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords,     setCoords]     = useState<{ lat: number; lng: number } | null>(null);
  const [showMap,    setShowMap]    = useState(false);
  const [showPwd,    setShowPwd]    = useState(false);
  const [showCPwd,   setShowCPwd]   = useState(false);
  const [step,       setStep]       = useState(0); // 0=rôle, 1=infos, 2=sécurité

  const navigate    = useNavigate();
  const { setAuth } = useAuthStore();

  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'DONOR' },
  });

  const selectedRole = watch('role');

  // ── GPS ──
  const handleGPS = () => {
    if (!navigator.geolocation) { toast.error('Géolocalisation non supportée'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShowMap(true);
        toast.success('📍 Position détectée !');
        setGpsLoading(false);
      },
      () => { toast.error("Impossible d'accéder à votre position"); setGpsLoading(false); },
      { timeout: 8000 },
    );
  };

  // ── Next step ──
  const nextStep = async () => {
    let fields: (keyof RegisterForm)[] = [];
    if (step === 0) fields = ['role'];
    if (step === 1) fields = ['firstName', 'lastName', 'email', 'bloodGroup'];
    const ok = await trigger(fields);
    if (ok) setStep((s) => s + 1);
  };

  // ── Submit ──
  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const { confirmPassword, ...rest } = data;
      const response = await authService.register({
        ...rest,
        ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      });
      setAuth(response.user, response.accessToken);
      toast.success('Inscription réussie ! Bienvenue sur BloodLink 🎉');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  const STEPS = ['Rôle', 'Profil', 'Sécurité'];

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">

      {/* ── Left panel (desktop) ── */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-blood-600 via-blood-700 to-blood-900
                      flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

        <div className="relative z-10 text-center">
          <img src={logo} alt="BloodLink" className="h-24 w-auto object-contain mx-auto mb-6 drop-shadow-xl" />
          <h2 className="text-3xl font-black text-white mb-3">Rejoignez BloodLink</h2>
          <p className="text-blood-200 text-lg mb-10">Chaque don compte. Chaque vie aussi.</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { value: '12K+', label: 'Donneurs' },
              { value: '8K+',  label: 'Vies sauvées' },
              { value: '48',   label: 'Wilayas' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-2xl p-4">
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-blood-200 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Steps preview */}
          <div className="space-y-3 text-left">
            {[
              { icon: '🩸', text: 'Choisissez votre rôle' },
              { icon: '👤', text: 'Complétez votre profil' },
              { icon: '🔒', text: 'Sécurisez votre compte' },
            ].map(({ icon, text }, i) => (
              <div key={i} className={`flex items-center gap-3 transition-all ${step === i ? 'opacity-100' : 'opacity-40'}`}>
                <span className="text-xl">{icon}</span>
                <p className={`text-sm font-medium ${step === i ? 'text-white' : 'text-blood-200'}`}>{text}</p>
                {step === i && <ChevronRight className="w-4 h-4 text-white ml-auto" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <img src={logo} alt="BloodLink" className="h-14 w-auto object-contain" />
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl shadow-gray-200/60
                          dark:shadow-gray-950 border border-gray-100 dark:border-gray-800 p-8">

            {/* Header */}
            <div className="mb-6">
              <StepIndicator current={step} total={3} />
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 text-center">
                {step === 0 && 'Qui êtes-vous ?'}
                {step === 1 && 'Votre profil'}
                {step === 2 && 'Sécurité & Localisation'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center mt-1">
                {step === 0 && 'Sélectionnez votre rôle dans BloodLink'}
                {step === 1 && 'Renseignez vos informations personnelles'}
                {step === 2 && 'Créez un mot de passe sécurisé'}
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>

              {/* ══ STEP 0 — Rôle ══ */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { value: 'DONOR',   emoji: '🩸', title: 'Donneur', desc: 'Je souhaite donner mon sang' },
                      { value: 'PATIENT', emoji: '🏥', title: 'Patient',  desc: 'J\'ai besoin d\'une transfusion' },
                    ].map(({ value, emoji, title, desc }) => (
                      <label key={value} className="cursor-pointer">
                        <input type="radio" value={value} {...register('role')} className="peer hidden" />
                        <div className={`p-5 rounded-2xl border-2 text-center transition-all
                          peer-checked:border-blood-600 peer-checked:bg-blood-50 dark:peer-checked:bg-blood-950
                          border-gray-200 dark:border-gray-700 hover:border-blood-300
                          ${selectedRole === value ? 'border-blood-600 bg-blood-50 dark:bg-blood-950' : ''}`}>
                          <span className="text-4xl">{emoji}</span>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-2">{title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">{desc}</p>
                          {selectedRole === value && (
                            <div className="mt-2 w-5 h-5 bg-blood-600 rounded-full flex items-center justify-center mx-auto">
                              <span className="text-white text-[10px]">✓</span>
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Info box */}
                  <div className={`rounded-2xl p-4 text-sm
                    ${selectedRole === 'DONOR'
                      ? 'bg-blood-50 dark:bg-blood-950 border border-blood-200 dark:border-blood-800'
                      : 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'}`}>
                    {selectedRole === 'DONOR' ? (
                      <p className="text-blood-700 dark:text-blood-300">
                        🩸 En tant que donneur, vous recevrez des alertes pour des demandes compatibles avec votre groupe sanguin.
                      </p>
                    ) : (
                      <p className="text-blue-700 dark:text-blue-300">
                        🏥 En tant que patient, vous pourrez créer des demandes de sang et trouver des donneurs compatibles.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ══ STEP 1 — Profil ══ */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <InputField label="Prénom" error={errors.firstName?.message}>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input {...register('firstName')}
                          className="input-field pl-10 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                          placeholder="Ahmed" />
                      </div>
                    </InputField>
                    <InputField label="Nom" error={errors.lastName?.message}>
                      <input {...register('lastName')}
                        className="input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        placeholder="Benali" />
                    </InputField>
                  </div>

                  <InputField label="Email" error={errors.email?.message}>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="email" {...register('email')}
                        className="input-field pl-10 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        placeholder="votre@email.com" />
                    </div>
                  </InputField>

                  <InputField label="Téléphone (optionnel)">
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input {...register('phone')}
                        className="input-field pl-10 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        placeholder="+213 5XX XXX XXX" />
                    </div>
                  </InputField>

                  <InputField label="Groupe sanguin" error={errors.bloodGroup?.message}>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
                        <label key={value} className="cursor-pointer">
                          <input type="radio" value={value} {...register('bloodGroup')} className="peer hidden" />
                          <div className="py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 text-center
                                          text-sm font-bold transition-all cursor-pointer
                                          peer-checked:border-blood-600 peer-checked:bg-blood-600 peer-checked:text-white
                                          hover:border-blood-300 text-gray-700 dark:text-gray-300">
                            {label}
                          </div>
                        </label>
                      ))}
                    </div>
                  </InputField>
                </div>
              )}

              {/* ══ STEP 2 — Sécurité ══ */}
              {step === 2 && (
                <div className="space-y-4">
                  <InputField label="Mot de passe" error={errors.password?.message}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showPwd ? 'text' : 'password'} {...register('password')}
                        className="input-field pl-10 pr-10 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </InputField>

                  <InputField label="Confirmer le mot de passe" error={errors.confirmPassword?.message}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showCPwd ? 'text' : 'password'} {...register('confirmPassword')}
                        className="input-field pl-10 pr-10 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        placeholder="••••••••" />
                      <button type="button" onClick={() => setShowCPwd(!showCPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showCPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </InputField>

                  {/* Localisation */}
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blood-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Localisation
                          <span className="text-gray-400 font-normal ml-1 text-xs">(optionnel)</span>
                        </span>
                      </div>
                      {coords && (
                        <span className="text-xs text-green-600 font-medium bg-green-50 dark:bg-green-950
                                         dark:text-green-400 px-2 py-0.5 rounded-full">
                          ✓ Définie
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button type="button" onClick={handleGPS} disabled={gpsLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl
                                   border border-blood-200 bg-blood-50 dark:bg-blood-950 dark:border-blood-800
                                   text-blood-700 dark:text-blood-300 text-xs font-medium
                                   hover:bg-blood-100 transition-colors disabled:opacity-50">
                        {gpsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                        GPS
                      </button>
                      <button type="button" onClick={() => setShowMap((p) => !p)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl
                                   border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                                   text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 transition-colors">
                        <MapPin className="w-3.5 h-3.5" />
                        {showMap ? 'Masquer' : 'Carte'}
                      </button>
                    </div>

                    {showMap && (
                      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                        <MapContainer
                          center={coords ? [coords.lat, coords.lng] : [36.752, 3.042]}
                          zoom={coords ? 14 : 6}
                          style={{ height: 200, zIndex: 0 }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <MapClickHandler onChange={(lat, lng) => setCoords({ lat, lng })} />
                          {coords && <Marker position={[coords.lat, coords.lng]} />}
                        </MapContainer>
                        <p className="text-xs text-gray-400 text-center py-1.5 bg-gray-50 dark:bg-gray-800">
                          💡 Cliquez pour définir votre position
                        </p>
                      </div>
                    )}

                    {coords && (
                      <div className="flex gap-2">
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                          <span className="text-gray-400 text-[10px] block">Lat</span>{coords.lat.toFixed(4)}
                        </div>
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                          <span className="text-gray-400 text-[10px] block">Lng</span>{coords.lng.toFixed(4)}
                        </div>
                        <button type="button" onClick={() => setCoords(null)}
                          className="px-3 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs">✕</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Navigation buttons ── */}
              <div className={`flex gap-3 mt-6 ${step > 0 ? 'flex-row' : ''}`}>
                {step > 0 && (
                  <button type="button" onClick={() => setStep((s) => s - 1)}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
                               text-gray-600 dark:text-gray-300 font-semibold text-sm
                               hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    ← Retour
                  </button>
                )}

                {step < 2 ? (
                  <button type="button" onClick={nextStep}
                    className="flex-1 py-3 rounded-xl bg-blood-600 hover:bg-blood-700
                               text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    Continuer <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={loading}
                    className="flex-1 py-3 rounded-xl bg-blood-600 hover:bg-blood-700 disabled:opacity-60
                               text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Inscription...</>
                      : <>🎉 Créer mon compte</>}
                  </button>
                )}
              </div>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-blood-600 font-bold hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}