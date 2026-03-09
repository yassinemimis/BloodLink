import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, Mail, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/useAuthStore';
import logo from '../assets/blooslink-logo2.png';
const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await authService.login(data);
      setAuth(response.user, response.accessToken);
      toast.success('Connexion réussie !');
      navigate('/');
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Erreur de connexion',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <img
              src={logo}
              alt="BloodLink"
              className="h-16 w-auto object-contain mb-3"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Connectez-vous pour continuer
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Connexion
          </h2>
          <p className="text-gray-500 mb-8">
            Connectez-vous à votre compte BloodLink
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Adresse email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  {...register('email')}
                  className="input-field pl-11"
                  placeholder="votre@email.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  {...register('password')}
                  className="input-field pl-11"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-blood-600 font-semibold hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blood-600 to-blood-800 items-center justify-center p-12">
        <div className="text-center text-white max-w-md">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <Heart className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Chaque goutte compte
          </h2>
          <p className="text-blood-100 text-lg leading-relaxed">
            Rejoignez notre communauté de donneurs et aidez à sauver des vies.
            Un simple geste peut faire toute la différence.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            <div>
              <p className="text-3xl font-bold">1,245</p>
              <p className="text-blood-200 text-sm">Donneurs actifs</p>
            </div>
            <div>
              <p className="text-3xl font-bold">890</p>
              <p className="text-blood-200 text-sm">Vies sauvées</p>
            </div>
            <div>
              <p className="text-3xl font-bold">15</p>
              <p className="text-blood-200 text-sm">Centres</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}