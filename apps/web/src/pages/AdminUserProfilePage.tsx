import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, User, Mail, Phone, MapPin, Shield,
    Calendar, Award, CheckCircle, Clock, Loader2,
    ToggleLeft, ToggleRight, Droplets, Heart, Building2,
    Star,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import api from '../services/api';
import { BLOOD_GROUP_LABELS } from '../types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Helpers ───────────────────────────────────────────────────
const ROLE_CONFIG = {
    DONOR: { label: 'Donneur', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', icon: '🩸' },
    PATIENT: { label: 'Patient', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300', icon: '🏥' },
    DOCTOR: { label: 'Médecin', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300', icon: '👨‍⚕️' },
    ADMIN: { label: 'Admin', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', icon: '⚙️' },
};

// ── Section Card ──────────────────────────────────────────────
function Section({ title, icon: Icon, children, badge }: {
    title: string; icon: any; children: React.ReactNode; badge?: React.ReactNode;
}) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100
                    dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b
                      border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blood-100 dark:bg-blood-950 rounded-lg
                          flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-blood-600 dark:text-blood-400" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{title}</h3>
                </div>
                {badge}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

// ── Info Row ──────────────────────────────────────────────────
function InfoRow({ label, value, icon: Icon }: {
    label: string; value: React.ReactNode; icon?: any;
}) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b
                    border-gray-100 dark:border-gray-800 last:border-0">
            <div className="flex items-center gap-2">
                {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 text-right max-w-[60%] truncate">
                {value || '—'}
            </span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
export default function AdminUserProfilePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [donations, setDonations] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loadingDons, setLoadingDons] = useState(false);
    const [ratingStats, setRatingStats] = useState<{ avg: number; count: number } | null>(null);
    const [recentReviews, setRecentReviews] = useState<any[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    // ── Fetch helpers
    const fetchRatingStats = async (userId: string) => {
        try {
            const res = await api.get(`/ratings/stats/${userId}`);
            setRatingStats(res.data);
        } catch {
            setRatingStats(null);
        }
    };

    const fetchRecentReviews = async (userId: string) => {
        setReviewsLoading(true);
        try {
            const res = await api.get('/ratings', { params: { donorId: userId, limit: 5 } });
            setRecentReviews(res.data.data || []);
        } catch {
            setRecentReviews([]);
        } finally {
            setReviewsLoading(false);
        }
    };

    // ── Load profile ──────────────────────────────────────────
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get(`/users/${id}`)
            .then((r) => setProfile(r.data))
            .catch(() => { toast.error('Utilisateur introuvable'); navigate(-1); })
            .finally(() => setLoading(false));
    }, [id]);

// ── Load donations / requests (replace existing useEffect)
useEffect(() => {
  if (!profile) return;
  setLoadingDons(true);

  const load = async () => {
    try {
      if (profile.role === 'DONOR') {
        // نطلب عبر params بدلاً من concatenation
        const res = await api.get('/donations', { params: { donorId: profile.id, limit: 5 } });
        // دفاعي: احتفظ فقط بـ donations التي لها donorId مطابق
        const data = (res.data?.data || res.data || []).filter((d: any) => d.donorId === profile.id);
        setDonations(data);
        setRequests([]); // تفريغ requests لأن الآن نعرض donations
      } else if (profile.role === 'PATIENT') {
        const res = await api.get('/blood-requests', { params: { patientId: profile.id, limit: 5 } });
        const data = (res.data?.data || res.data || []).filter((r: any) => r.patientId === profile.id);
        setRequests(data);
        setDonations([]); // تفريغ donations لأن الآن نعرض requests
      } else {
        setDonations([]);
        setRequests([]);
      }
    } catch (err) {
      // لا تُظهر خطأ مزعج — افرغ القوائم
      setDonations([]);
      setRequests([]);
    } finally {
      setLoadingDons(false);
    }
  };

  load();
}, [profile]);
    // ── Fetch when profile is loaded
    useEffect(() => {
        if (!profile) return;
        if (profile.role === 'DONOR' && profile.id) {
            fetchRatingStats(profile.id);
            fetchRecentReviews(profile.id);
        } else {
            setRatingStats(null);
            setRecentReviews([]);
        }
    }, [profile?.id, profile?.role]);
    // ── Toggle Verify ─────────────────────────────────────────
    const toggleVerify = async () => {
        if (!profile) return;
        setVerifying(true);
        try {
            const res = await api.patch(`/users/${id}/verify`);
            setProfile((p: any) => ({ ...p, isVerified: res.data.isVerified }));
            toast.success(res.data.isVerified ? '✅ Utilisateur vérifié' : '❌ Vérification retirée');
        } catch {
            toast.error('Erreur lors de la vérification');
        } finally {
            setVerifying(false);
        }
    };

    // ── Loading ───────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blood-600" />
        </div>
    );

    if (!profile) return null;

    const roleConf = ROLE_CONFIG[profile.role as keyof typeof ROLE_CONFIG] || ROLE_CONFIG.DONOR;
    const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase();
    const joinDate = new Date(profile.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    return (
        <div className="space-y-6 max-w-4xl mx-auto">

            {/* ── Back button ── */}
            <button onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700
                   dark:hover:text-gray-300 font-medium transition-colors group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Retour
            </button>

            {/* ── Hero ── */}
            <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black
                      rounded-3xl p-8 text-white relative overflow-hidden">
                {/* Déco */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16" />

                {/* Admin badge */}
                <div className="relative z-10 flex items-center gap-2 mb-4">
                    <span className="bg-blood-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Vue Admin
                    </span>
                    <span className="bg-white/10 text-white text-xs px-3 py-1 rounded-full">
                        ID: {profile.id?.slice(0, 8)}...
                    </span>
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center
                          justify-center overflow-hidden border-2 border-white/30 flex-shrink-0">
                        {profile.avatar
                            ? <img src={profile.avatar} className="w-full h-full object-cover" alt="avatar" />
                            : <span className="text-3xl font-black text-white">{initials}</span>
                        }
                    </div>

                    {/* Infos */}
                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                            <h1 className="text-2xl font-black">
                                {profile.firstName} {profile.lastName}
                            </h1>
                            {profile.isVerified
                                ? <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300
                                   px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                    <CheckCircle className="w-3 h-3" /> Vérifié
                                </span>
                                : <span className="inline-flex items-center gap-1 bg-orange-500/20 text-orange-300
                                   px-2.5 py-0.5 rounded-full text-xs font-semibold">
                                    <Clock className="w-3 h-3" /> Non vérifié
                                </span>
                            }
                        </div>

                        <p className="text-gray-400 text-sm mb-3">{profile.email}</p>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                               ${roleConf.color}`}>
                                {roleConf.icon} {roleConf.label}
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold">
                                🩸 {BLOOD_GROUP_LABELS[profile.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold">
                                <Calendar className="w-3 h-3" /> {joinDate}
                            </span>
                            {profile.role === 'DONOR' && (
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
                  ${profile.isAvailable
                                        ? 'bg-green-500/20 text-green-300'
                                        : 'bg-gray-500/20 text-gray-400'}`}>
                                    {profile.isAvailable ? '🟢 Disponible' : '⚫ Indisponible'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    {profile.role === 'DONOR' && (
                        <div className="flex sm:flex-col gap-3 flex-shrink-0 text-center">
                            <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
                                <p className="text-2xl font-black">{profile.totalDonations}</p>
                                <p className="text-gray-400 text-xs">Dons</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Colonne gauche ── */}
                <div className="lg:col-span-2 space-y-6">

                    {/* ── Informations ── */}
                    <Section title="Informations personnelles" icon={User}>
                        <div className="space-y-0">
                            <InfoRow label="Prénom" value={profile.firstName} icon={User} />
                            <InfoRow label="Nom" value={profile.lastName} />
                            <InfoRow label="Email" value={profile.email} icon={Mail} />
                            <InfoRow label="Téléphone" value={profile.phone} icon={Phone} />
                            <InfoRow label="Ville" value={profile.city} icon={MapPin} />
                            <InfoRow label="Adresse" value={profile.address} />
                            <InfoRow label="Rôle" value={`${roleConf.icon} ${roleConf.label}`} />
                            <InfoRow label="Groupe sanguin"
                                value={BLOOD_GROUP_LABELS[profile.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}
                                icon={Droplets} />
                            {profile.role === 'DONOR' && (
                                <>
                                    <InfoRow label="Total dons" value={`🏅 ${profile.totalDonations}`} icon={Award} />
                                    <InfoRow label="Dernier don"
                                        value={profile.lastDonationAt
                                            ? new Date(profile.lastDonationAt).toLocaleDateString('fr-FR')
                                            : '—'}
                                        icon={Calendar} />
                                </>
                            )}
                            <InfoRow label="Membre depuis" value={joinDate} icon={Calendar} />
                            {profile.role === 'DONOR' && ratingStats && (
                                <InfoRow
                                    label="Évaluation"
                                    value={
                                        <span className="inline-flex items-center gap-2">
                                            <Star className="w-4 h-4 text-yellow-400" />
                                            <span className="text-sm font-semibold">
                                                {ratingStats.avg.toFixed(2)} ({ratingStats.count}) avis
                                            </span>
                                        </span>
                                    }
                                    icon={Star}
                                />
                            )}
                        </div>
                    </Section>

                    {/* ── Localisation ── */}
                    <Section title="Localisation" icon={MapPin}>
                        {profile.latitude && profile.longitude ? (
                            <>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                        <p className="text-xs text-gray-400 mb-1">Ville</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {profile.city || '—'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                                        <p className="text-xs text-gray-400 mb-1">Adresse</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {profile.address || '—'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 font-mono">
                                        <p className="text-xs text-gray-400 mb-1">Latitude</p>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                            {profile.latitude.toFixed(6)}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 font-mono">
                                        <p className="text-xs text-gray-400 mb-1">Longitude</p>
                                        <p className="text-sm text-gray-900 dark:text-gray-100">
                                            {profile.longitude.toFixed(6)}
                                        </p>
                                    </div>
                                </div>
                                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                                    <MapContainer
                                        center={[profile.latitude, profile.longitude]}
                                        zoom={13}
                                        style={{ height: 220, zIndex: 0 }}
                                        zoomControl={false}
                                        scrollWheelZoom={false}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <Marker position={[profile.latitude, profile.longitude]} />
                                    </MapContainer>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <MapPin className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">Localisation non définie</p>
                            </div>
                        )}
                    </Section>

                    {/* ── Historique ── */}
                    {(profile.role === 'DONOR' || profile.role === 'PATIENT') && (
                        <Section
                            title={profile.role === 'DONOR' ? 'Historique des dons' : 'Historique des demandes'}
                            icon={profile.role === 'DONOR' ? Heart : Droplets}
                        >
                            {loadingDons ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-blood-600" />
                                </div>
                            ) : (profile.role === 'DONOR' ? donations : requests).length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-sm text-gray-400">Aucun historique disponible</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {(profile.role === 'DONOR' ? donations : requests).map((item: any) => (
                                        <div key={item.id}
                                            className="flex items-center justify-between p-3 rounded-xl
                                 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-blood-100 dark:bg-blood-950 rounded-lg
                                        flex items-center justify-center">
                                                    <span className="text-xs">🩸</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                                        {profile.role === 'DONOR'
                                                            ? item.request?.hospital || 'Don de sang'
                                                            : item.hospital}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full
                        ${item.status === 'COMPLETED' || item.status === 'FULFILLED'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                                                    : item.status === 'ACCEPTED' || item.status === 'MATCHED'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                                        : item.status === 'REJECTED' || item.status === 'CANCELLED'
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Section>
                    )}
                </div>

                {/* ── Colonne droite ── */}
                <div className="space-y-6">

                    {/* ── Action Admin : Vérification ── */}
                    <Section title="Action Admin" icon={Shield}>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl
                              bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        Vérification
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {profile.isVerified ? 'Compte vérifié' : 'En attente'}
                                    </p>
                                </div>
                                <button onClick={toggleVerify} disabled={verifying}
                                    className="transition-transform hover:scale-110">
                                    {verifying
                                        ? <Loader2 className="w-8 h-8 animate-spin text-blood-600" />
                                        : profile.isVerified
                                            ? <ToggleRight className="w-10 h-10 text-green-500" />
                                            : <ToggleLeft className="w-10 h-10 text-gray-400" />
                                    }
                                </button>
                            </div>

                            {/* Status badge */}
                            <div className={`rounded-xl p-3 text-xs font-medium border
                ${profile.isVerified
                                    ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                                    : 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'}`}>
                                {profile.isVerified
                                    ? '✅ Ce compte est vérifié et approuvé'
                                    : '⏳ Ce compte attend votre vérification'}
                            </div>
                        </div>
                    </Section>

                    {/* ── Récapitulatif ── */}
                    <Section title="Récapitulatif" icon={Shield}>
                        <div className="space-y-0">
                            <InfoRow label="Rôle"
                                value={<span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roleConf.color}`}>
                                    {roleConf.icon} {roleConf.label}
                                </span>} />
                            <InfoRow label="Groupe sanguin"
                                value={`🩸 ${BLOOD_GROUP_LABELS[profile.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}`} />
                            <InfoRow label="Statut compte"
                                value={profile.isVerified
                                    ? <span className="text-green-600 font-bold">✅ Vérifié</span>
                                    : <span className="text-orange-500 font-bold">⏳ En attente</span>
                                } />
                            <InfoRow label="Disponibilité"
                                value={profile.role === 'DONOR'
                                    ? profile.isAvailable
                                        ? <span className="text-green-600 font-bold">🟢 Oui</span>
                                        : <span className="text-gray-500 font-bold">⚫ Non</span>
                                    : '—'
                                } />
                            {profile.role === 'DONOR' && (
                                <InfoRow
                                    label="Évaluation"
                                    value={
                                        <span className="flex items-center gap-2">
                                            <Star className="w-4 h-4 text-yellow-400" />
                                            {ratingStats ? `${ratingStats.avg.toFixed(2)} (${ratingStats.count})` : '—'}
                                        </span>
                                    }
                                />
                            )}
                            {profile.role === 'DONOR' && (
                                <InfoRow label="Total dons" value={`🏅 ${profile.totalDonations}`} />
                            )}
                            <InfoRow label="Membre depuis" value={joinDate} />
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
}