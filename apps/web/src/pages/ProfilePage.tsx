import { useState, useEffect, useRef } from 'react';
import {
  Mail, Phone, MapPin, Droplets, Calendar,
  Shield, CheckCircle, Edit3, Save, Loader2,
  Camera, X, Home,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore }   from '../store/useAuthStore';
import { authService }    from '../services/authService';
import api                from '../services/api';
import { BLOOD_GROUP_LABELS } from '../types';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [loading,      setLoading]      = useState(false);
  const [fetching,     setFetching]     = useState(true);
  const [editing,      setEditing]      = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ phone: '', address: '', city: '' });

  useEffect(() => {
    authService.getProfile().then((profile) => {
      updateUser(profile);
      setForm({ phone: profile.phone || '', address: profile.address || '', city: profile.city || '' });
    }).catch(() => toast.error('Erreur chargement profil'))
      .finally(() => setFetching(false));
  }, []);

  // ✅ رفع الصورة مباشرةً لـ Cloudinary عبر الـ backend
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La photo ne doit pas dépasser 2 MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      updateUser({ avatar: res.data.avatar });
      toast.success('✅ Photo mise à jour');
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploadingAvatar(false);
      // reset input
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setForm({ phone: user?.phone || '', address: user?.address || '', city: user?.city || '' });
  };

  const handleToggleAvailability = async () => {
    try {
      const res = await api.patch('/users/toggle-availability');
      updateUser({ isAvailable: res.data.isAvailable });
      toast.success(res.data.isAvailable ? 'Disponible ✅' : 'Indisponible');
    } catch {
      toast.error('Erreur');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.patch('/users/profile', {
        phone:   form.phone   || undefined,
        address: form.address || undefined,
        city:    form.city    || undefined,
      });
      updateUser(res.data);
      setEditing(false);
      toast.success('✅ Profil mis à jour');
    } catch {
      toast.error('Erreur mise à jour');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blood-600 border-t-transparent" />
    </div>
  );

  if (!user) return null;

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  const daysSince = user.lastDonationAt
    ? Math.floor((Date.now() - new Date(user.lastDonationAt).getTime()) / 86400000)
    : null;
  const canDonate = daysSince === null || daysSince >= 56;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>

      {/* ── Profile Card ── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-blood-100 flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-blood-700 font-bold text-2xl">{initials}</span>
                )}
                {/* Loading overlay */}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* زر الكاميرا — دائماً ظاهر */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                title="Changer la photo"
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-blood-600 text-white
                           rounded-full flex items-center justify-center shadow-md
                           hover:bg-blood-700 transition-colors disabled:opacity-50">
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileRef} type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            {/* Infos */}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="badge bg-blood-100 text-blood-700">
                  {BLOOD_GROUP_LABELS[user.bloodGroup]}
                </span>
                <span className="badge bg-blue-100 text-blue-700 capitalize">
                  {user.role.toLowerCase()}
                </span>
                {user.isVerified && (
                  <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> V��rifié
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-2">
            {editing && (
              <button onClick={handleCancelEdit}
                className="btn-secondary flex items-center gap-2 text-sm">
                <X className="w-4 h-4" /> Annuler
              </button>
            )}
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={loading}
              className={`flex items-center gap-2 text-sm ${editing ? 'btn-primary' : 'btn-secondary'}`}>
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : editing
                  ? <><Save className="w-4 h-4" /> Sauvegarder</>
                  : <><Edit3 className="w-4 h-4" /> Modifier</>}
            </button>
          </div>
        </div>

        {/* Champs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
            </div>
          </div>

          {/* Téléphone */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Téléphone</p>
              {editing ? (
                <input value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field text-sm mt-1 py-1" placeholder="+213 5XX XXX XXX" />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {user.phone || <span className="text-gray-400 italic text-xs">Non renseigné</span>}
                </p>
              )}
            </div>
          </div>

          {/* Ville */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Ville</p>
              {editing ? (
                <input value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="input-field text-sm mt-1 py-1" placeholder="Ex: Alger" />
              ) : (
                <p className="text-sm font-medium text-gray-900">
                  {user.city || <span className="text-gray-400 italic text-xs">Non renseignée</span>}
                </p>
              )}
            </div>
          </div>

          {/* Adresse */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Home className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Adresse</p>
              {editing ? (
                <input value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="input-field text-sm mt-1 py-1" placeholder="Ex: Rue Didouche Mourad" />
              ) : (
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.address || <span className="text-gray-400 italic text-xs">Non renseignée</span>}
                </p>
              )}
            </div>
          </div>

          {/* Rôle */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Shield className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Rôle</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Donor Stats ── */}
      {user.role === 'DONOR' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques de don</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blood-50 rounded-xl">
              <Droplets className="w-8 h-8 text-blood-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blood-700">{user.totalDonations ?? 0}</p>
              <p className="text-sm text-blood-600">Dons effectués</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <Calendar className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">
                {user.lastDonationAt
                  ? new Date(user.lastDonationAt).toLocaleDateString('fr-FR')
                  : 'Aucun don'}
              </p>
              <p className="text-sm text-gray-500">Dernier don</p>
            </div>
            <div className={`text-center p-4 rounded-xl ${canDonate ? 'bg-green-50' : 'bg-orange-50'}`}>
              <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${canDonate ? 'text-green-600' : 'text-orange-500'}`} />
              <p className={`text-sm font-bold ${canDonate ? 'text-green-700' : 'text-orange-600'}`}>
                {canDonate ? 'Éligible' : `${56 - (daysSince || 0)}j restants`}
              </p>
              <p className="text-sm text-gray-500">Éligibilité</p>
            </div>
          </div>

          {/* Toggle */}
          <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">Disponibilité</p>
              <p className="text-sm text-gray-500">
                {user.isAvailable ? 'Vous recevez les notifications' : 'Notifications désactivées'}
              </p>
            </div>
            <button onClick={handleToggleAvailability}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300
                ${user.isAvailable ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow
                transition-transform duration-300
                ${user.isAvailable ? 'translate-x-7' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}