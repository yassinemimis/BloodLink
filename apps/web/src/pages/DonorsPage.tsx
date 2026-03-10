import { useState, useEffect } from 'react';
import { Users, Search, MapPin, Droplets, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import type { User } from '../types';
import {   BLOOD_GROUP_LABELS } from '../types';

export default function DonorsPage() {
  const [donors, setDonors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBlood, setFilterBlood] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadDonors();
  }, [page, filterBlood, filterCity]);

  const loadDonors = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (filterBlood) params.bloodGroup = filterBlood;
      if (filterCity) params.city = filterCity;

      const response = await api.get('/users/donors', { params });
      setDonors(response.data.data);
      setTotalPages(response.data.meta.totalPages);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDonors = donors.filter((donor) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      donor.firstName.toLowerCase().includes(term) ||
      donor.lastName.toLowerCase().includes(term) ||
      donor.city?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Donneurs</h1>
        <p className="text-gray-500 text-sm mt-1">
          Liste de tous les donneurs inscrits sur la plateforme
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un donneur..."
              className="input-field pl-10 text-sm"
            />
          </div>
          <select
            value={filterBlood}
            onChange={(e) => { setFilterBlood(e.target.value); setPage(1); }}
            className="input-field text-sm w-full md:w-48"
          >
            <option value="">Tous les groupes</option>
            {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input
            type="text"
            value={filterCity}
            onChange={(e) => { setFilterCity(e.target.value); setPage(1); }}
            placeholder="Filtrer par ville..."
            className="input-field text-sm w-full md:w-48"
          />
        </div>
      </div>

      {/* Donors Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blood-600 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDonors.map((donor) => (
              <div key={donor.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blood-100 rounded-full flex items-center justify-center">
                      <span className="text-blood-700 font-bold">
                        {donor.firstName[0]}{donor.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {donor.firstName} {donor.lastName}
                      </p>
                      {donor.city && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {donor.city}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="badge bg-blood-100 text-blood-700 text-lg font-bold px-3">
                    {BLOOD_GROUP_LABELS[donor.bloodGroup]}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Droplets className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{donor.totalDonations} dons</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {donor.isAvailable ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 font-medium">Disponible</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-500">Indisponible</span>
                      </>
                    )}
                  </div>
                </div>

                {donor.lastDonationAt && (
                  <p className="text-xs text-gray-400 mt-3">
                    Dernier don : {new Date(donor.lastDonationAt).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            ))}
          </div>

          {filteredDonors.length === 0 && (
            <div className="card text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun donneur trouvé</p>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-50"
            >
              Précédent
            </button>
            <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-sm py-1.5 px-4 disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </>
      )}
    </div>
  );
}