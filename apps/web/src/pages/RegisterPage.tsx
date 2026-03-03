import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';
import { BloodGroup, BLOOD_GROUP_LABELS } from '../types';

const registerSchema = z
  .object({
    firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
    lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    email: z.string().email('Email invalide'),
    phone: z.string().optional(),
    bloodGroup: z.nativeEnum(BloodGroup, { error: 'Sélectionnez un groupe sanguin' }),
    password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string(),
    role: z.enum(['DONOR', 'PATIENT']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'DONOR' },
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      const response = await authService.register(registerData);
      setAuth(response.user, response.accessToken);
      toast.success('Inscription réussie ! Bienvenue sur BloodLink');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg">
        <div className="card">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="w-12 h-12 bg-blood-600 rounded-xl flex items-center justify-center">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-blood-600">BloodLink</h1>
          </div>

          <h2 className="text-xl font-bold text-center text-gray-900 mb-1">
            Créer un compte
          </h2>
          <p className="text-center text-gray-500 mb-6 text-sm">
            Rejoignez la communauté BloodLink
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-3">
              <label className="cursor-pointer">
                <input type="radio" value="DONOR" {...register('role')} className="peer hidden" />
                <div className="p-3 rounded-lg border-2 border-gray-200 text-center transition-all peer-checked:border-blood-600 peer-checked:bg-blood-50">
                  <span className="text-2xl">🩸</span>
                  <p className="text-sm font-semibold mt-1">Donneur</p>
                </div>
              </label>
              <label className="cursor-pointer">
                <input type="radio" value="PATIENT" {...register('role')} className="peer hidden" />
                <div className="p-3 rounded-lg border-2 border-gray-200 text-center transition-all peer-checked:border-blood-600 peer-checked:bg-blood-50">
                  <span className="text-2xl">🏥</span>
                  <p className="text-sm font-semibold mt-1">Patient</p>
                </div>
              </label>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input {...register('firstName')} className="input-field pl-10 text-sm" placeholder="Ahmed" />
                </div>
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input {...register('lastName')} className="input-field text-sm" placeholder="Benali" />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="email" {...register('email')} className="input-field pl-10 text-sm" placeholder="votre@email.com" />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone (optionnel)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('phone')} className="input-field pl-10 text-sm" placeholder="+213 5XX XXX XXX" />
              </div>
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Groupe sanguin</label>
              <select {...register('bloodGroup')} className="input-field text-sm">
                <option value="">-- Sélectionnez --</option>
                {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {errors.bloodGroup && <p className="text-red-500 text-xs mt-1">{errors.bloodGroup.message}</p>}
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="password" {...register('password')} className="input-field pl-10 text-sm" placeholder="••••••••" />
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
                <input type="password" {...register('confirmPassword')} className="input-field text-sm" placeholder="••••••••" />
                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "S'inscrire"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-blood-600 font-semibold hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}