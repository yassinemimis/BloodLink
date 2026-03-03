import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets,
  Users,
  Building2,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAuthStore } from '../store/useAuthStore';
import { bloodRequestService } from '../services/bloodRequestService';
import type { BloodRequest } from '../types';
import {
  BLOOD_GROUP_LABELS,
  URGENCY_LABELS,
  URGENCY_COLORS,
  STATUS_LABELS,
} from '../types';

const PIE_COLORS = [
  '#DC2626', '#EA580C', '#D97706', '#65A30D',
  '#059669', '#0891B2', '#2563EB', '#7C3AED',
];

interface Stats {
  totalRequests: number;
  pendingRequests: number;
  fulfilledRequests: number;
  criticalRequests: number;
  fulfillmentRate: string | number;
  requestsByBloodGroup: { bloodGroup: string; _count: { id: number } }[];
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentRequests, setRecentRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, requestsData] = await Promise.all([
        bloodRequestService.getStatistics(),
        bloodRequestService.findAll({ limit: 5 }),
      ]);
      setStats(statsData);
      setRecentRequests(requestsData.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const bloodGroupChartData = stats?.requestsByBloodGroup?.map((item) => ({
    name: BLOOD_GROUP_LABELS[item.bloodGroup as keyof typeof BLOOD_GROUP_LABELS] || item.bloodGroup,
    value: item._count.id,
  })) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blood-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Voici un aperçu de l'activité BloodLink
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total demandes</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats?.totalRequests || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blood-100 rounded-xl flex items-center justify-center">
              <Droplets className="w-6 h-6 text-blood-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-green-600">
            <ArrowUpRight className="w-4 h-4" />
            <span>+12% ce mois</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {stats?.pendingRequests || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Satisfaites</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats?.fulfilledRequests || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-sm text-gray-500">
            <Activity className="w-4 h-4" />
            <span>Taux: {stats?.fulfillmentRate || 0}%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Urgences critiques</p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {stats?.criticalRequests || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Blood Groups */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Demandes par groupe sanguin
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={bloodGroupChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {bloodGroupChartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Activité récente
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bloodGroupChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Requests Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Dernières demandes
          </h3>
          <button
            onClick={() => navigate('/requests')}
            className="text-sm text-blood-600 hover:underline font-medium"
          >
            Voir tout →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">Patient</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">Groupe</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">Urgence</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">Hôpital</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">Statut</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentRequests.map((request) => (
                <tr
                  key={request.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/requests/${request.id}`)}
                >
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-gray-900">
                      {request.patient?.firstName} {request.patient?.lastName}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="badge bg-blood-100 text-blood-700">
                      {BLOOD_GROUP_LABELS[request.bloodGroup]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${URGENCY_COLORS[request.urgencyLevel]}`}>
                      {URGENCY_LABELS[request.urgencyLevel]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {request.hospital}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600">
                      {STATUS_LABELS[request.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}

              {recentRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Aucune demande pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}