import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, AlertTriangle, TrendingUp, Activity,
  Clock, Heart, CheckCircle, Award,
  PlusCircle, ArrowRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuthStore } from '../store/useAuthStore';
import { bloodRequestService } from '../services/bloodRequestService';
import {
  BLOOD_GROUP_LABELS, URGENCY_LABELS, URGENCY_COLORS,
  STATUS_LABELS, BloodGroup, UrgencyLevel, RequestStatus,
} from '../types';

const PIE_COLORS = ['#DC2626','#EA580C','#D97706','#65A30D','#059669','#0891B2','#2563EB','#7C3AED'];

// ======================== INTERFACES ========================
interface PatientRequest {
  id: string;
  bloodGroup: BloodGroup;
  urgencyLevel: UrgencyLevel;
  status: RequestStatus;
  hospital: string;
  unitsNeeded: number;
  unitsFulfilled: number;
  createdAt: string;
  donations: { id: string; status: string }[];
}

interface DonorDonation {
  id: string;
  status: string;
  createdAt: string;
  request: {
    id: string;
    bloodGroup: BloodGroup;
    hospital: string;
    urgencyLevel: UrgencyLevel;
    status: string;
  };
}

interface ActiveRequest {
  id: string;
  bloodGroup: BloodGroup;
  urgencyLevel: UrgencyLevel;
  status: string;
  hospital: string;
  patient?: { firstName: string; lastName: string };
}

interface PatientStats {
  role: 'PATIENT';
  myTotal: number;
  myPending: number;
  myMatched: number;
  myFulfilled: number;
  myCancelled: number;
  myRequests: PatientRequest[];
}

interface DonorStats {
  role: 'DONOR';
  totalDonations: number;
  totalAccepted: number;
  totalCompleted: number;
  isAvailable: boolean;
  daysUntilNextDonation: number;
  lastDonationAt: string | null;
  recentDonations: DonorDonation[];
  activeRequests: ActiveRequest[];
}

interface AdminStats {
  role?: never;
  totalRequests: number;
  pendingRequests: number;
  fulfilledRequests: number;
  criticalRequests: number;
  fulfillmentRate: string | number;
  requestsByBloodGroup: { bloodGroup: BloodGroup; _count: { id: number } }[];
}

type DashboardData = PatientStats | DonorStats | AdminStats;

