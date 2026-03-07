import { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Shield, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { BLOOD_GROUP_LABELS } from '../types';

interface UserItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  bloodGroup: string;
  isVerified: boolean;
  isAvailable: boolean;
  city?: string;
  totalDonations: number;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN:   '⚙️ Admin',
  DOCTOR:  '👨‍⚕️ Médecin',
  DONOR:   '💉 Donneur',
  PATIENT: '🏥 Patient',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN:   'bg-purple-100 text-purple-700',
  DOCTOR:  'bg-blue-100 text-blue-700',
  DONOR:   'bg-blood-100 text-blood-700',
  PATIENT: 'bg-green-100 text-green-700',
};

export default function VerificationPage() {
  const [users, setUsers]           = useState<UserItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterVerified, setFilterVerified] = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [toggling, setToggling]     = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, [page, filterRole, filterVerified]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadUsers(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (filterRole)    params.role       = filterRole;
      if (filterVerified !== '') params.isVerified = filterVerified === 'true';
      if (search)        params.search     = search;

      const res = await api.get('/users', { params });
      setUsers(res.data.data);
      setTotalPages(res.data.meta.totalPages);
      setTotal(res.data.meta.total);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerify = async (userId: string, current: boolean) => {
    setToggling(userId);
    try {
      await api.patch(`/users/${userId}/verify`);
      toast.success(current ? '❌ Vérification retirée' : '✅ Utilisateur vérifié !');
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, isVerified: !u.isVerified } : u)
      );
    } catch {
      toast.error('Erreur');
    } finally {
      setToggling(null);
    }
  };

  const verified   = users.filter((u) => u.isVerified).length;
  const unverified = users.filter((u) => !u.isVerified).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-7 h-7 text-blood-600" /> Vérification des utilisateurs
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Gérez les vérifications des comptes utilisateurs
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-3xl font-bold text-gray-900">{total}</p>
            </div>
            <Users className="w-10 h-10 text-gray-300" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Vérifiés</p>
              <p className="text-3xl font-bold text-green-600">{verified}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-200" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Non vérifiés</p>
              <p className="text-3xl font-bold text-orange-500">{unverified}</p>
            </div>
            <XCircle className="w-10 h-10 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="input-field pl-10 text-sm"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
            className="input-field text-sm w-full md:w-44"
          >
            <option value="">Tous les rôles</option>
            <option value="DONOR">Donneurs</option>
            <option value="PATIENT">Patients</option>
            <option value="DOCTOR">Médecins</option>
          </select>
          <select
            value={filterVerified}
            onChange={(e) => { setFilterVerified(e.target.value); setPage(1); }}
            className="input-field text-sm w-full md:w-44"
          >
            <option value="">Tous les statuts</option>
            <option value="true">Vérifiés</option>
            <option value="false">Non vérifiés</option>
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
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Utilisateur</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Rôle</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Groupe</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Ville</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Statut</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Inscrit le</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase py-3 px-5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blood-100 rounded-full flex items-center justify-center text-blood-700 font-bold text-sm">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`badge text-xs ${ROLE_COLORS[u.role]}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className="badge bg-blood-50 text-blood-700 text-sm font-bold">
                          {BLOOD_GROUP_LABELS[u.bloodGroup as keyof typeof BLOOD_GROUP_LABELS]}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-sm text-gray-600">
                        {u.city || '—'}
                      </td>
                      <td className="py-3 px-5">
                        {u.isVerified ? (
                          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" /> Vérifié
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-500 text-sm font-medium">
                            <XCircle className="w-4 h-4" /> Non vérifié
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-5">
                        <button
                          onClick={() => handleToggleVerify(u.id, u.isVerified)}
                          disabled={toggling === u.id}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-all ${
                            u.isVerified
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {toggling === u.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : u.isVerified
                              ? <><XCircle className="w-3 h-3" /> Retirer</>
                              : <><CheckCircle className="w-3 h-3" /> Vérifier</>
                          }
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">Aucun utilisateur trouvé</p>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {page} sur {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
                >Précédent</button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
                >Suivant</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}