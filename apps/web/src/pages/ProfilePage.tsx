import { useState, useEffect } from 'react';
import {
  Mail, Phone, MapPin, Droplets,
  Calendar, Shield, CheckCircle,
  Edit3, Save, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { authService } from '../services/authService';
import api from '../services/api';
import { BLOOD_GROUP_LABELS } from '../types';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true); // ✅ جلب البيانات
  const [editing, setEditing]   = useState(false);
  const [form, setForm] = useState({
    phone:   user?.phone   || '',
    address: user?.address || '',
    city:    user?.city    || '',
  });

  // ✅ جلب البيانات الكاملة عند فتح الصفحة
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await authService.getProfile();
        updateUser(profile); // تحديث الـ store بالبيانات الكاملة
        setForm({
          phone:   profile.phone   || '',
          address: profile.address || '',
          city:    profile.city    || '',
        });
      } catch (error) {
        toast.error('Erreur lors du chargement du profil');
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, []);

  const handleToggleAvailability = async () => {
    try {
      const response = await api.patch('/users/toggle-availability');
      updateUser({ isAvailable: response.data.isAvailable });
      toast.success(
        response.data.isAvailable
          ? 'Vous êtes maintenant disponible'
          : 'Vous êtes maintenant indisponible',
      );
    } catch (error) {
      toast.error('Erreur lors du changement de disponibilité');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (form.city) {
        await api.patch('/users/location', {
          latitude:  user?.latitude  || 0,
          longitude: user?.longitude || 0,
          address:   form.address,
          city:      form.city,
        });
      }
      updateUser(form);
      setEditing(false);
      toast.success('Profil mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blood-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const daysSinceLastDonation = user.lastDonationAt
    ? Math.floor((Date.now() - new Date(user.lastDonationAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const canDonate = daysSinceLastDonation === null || daysSinceLastDonation >= 56;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>

      {/* Profile Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-blood-100 rounded-2xl flex items-center justify-center">
              <span className="text-blood-700 font-bold text-2xl">
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge bg-blood-100 text-blood-700">
                  {BLOOD_GROUP_LABELS[user.bloodGroup]}
                </span>
                <span className="badge bg-blue-100 text-blue-700 capitalize">
                  {user.role.toLowerCase()}
                </span>
                {user.isVerified && (
                  <span className="badge bg-green-100 text-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" /> Vérifié
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className={editing
              ? 'btn-primary flex items-center gap-2 text-sm'
              : 'btn-secondary flex items-center gap-2 text-sm'}
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : editing
                ? <><Save className="w-4 h-4" /> Sauvegarder</>
                : <><Edit3 className="w-4 h-4" /> Modifier</>
            }
          </button>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Phone className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Téléphone</p>
              {editing ? (
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field text-sm mt-1 py-1"
                  placeholder="+213 5XX XXX XXX"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {user.phone || 'Non renseigné'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <MapPin className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Ville</p>
              {editing ? (
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="input-field text-sm mt-1 py-1"
                  placeholder="Ex: Alger"
                />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {user.city || 'Non renseignée'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Shield className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Rôle</p>
              <p className="text-sm font-medium text-gray-900 capitalize">
                {user.role.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Donor Stats */}
      {user.role === 'DONOR' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques de don</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            <div className="text-center p-4 bg-blood-50 rounded-lg">
              <Droplets className="w-8 h-8 text-blood-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blood-700">{user.totalDonations ?? 0}</p>
              <p className="text-sm text-blood-600">Dons effectués</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Calendar className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">
                {user.lastDonationAt
                  ? new Date(user.lastDonationAt).toLocaleDateString('fr-FR')
                  : 'Aucun don'}
              </p>
              <p className="text-sm text-gray-500">Dernier don</p>
            </div>

            <div className={`text-center p-4 rounded-lg ${canDonate ? 'bg-green-50' : 'bg-orange-50'}`}>
              <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${canDonate ? 'text-green-600' : 'text-orange-500'}`} />
              <p className={`text-sm font-bold ${canDonate ? 'text-green-700' : 'text-orange-600'}`}>
                {canDonate ? 'Éligible' : `${56 - (daysSinceLastDonation || 0)}j restants`}
              </p>
              <p className="text-sm text-gray-500">Éligibilité</p>
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Disponibilité</p>
              <p className="text-sm text-gray-500">
                {user.isAvailable
                  ? 'Vous recevez les notifications de demandes'
                  : 'Vous ne recevez pas les notifications'}
              </p>
            </div>
            <button
              onClick={handleToggleAvailability}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                user.isAvailable ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${
                user.isAvailable ? 'translate-x-7' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}