// ======================== COMPONENT ========================
export default function DashboardPage() {
  const { user }      = useAuthStore();
  const navigate      = useNavigate();
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const stats = await bloodRequestService.getStatistics();
      setData(stats as DashboardData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blood-600 border-t-transparent" />
      </div>
    );
  }

  // ======================== PATIENT ========================
  if (data && 'role' in data && data.role === 'PATIENT') {
    const patientData = data as PatientStats;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.firstName} 👋</h1>
            <p className="text-gray-500 mt-1">Suivi de vos demandes de sang</p>
          </div>
          <button onClick={() => navigate('/requests/new')} className="btn-primary flex items-center gap-2">
            <PlusCircle className="w-5 h-5" /> Nouvelle demande
          </button>
        </div>

        {/* Stats Patient */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total demandes',    value: patientData.myTotal,     color: 'bg-blood-100 text-blood-700',   icon: Droplets    },
            { label: 'En attente',        value: patientData.myPending,   color: 'bg-orange-100 text-orange-700', icon: Clock       },
            { label: 'Donneur trouvé',    value: patientData.myMatched,   color: 'bg-blue-100 text-blue-700',     icon: Heart       },
            { label: 'Satisfaites',       value: patientData.myFulfilled, color: 'bg-green-100 text-green-700',   icon: CheckCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Demandes récentes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Mes demandes récentes</h3>
            <button onClick={() => navigate('/requests')}
              className="text-sm text-blood-600 hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {patientData.myRequests?.length > 0 ? (
            <div className="space-y-3">
              {patientData.myRequests.map((req: PatientRequest) => (
                <div key={req.id}
                  onClick={() => navigate(`/requests/${req.id}`)}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blood-100 rounded-xl flex items-center justify-center">
                      <span className="font-bold text-blood-700">
                        {BLOOD_GROUP_LABELS[req.bloodGroup]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{req.hospital}</p>
                      <p className="text-sm text-gray-500">
                        {req.unitsNeeded} unité(s) •{' '}
                        {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                      {req.donations?.length > 0 && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          ✅ {req.donations.length} donneur(s) ont accepté
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`badge text-xs ${URGENCY_COLORS[req.urgencyLevel]}`}>
                      {URGENCY_LABELS[req.urgencyLevel]}
                    </span>
                    <span className="text-xs text-gray-500">{STATUS_LABELS[req.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Droplets className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500">Aucune demande pour le moment</p>
              <button onClick={() => navigate('/requests/new')} className="btn-primary mt-4 text-sm">
                Créer ma première demande
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ======================== DONOR ========================
  if (data && 'role' in data && data.role === 'DONOR') {
    const donorData = data as DonorStats;
    const canDonate = donorData.daysUntilNextDonation === 0;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.firstName} 👋</h1>
          <p className="text-gray-500 mt-1">Merci pour votre générosité !</p>
        </div>

        {/* Statut disponibilité */}
        <div className={`card border-2 ${canDonate ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${canDonate ? 'bg-green-200' : 'bg-orange-200'}`}>
              {canDonate
                ? <CheckCircle className="w-7 h-7 text-green-700" />
                : <Clock className="w-7 h-7 text-orange-700" />}
            </div>
            <div>
              {canDonate ? (
                <>
                  <p className="font-bold text-green-800 text-lg">Vous pouvez donner ! 🩸</p>
                  <p className="text-green-700 text-sm">Votre sang est prêt à sauver des vies</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-orange-800 text-lg">
                    Prochain don dans {donorData.daysUntilNextDonation} jours
                  </p>
                  <p className="text-orange-700 text-sm">
                    Dernier don :{' '}
                    {donorData.lastDonationAt
                      ? new Date(donorData.lastDonationAt).toLocaleDateString('fr-FR')
                      : '—'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Donor */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Total dons',   value: donorData.totalDonations, icon: Award,       color: 'bg-blood-100 text-blood-700'  },
            { label: 'En cours',     value: donorData.totalAccepted,  icon: Heart,       color: 'bg-blue-100 text-blue-700'   },
            { label: 'Complétés',    value: donorData.totalCompleted, icon: CheckCircle, color: 'bg-green-100 text-green-700' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Demandes actives */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Demandes actives à proximité</h3>
            <button onClick={() => navigate('/requests')}
              className="text-sm text-blood-600 hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {donorData.activeRequests?.length > 0 ? (
            <div className="space-y-3">
              {donorData.activeRequests.map((req: ActiveRequest) => (
                <div key={req.id}
                  onClick={() => navigate(`/requests/${req.id}`)}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-blood-50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blood-100 rounded-xl flex items-center justify-center">
                      <span className="font-bold text-blood-700 text-sm">
                        {BLOOD_GROUP_LABELS[req.bloodGroup]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{req.hospital}</p>
                      <p className="text-sm text-gray-500">
                        {req.patient?.firstName} {req.patient?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${URGENCY_COLORS[req.urgencyLevel]}`}>
                      {URGENCY_LABELS[req.urgencyLevel]}
                    </span>
                    <ArrowRight className="w-4 h-4 text-blood-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">Aucune demande active pour le moment</p>
          )}
        </div>
      </div>
    );
  }

  // ======================== ADMIN / DOCTOR ========================
  const adminData = data as AdminStats | null;
  const bloodGroupChartData = adminData?.requestsByBloodGroup?.map((item) => ({
    name: BLOOD_GROUP_LABELS[item.bloodGroup] || item.bloodGroup,
    value: item._count.id,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.firstName} 👋</h1>
        <p className="text-gray-500 mt-1">Aperçu de l'activité BloodLink</p>
      </div>

      {/* Stats Admin/Doctor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total demandes',    value: adminData?.totalRequests    || 0, color: 'bg-blood-100 text-blood-600',   icon: Droplets      },
          { label: 'En attente',        value: adminData?.pendingRequests  || 0, color: 'bg-orange-100 text-orange-600', icon: Clock         },
          { label: 'Satisfaites',       value: adminData?.fulfilledRequests|| 0, color: 'bg-green-100 text-green-600',   icon: TrendingUp    },
          { label: 'Urgences critiques',value: adminData?.criticalRequests || 0, color: 'bg-red-100 text-red-600',       icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Demandes par groupe sanguin</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={bloodGroupChartData} cx="50%" cy="50%"
                innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {bloodGroupChartData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribution par groupe</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bloodGroupChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Taux */}
      <div className="card flex items-center gap-4">
        <Activity className="w-8 h-8 text-blood-500" />
        <div>
          <p className="text-sm text-gray-500">Taux de satisfaction global</p>
          <p className="text-2xl font-bold text-gray-900">{adminData?.fulfillmentRate || 0}%</p>
        </div>
      </div>
    </div>
  );
}