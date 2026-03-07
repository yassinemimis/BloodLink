import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Clock, User, Phone,
  Building2, CheckCircle, XCircle, AlertTriangle,
  Loader2, Heart, Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { bloodRequestService } from '../services/bloodRequestService';
import type { BloodRequest } from '../types';
import {
  BLOOD_GROUP_LABELS, URGENCY_LABELS, URGENCY_COLORS, STATUS_LABELS, Role,
} from '../types';
import { useAuthStore } from '../store/useAuthStore';

// ألوان وتسميات حالة التبرع
const donationStatusColors: Record<string, string> = {
  NOTIFIED: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const donationStatusLabels: Record<string, string> = {
  NOTIFIED: '📤 Notifié',
  ACCEPTED: '✅ A accepté',
  IN_PROGRESS: '🔄 En cours',
  COMPLETED: '🎉 Complété',
  REJECTED: '❌ A refusé',
  CANCELLED: '🚫 Annulé',
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  // أضف هذا الـ state في أعلى الـ component
  const [completing, setCompleting] = useState<string | null>(null);

  // أضف هذه الدالة
  const handleCompleteDonation = async (donationId: string) => {
    if (!confirm('Confirmer que ce donneur a bien effectué le don ?')) return;
    setCompleting(donationId);
    try {
      await api.patch(`/donations/${donationId}/complete`);
      toast.success('🎉 Don confirmé ! Merci pour votre vie sauvée.');
      loadRequest();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    } finally {
      setCompleting(null);
    }
  };
  useEffect(() => { if (id) loadRequest(); }, [id]);

  const loadRequest = async () => {
    try {
      const data = await bloodRequestService.findOne(id!);
      setRequest(data);
    } catch {
      toast.error('Demande non trouvée');
      navigate('/requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptDonation = async () => {
    if (!confirm('Voulez-vous accepter cette demande de don de sang ?')) return;
    setAccepting(true);
    try {
      await api.post('/donations/accept', { requestId: id });
      toast.success('🩸 Merci ! Votre acceptation a été enregistrée.');
      loadRequest();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    } finally {
      setAccepting(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) return;
    try {
      await bloodRequestService.cancel(id!);
      toast.success('Demande annulée');
      loadRequest();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blood-600" />
      </div>
    );
  }

  if (!request) return null;

  const progressPercent = Math.min(100, (request.unitsFulfilled / request.unitsNeeded) * 100);
  const acceptedDonations = request.donations?.filter(d => ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(d.status)) || [];
  const alreadyAccepted = request.donations?.some(d => d.donorId === user?.id && !['REJECTED', 'CANCELLED'].includes(d.status));
  const isDonor = user?.role === Role.DONOR;
  const isActive = !['FULFILLED', 'CANCELLED'].includes(request.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Détails de la demande</h1>
            <p className="text-gray-500 text-sm mt-1">#{request.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        {request.patientId === user?.id && request.status === 'PENDING' && (
          <button onClick={handleCancel} className="btn-danger flex items-center gap-2 text-sm">
            <XCircle className="w-4 h-4" /> Annuler
          </button>
        )}
      </div>

      {/* ✅ بطاقة القبول للـ Donor */}
      {isDonor && isActive && !alreadyAccepted && (
        <div className="card border-2 border-blood-200 bg-blood-50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blood-100 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-blood-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Pouvez-vous aider ?</p>
                <p className="text-sm text-gray-500">
                  {request.hospital} — besoin de{' '}
                  <span className="font-bold text-blood-600">{BLOOD_GROUP_LABELS[request.bloodGroup]}</span>
                </p>
              </div>
            </div>
            <button onClick={handleAcceptDonation} disabled={accepting}
              className="btn-primary flex items-center gap-2 px-6">
              {accepting ? <Loader2 className="w-5 h-5 animate-spin" /> : '🩸 Accepter de donner'}
            </button>
          </div>
        </div>
      )}

      {/* Déjà accepté */}
      {isDonor && alreadyAccepted && (
        <div className="card border-2 border-green-200 bg-green-50 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <p className="text-green-700 font-medium">Vous avez déjà accepté cette demande. Merci ! 🙏</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">

          {/* Carte principale */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blood-100 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-blood-700">
                    {BLOOD_GROUP_LABELS[request.bloodGroup]}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Sang {BLOOD_GROUP_LABELS[request.bloodGroup]} — {request.hospital}
                  </h2>
                  <span className={`badge mt-1 ${URGENCY_COLORS[request.urgencyLevel]}`}>
                    {URGENCY_LABELS[request.urgencyLevel]}
                  </span>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {STATUS_LABELS[request.status]}
              </span>
            </div>

            {/* Barre de progression */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">Progression</span>
                <span className="font-bold text-blood-600">
                  {request.unitsFulfilled} / {request.unitsNeeded} unités
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blood-600 rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{progressPercent.toFixed(0)}% complété</p>
            </div>

            {/* Infos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Building2 className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Hôpital</p>
                  <p className="text-sm font-medium">{request.hospital}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Créée le</p>
                  <p className="text-sm font-medium">
                    {new Date(request.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Rayon</p>
                  <p className="text-sm font-medium">{request.searchRadius} km</p>
                </div>
              </div>
              {request.urgencyLevel === 'CRITICAL' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <p className="text-sm font-medium text-red-700">Urgence critique !</p>
                </div>
              )}
            </div>

            {request.description && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700">{request.description}</p>
              </div>
            )}
          </div>

          {/* ✅ Liste des donneurs avec détails complets */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Réponses des donneurs
              </h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {request.donations?.length || 0} réponse(s)
              </span>
            </div>

            {request.donations && request.donations.length > 0 ? (
              <div className="space-y-4">
                {request.donations.map((donation) => (
                  <div key={donation.id}
                    className={`p-4 rounded-xl border-2 transition-all
                      ${donation.status === 'ACCEPTED' ? 'border-green-200 bg-green-50' : ''}
                      ${donation.status === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50' : ''}
                      ${donation.status === 'REJECTED' ? 'border-red-100 bg-red-50/50' : ''}
                      ${donation.status === 'NOTIFIED' ? 'border-gray-100 bg-gray-50' : ''}
                      ${donation.status === 'IN_PROGRESS' ? 'border-yellow-200 bg-yellow-50' : ''}
                    `}
                  >
                    <div className="flex items-start justify-between gap-4">

                      {/* Infos Donor */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                          ${donation.status === 'ACCEPTED' ? 'bg-green-200 text-green-800' :
                            donation.status === 'COMPLETED' ? 'bg-emerald-200 text-emerald-800' :
                              donation.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                                'bg-blood-100 text-blood-700'}`}
                        >
                          {donation.donor?.firstName?.[0]}{donation.donor?.lastName?.[0]}
                        </div>

                        <div className="flex-1">
                          {/* Nom + Groupe */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">
                              {donation.donor?.firstName} {donation.donor?.lastName}
                            </p>
                            {donation.donor?.bloodGroup && (
                              <span className="badge bg-blood-100 text-blood-700 text-xs">
                                🩸 {BLOOD_GROUP_LABELS[donation.donor.bloodGroup]}
                              </span>
                            )}
                          </div>

                          {/* Détails */}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {donation.donor?.city && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" /> {donation.donor.city}
                              </span>
                            )}
                            {donation.donor?.totalDonations !== undefined && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Award className="w-3 h-3" />
                                {donation.donor.totalDonations} don(s) effectué(s)
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {new Date(donation.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short',
                                hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {/* ✅ Téléphone — visible pour le patient et l'admin */}
                          {(user?.role === Role.PATIENT || user?.role === 'ADMIN' as any) &&
                            donation.status === 'ACCEPTED' &&
                            donation.donor?.phone && (
                              <a href={`tel:${donation.donor.phone}`}
                                className="flex items-center gap-1 text-sm text-blood-600 hover:underline font-medium mt-2"
                              >
                                <Phone className="w-4 h-4" />
                                {donation.donor.phone}
                              </a>
                            )}
                        </div>
                      </div>

                      {/* Badge statut */}
                      <span className={`badge text-xs px-3 py-1 flex-shrink-0 ${donationStatusColors[donation.status]}`}>
                        {donationStatusLabels[donation.status]}
                      </span>
                    </div>

                    {/* Message selon le statut */}
                    {donation.status === 'ACCEPTED' && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-sm text-green-700 font-medium">
                          ✅ Ce donneur est prêt à donner — contactez-le pour coordonner le rendez-vous.
                        </p>
                      </div>
                    )}
                
                    {donation.status === 'ACCEPTED' && request.patientId === user?.id && (
                      <div className="mt-3 pt-3 border-t border-green-200 flex items-center justify-between">
                        <p className="text-sm text-green-700 font-medium">
                          ✅ Contactez ce donneur pour coordonner le rendez-vous.
                        </p>
                        <button
                          onClick={() => handleCompleteDonation(donation.id)}
                          disabled={completing === donation.id}
                          className="btn-primary text-sm flex items-center gap-2 py-1.5 px-4"
                        >
                          {completing === donation.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : '🎉 Confirmer le don'}
                        </button>
                      </div>
                    )}
                    {donation.status === 'COMPLETED' && (
                      <div className="mt-3 pt-3 border-t border-emerald-200">
                        <p className="text-sm text-emerald-700 font-medium">
                          🎉 Don effectué le {donation.completedAt
                            ? new Date(donation.completedAt).toLocaleDateString('fr-FR')
                            : '—'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <User className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">Aucun donneur n'a encore répondu</p>
                <p className="text-gray-400 text-sm mt-1">Les donneurs compatibles ont été notifiés</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">

          {/* Patient */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Patient</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blood-100 rounded-full flex items-center justify-center">
                <span className="text-blood-700 font-bold text-sm">
                  {request.patient?.firstName?.[0]}{request.patient?.lastName?.[0]}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {request.patient?.firstName} {request.patient?.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  {BLOOD_GROUP_LABELS[request.patient?.bloodGroup!]}
                </p>
              </div>
            </div>
            {request.patient?.phone && (
              <a href={`tel:${request.patient.phone}`}
                className="flex items-center gap-2 text-sm text-blood-600 hover:underline mt-3">
                <Phone className="w-4 h-4" /> {request.patient.phone}
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Statistiques</h3>
            {[
              { label: 'Statut', value: STATUS_LABELS[request.status] },
              { label: 'Unités req.', value: `${request.unitsNeeded}` },
              { label: 'Unités reçues', value: `${request.unitsFulfilled}`, color: 'text-green-600' },
              { label: 'Réponses', value: `${request.donations?.length || 0}` },
              { label: 'Acceptées', value: `${acceptedDonations.length}`, color: 'text-green-600' },
              { label: 'Rayon', value: `${request.searchRadius} km` },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className={`font-semibold ${color || 'text-gray-900'}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Expiry */}
          {request.expiresAt && (
            <div className="card bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-800">
                <Clock className="w-4 h-4" />
                <p className="text-sm font-medium">
                  Expire le {new Date(request.expiresAt).toLocaleDateString('fr-FR', {
                    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}