import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Phone,
  Building2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { bloodRequestService } from '../services/bloodRequestService';
import type { BloodRequest } from '../types';
import {
  BLOOD_GROUP_LABELS,
  URGENCY_LABELS,
  URGENCY_COLORS,
  STATUS_LABELS,
  DonationStatus,
} from '../types';
import { useAuthStore } from '../store/useAuthStore';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [request, setRequest] = useState<BloodRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      const data = await bloodRequestService.findOne(id!);
      setRequest(data);
    } catch (error) {
      toast.error('Demande non trouvée');
      navigate('/requests');
    } finally {
      setLoading(false);
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

  const progressPercent = (request.unitsFulfilled / request.unitsNeeded) * 100;

  const donationStatusColors: Record<string, string> = {
    NOTIFIED: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-700',
  };

  const donationStatusLabels: Record<string, string> = {
    NOTIFIED: 'Notifié',
    ACCEPTED: 'Accepté',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Complété',
    REJECTED: 'Rejeté',
    CANCELLED: 'Annulé',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/requests')} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Détails de la demande</h1>
            <p className="text-gray-500 text-sm mt-1">ID: {request.id.slice(0, 8)}...</p>
          </div>
        </div>
        {request.patientId === user?.id && request.status === 'PENDING' && (
          <button onClick={handleCancel} className="btn-danger flex items-center gap-2 text-sm">
            <XCircle className="w-4 h-4" />
            Annuler
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Blood Group Card */}
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
                    Besoin de sang {BLOOD_GROUP_LABELS[request.bloodGroup]}
                  </h2>
                  <p className="text-gray-500 text-sm">{request.hospital}</p>
                </div>
              </div>
              <span className={`badge text-sm px-3 py-1 ${URGENCY_COLORS[request.urgencyLevel]}`}>
                {URGENCY_LABELS[request.urgencyLevel]}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progression</span>
                <span className="text-sm text-gray-500">
                  {request.unitsFulfilled} / {request.unitsNeeded} unités
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blood-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Building2 className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Hôpital</p>
                  <p className="text-sm font-medium text-gray-900">{request.hospital}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Créée le</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(request.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Rayon de recherche</p>
                  <p className="text-sm font-medium text-gray-900">{request.searchRadius} km</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <p className="text-sm font-medium text-gray-900">{STATUS_LABELS[request.status]}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {request.description && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-sm text-gray-600">{request.description}</p>
              </div>
            )}
          </div>

          {/* Donations List */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Réponses des donneurs ({request.donations?.length || 0})
            </h3>

            {request.donations && request.donations.length > 0 ? (
              <div className="space-y-3">
                {request.donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blood-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blood-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {donation.donor?.firstName} {donation.donor?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {donation.donor?.bloodGroup
                            ? BLOOD_GROUP_LABELS[donation.donor.bloodGroup]
                            : ''}{' '}
                          • {new Date(donation.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${donationStatusColors[donation.status]}`}>
                      {donationStatusLabels[donation.status]}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucun donneur n'a encore répondu</p>
                <p className="text-gray-400 text-sm mt-1">Les donneurs compatibles ont été notifiés</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Patient Info */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Patient</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blood-100 rounded-full flex items-center justify-center">
                <span className="text-blood-700 font-bold">
                  {request.patient?.firstName?.[0]}
                  {request.patient?.lastName?.[0]}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {request.patient?.firstName} {request.patient?.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  {BLOOD_GROUP_LABELS[request.patient?.bloodGroup!]}
                </p>
              </div>
            </div>
            {request.patient?.phone && (
              <a
                href={`tel:${request.patient.phone}`}
                className="flex items-center gap-2 text-sm text-blood-600 hover:underline"
              >
                <Phone className="w-4 h-4" />
                {request.patient.phone}
              </a>
            )}
          </div>

          {/* Doctor Info */}
          {request.doctor && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Médecin traitant</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-sm">Dr</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Dr. {request.doctor.firstName} {request.doctor.lastName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Expiry */}
          {request.expiresAt && (
            <div className="card bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-800">
                <Clock className="w-5 h-5" />
                <p className="text-sm font-medium">
                  Expire le{' '}
                  {new Date(request.expiresAt).toLocaleDateString('fr-FR', {
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