import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { bloodRequestService } from '../services/bloodRequestService';
import { BloodGroup, UrgencyLevel, BLOOD_GROUP_LABELS, URGENCY_LABELS } from '../types';

const requestSchema = z.object({
  bloodGroup: z.nativeEnum(BloodGroup),
  urgencyLevel: z.nativeEnum(UrgencyLevel),
  unitsNeeded: z.number().min(1).max(20),
  hospital: z.string().min(3, "Nom de l'hôpital requis"),
  description: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  searchRadius: z.number().optional(),
});

type RequestForm = z.infer<typeof requestSchema>;

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      unitsNeeded: 1,
      searchRadius: 25,
      latitude: 0,
      longitude: 0,
    },
  });

  const urgencyLevel = watch('urgencyLevel');
  const latitude = watch('latitude');

  const getLocation = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setValue('latitude', position.coords.latitude);
          setValue('longitude', position.coords.longitude);
          toast.success('Position détectée avec succès');
          setLocating(false);
        },
        () => {
          toast.error('Impossible de détecter la position');
          setLocating(false);
        },
      );
    } else {
      toast.error("La géolocalisation n'est pas supportée");
      setLocating(false);
    }
  };

  const onSubmit = async (data: RequestForm) => {
    if (data.latitude === 0 && data.longitude === 0) {
      toast.error('Veuillez détecter votre position');
      return;
    }
    setLoading(true);
    try {
      const result = await bloodRequestService.create(data);
      toast.success(
        `Demande créée ! ${result.matching.donorsFound} donneurs compatibles trouvés`,
      );
      navigate(`/requests/${result.request.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouvelle demande de sang</h1>
          <p className="text-gray-500 text-sm mt-1">
            Remplissez le formulaire pour créer une demande
          </p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Blood Group */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Groupe sanguin requis *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    value={value}
                    {...register('bloodGroup')}
                    className="peer hidden"
                  />
                  <div className="py-3 rounded-lg border-2 border-gray-200 text-center font-bold text-lg transition-all peer-checked:border-blood-600 peer-checked:bg-blood-50 peer-checked:text-blood-700 hover:border-gray-300">
                    {label}
                  </div>
                </label>
              ))}
            </div>
            {errors.bloodGroup && (
              <p className="text-red-500 text-sm mt-1">Sélectionnez un groupe sanguin</p>
            )}
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Niveau d'urgence *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(URGENCY_LABELS).map(([value, label]) => {
                const colors: Record<string, string> = {
                  CRITICAL: 'peer-checked:border-red-600 peer-checked:bg-red-50 peer-checked:text-red-700',
                  HIGH: 'peer-checked:border-orange-500 peer-checked:bg-orange-50 peer-checked:text-orange-700',
                  MEDIUM: 'peer-checked:border-yellow-500 peer-checked:bg-yellow-50 peer-checked:text-yellow-700',
                  LOW: 'peer-checked:border-green-500 peer-checked:bg-green-50 peer-checked:text-green-700',
                };
                const icons: Record<string, string> = {
                  CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢',
                };
                return (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" value={value} {...register('urgencyLevel')} className="peer hidden" />
                    <div className={`py-3 px-2 rounded-lg border-2 border-gray-200 text-center text-sm font-medium transition-all hover:border-gray-300 ${colors[value]}`}>
                      <span className="text-lg">{icons[value]}</span>
                      <p className="mt-1">{label}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.urgencyLevel && (
              <p className="text-red-500 text-sm mt-1">Sélectionnez un niveau d'urgence</p>
            )}
          </div>

          {/* Urgency Warning */}
          {urgencyLevel === UrgencyLevel.CRITICAL && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Urgence critique</p>
                <p className="text-sm text-red-700 mt-1">
                  Tous les donneurs compatibles dans un rayon de 50 km seront notifiés immédiatement
                  par notification push et SMS.
                </p>
              </div>
            </div>
          )}

          {/* Units Needed */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre d'unités nécessaires *
            </label>
            <input
              type="number"
              {...register('unitsNeeded', { valueAsNumber: true })}
              className="input-field w-32"
              min={1}
              max={20}
            />
            {errors.unitsNeeded && (
              <p className="text-red-500 text-sm mt-1">{errors.unitsNeeded.message}</p>
            )}
          </div>

          {/* Hospital */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Hôpital *
            </label>
            <input
              type="text"
              {...register('hospital')}
              className="input-field"
              placeholder="Ex: CHU Mustapha Pacha"
            />
            {errors.hospital && (
              <p className="text-red-500 text-sm mt-1">{errors.hospital.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (optionnel)
            </label>
            <textarea
              {...register('description')}
              className="input-field resize-none h-24"
              placeholder="Informations supplémentaires sur la demande..."
            />
          </div>

          {/* Search Radius */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rayon de recherche (km)
            </label>
            <select {...register('searchRadius', { valueAsNumber: true })} className="input-field w-48">
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
            </select>
          </div>

          {/* Geolocation */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Localisation *
            </label>
            <button
              type="button"
              onClick={getLocation}
              disabled={locating}
              className="btn-secondary flex items-center gap-2"
            >
              {locating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              {latitude !== 0 ? '✅ Position détectée' : 'Détecter ma position'}
            </button>
            {latitude !== 0 && (
              <p className="text-xs text-gray-500 mt-2">
                📍 Lat: {latitude.toFixed(4)}, Lng: {watch('longitude').toFixed(4)}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Créer la demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}