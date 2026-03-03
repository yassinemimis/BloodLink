import { useState, useEffect } from 'react';
import { Building2, MapPin, Phone, Mail, Clock, Droplets } from 'lucide-react';
import api from '../services/api';
import type { Center } from '../types';
import { BLOOD_GROUP_LABELS } from '../types';

export default function CentersPage() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    try {
      const response = await api.get('/centers', { params: { limit: 50 } });
      setCenters(response.data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCenters = centers.filter((c) =>
    searchCity ? c.city.toLowerCase().includes(searchCity.toLowerCase()) : true,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centres de collecte</h1>
          <p className="text-gray-500 text-sm mt-1">
            {centers.length} centres de collecte actifs
          </p>
        </div>
        <input
          value={searchCity}
          onChange={(e) => setSearchCity(e.target.value)}
          placeholder="Filtrer par ville..."
          className="input-field text-sm w-full sm:w-64"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blood-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCenters.map((center) => (
            <div key={center.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-blood-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-blood-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{center.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{center.address}, {center.city}</span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {center.phone && (
                  <a href={`tel:${center.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blood-600">
                    <Phone className="w-4 h-4 text-gray-400" /> {center.phone}
                  </a>
                )}
                {center.email && (
                  <a href={`mailto:${center.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blood-600">
                    <Mail className="w-4 h-4 text-gray-400" /> {center.email}
                  </a>
                )}
                {center.openingHours && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" /> {center.openingHours}
                  </div>
                )}
              </div>

              {/* Blood Stock */}
              {center.bloodStocks && center.bloodStocks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-4 h-4 text-blood-600" />
                    <span className="text-sm font-semibold text-gray-700">Stock disponible</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {center.bloodStocks.map((stock) => {
                      let bgColor = 'bg-green-50 border-green-200 text-green-700';
                      if (stock.unitsAvailable < 5) bgColor = 'bg-red-50 border-red-200 text-red-700';
                      else if (stock.unitsAvailable < 15) bgColor = 'bg-yellow-50 border-yellow-200 text-yellow-700';

                      return (
                        <div
                          key={stock.id}
                          className={`text-center p-2 rounded-lg border ${bgColor}`}
                        >
                          <p className="text-xs font-bold">
                            {BLOOD_GROUP_LABELS[stock.bloodGroup]}
                          </p>
                          <p className="text-lg font-bold">{stock.unitsAvailable}</p>
                          <p className="text-[10px]">unités</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredCenters.length === 0 && (
            <div className="col-span-2 card text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun centre trouvé</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}