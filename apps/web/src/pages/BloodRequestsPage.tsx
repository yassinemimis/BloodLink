import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Filter, Search, Droplets } from 'lucide-react';
import { bloodRequestService } from '../services/bloodRequestService';
import type { BloodRequest } from '../types';
import {
  BloodGroup,
  UrgencyLevel,
  RequestStatus,
  BLOOD_GROUP_LABELS,
  URGENCY_LABELS,
  URGENCY_COLORS,
  STATUS_LABELS,
  Role,
} from '../types';
import { useAuthStore } from '../store/useAuthStore';
export default function BloodRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterUrgency, setFilterUrgency] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRequests();
  }, [page, filterStatus, filterUrgency]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filterStatus) params.status = filterStatus;
      if (filterUrgency) params.urgencyLevel = filterUrgency;

      const response = await bloodRequestService.findAll(params);
      setRequests(response.data);
      setTotalPages(response.meta.totalPages);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      req.hospital.toLowerCase().includes(term) ||
      req.patient?.firstName?.toLowerCase().includes(term) ||
      req.patient?.lastName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes de sang</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gérez et suivez toutes les demandes de transfusion
          </p>
        </div>
     {/* ✅ مخفي عن DONOR */}
        {user?.role !== Role.DONOR && (
          <button
            onClick={() => navigate('/requests1/new')}
            className="btn-primary flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Nouvelle demande
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par patient ou hôpital..."
              className="input-field pl-10 text-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="input-field text-sm w-full md:w-48"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Urgency Filter */}
          <select
            value={filterUrgency}
            onChange={(e) => { setFilterUrgency(e.target.value); setPage(1); }}
            className="input-field text-sm w-full md:w-48"
          >
            <option value="">Toutes les urgences</option>
            {Object.entries(URGENCY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blood-600 border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Patient</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Groupe</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Unités</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Urgence</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Hôpital</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Statut</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/requests/${request.id}`)}
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blood-100 rounded-full flex items-center justify-center">
                            <Droplets className="w-4 h-4 text-blood-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {request.patient?.firstName} {request.patient?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span className="badge bg-blood-100 text-blood-700 text-sm">
                          {BLOOD_GROUP_LABELS[request.bloodGroup]}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-sm">
                        <span className="text-gray-900 font-medium">{request.unitsFulfilled}</span>
                        <span className="text-gray-400">/{request.unitsNeeded}</span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`badge ${URGENCY_COLORS[request.urgencyLevel]}`}>
                          {URGENCY_LABELS[request.urgencyLevel]}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-sm text-gray-600">{request.hospital}</td>
                      <td className="py-3 px-5 text-sm text-gray-600">{STATUS_LABELS[request.status]}</td>
                      <td className="py-3 px-5 text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {page} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}