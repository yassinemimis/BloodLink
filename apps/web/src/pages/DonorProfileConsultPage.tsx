import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Phone, Star as StarIcon, ArrowLeft } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { BLOOD_GROUP_LABELS } from '../types';

function Stars({ value, size = 14 }: { value: number; size?: number }) {
    const rounded = Math.round(value);
    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} className={`w-[${size}px] h-[${size}px] ${i < rounded ? 'text-yellow-400' : 'text-gray-300'}`} />
            ))}
        </div>
    );
}

function ConsultationModal({
    open,
    onClose,
    onSubmit,
    submitting,
}: {
    open: boolean;
    onClose: () => void;
    onSubmit: (message: string) => void;
    submitting: boolean;
}) {
    const [message, setMessage] = useState('');

    useEffect(() => { if (!open) setMessage(''); }, [open]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">✕</button>
                <h3 className="text-lg font-bold mb-2">Demande de consultation</h3>
                <p className="text-sm text-gray-500 mb-4">Envoyez un message au donneur pour demander des détails ou proposer un rendez-vous.</p>

                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Votre message (objet, disponibilité, lieu...)"
                    className="w-full input-field text-sm mb-4 h-36 resize-none"
                />

                <div className="flex gap-2">
                    <button
                        onClick={() => onSubmit(message)}
                        disabled={submitting || message.trim().length === 0}
                        className="flex-1 py-2 bg-blood-600 text-white rounded-xl font-semibold"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer la demande'}
                    </button>
                    <button onClick={onClose} className="py-2 px-4 rounded-xl border">Annuler</button>
                </div>
            </div>
        </div>
    );
}

export default function DonorProfileConsultPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [ratingStats, setRatingStats] = useState<{ avg: number; count: number } | null>(null);
    const [recentReviews, setRecentReviews] = useState<any[]>([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);

    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.get(`/users/${id}`)
            .then((r) => setProfile(r.data))
            .catch(() => {
                toast.error('Utilisateur introuvable');
                navigate(-1);
            })
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!id) return;
        // stats
        api.get(`/ratings/stats/${id}`)
            .then((r) => setRatingStats(r.data))
            .catch(() => setRatingStats(null));

        setReviewsLoading(true);
        api.get('/ratings', { params: { donorId: id, limit: 5 } })
            .then((r) => setRecentReviews(r.data?.data || []))
            .catch(() => setRecentReviews([]))
            .finally(() => setReviewsLoading(false));
    }, [id]);

    const handleSendConsultation = async (message: string) => {
        if (!user) { toast.error('Connectez-vous pour envoyer une demande'); return; }
        setSubmitting(true);
        try {
            // Endpoint attendu: POST /consultations { donorId, message }
            await api.post('/consultations', { donorId: id, message });
            toast.success('Demande envoyée au donneur');
            setModalOpen(false);
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blood-600" />
        </div>
    );

    if (!profile) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700"><ArrowLeft /></button>
                <div>
                    <h1 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h1>
                    <p className="text-sm text-gray-500">{BLOOD_GROUP_LABELS[profile.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="card p-6">
                        <div className="flex items-start gap-6">
                            <div className="w-24 h-24 rounded-2xl bg-blood-50 flex items-center justify-center text-xl font-bold">
                                {profile.firstName?.[0] ?? ''}{profile.lastName?.[0] ?? ''}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-lg font-semibold">{profile.firstName} {profile.lastName}</p>
                                        <p className="text-sm text-gray-500">{profile.city || '—'}</p>
                                    </div>
                                    <div className="text-right">
                                        {ratingStats && (
                                            <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                                                <Stars value={ratingStats.avg} />
                                                <div className="text-sm font-semibold">{ratingStats.avg.toFixed(2)} · {ratingStats.count}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-400">Téléphone</p>
                                        <p className="text-sm font-medium">
                                            {user?.role === 'PATIENT' && profile.phone ? (
                                                <a href={`tel:${profile.phone}`} className="text-blood-600 hover:underline inline-flex items-center gap-2">
                                                    <Phone className="w-4 h-4" /> {profile.phone}
                                                </a>
                                            ) : profile.phone ? (
                                                <span className="text-sm">{profile.phone}</span>
                                            ) : '—'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Disponibilité</p>
                                        <p className="text-sm font-medium">{profile.isAvailable ? 'Disponible' : 'Indisponible'}</p>
                                    </div>
                                </div>

                                {profile.latitude && profile.longitude && (
                                    <div className="mt-4 rounded-xl overflow-hidden border">
                                        <MapContainer center={[Number(profile.latitude), Number(profile.longitude)]} zoom={13} style={{ height: 180 }}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            <Marker position={[Number(profile.latitude), Number(profile.longitude)]} />
                                        </MapContainer>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold mb-3">À propos</h3>
                        <p className="text-sm text-gray-700">{profile.bio || 'Aucune information supplémentaire.'}</p>
                    </div>

                    <div className="card p-6">
                        <h3 className="text-lg font-semibold mb-3">Avis récents</h3>
                        {reviewsLoading ? (
                            <div className="flex items-center justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-blood-600" /></div>
                        ) : recentReviews.length === 0 ? (
                            <p className="text-sm text-gray-400">Aucun avis pour l'instant</p>
                        ) : (
                            <div className="space-y-3">
                                {recentReviews.map((r: any) => (
                                    <div key={r.id} className="p-3 rounded-xl bg-gray-50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold">{r.patient?.firstName} {r.patient?.lastName}</p>
                                                <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StarIcon className="w-4 h-4 text-yellow-400" />
                                                <span className="font-bold">{r.rating}</span>
                                            </div>
                                        </div>
                                        {r.comment && <p className="text-sm text-gray-700 mt-2">{r.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                  

                    <div className="card p-6">
                        <h4 className="text-sm text-gray-500 mb-2">Contact</h4>
                        <p className="text-sm">{profile.email || '—'}</p>
                    </div>
                </div>
            </div>

            <ConsultationModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleSendConsultation}
                submitting={submitting}
            />
        </div>
    );
}