import { useState, useRef, useEffect } from 'react';
import { useNavigate }   from 'react-router-dom';
import { Loader2, Mail, RefreshCw, CheckCircle } from 'lucide-react';
import toast             from 'react-hot-toast';
import api               from '../services/api';
import { useAuthStore }  from '../store/useAuthStore';
import logo              from '../assets/blooslink-logo2.png';

export default function VerifyEmailPage() {
  const { user, updateUser } = useAuthStore();
  const navigate = useNavigate();

  const [code,      setCode]      = useState(['', '', '', '', '', '']);
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown
  useEffect(() => {
    if (countdown === 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Auto-submit si 6 chiffres
  useEffect(() => {
    if (code.every((c) => c !== '')) handleVerify();
  }, [code]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setCode(text.split(''));
      inputs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) return;
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { code: fullCode });
      updateUser({ isVerified: true });
      setSuccess(true);
      toast.success('✅ Email vérifié !');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Code incorrect');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/auth/resend-verification');
      toast.success('📧 Nouveau code envoyé !');
      setCountdown(60);
      setCanResend(false);
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setResending(false);
    }
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">Email vérifié !</h2>
        <p className="text-gray-500">Redirection en cours...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100
                        dark:border-gray-800 p-8">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logo} alt="BloodLink" className="h-14 w-auto object-contain" />
          </div>

          {/* Icon */}
          <div className="w-16 h-16 bg-blood-100 dark:bg-blood-950 rounded-2xl flex items-center
                          justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-blood-600 dark:text-blood-400" />
          </div>

          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 text-center mb-2">
            Vérifiez votre email
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
            Un code à 6 chiffres a été envoyé à<br />
            <strong className="text-gray-900 dark:text-gray-100">{user?.email}</strong>
          </p>

          {/* Code inputs */}
          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-2xl font-black rounded-xl border-2
                            outline-none transition-all
                            ${digit
                              ? 'border-blood-600 bg-blood-50 dark:bg-blood-950 text-blood-700 dark:text-blood-400'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'}
                            focus:border-blood-600 focus:bg-blood-50 dark:focus:bg-blood-950`}
              />
            ))}
          </div>

          {/* Submit */}
          <button
            onClick={handleVerify}
            disabled={loading || code.some((c) => !c)}
            className="w-full py-3 bg-blood-600 hover:bg-blood-700 disabled:opacity-50
                       text-white font-bold rounded-xl transition-colors flex items-center
                       justify-center gap-2 mb-4">
            {loading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Vérification...</>
              : '✅ Vérifier mon email'
            }
          </button>

          {/* Resend */}
          <div className="text-center">
            {canResend ? (
              <button onClick={handleResend} disabled={resending}
                className="flex items-center gap-2 text-sm text-blood-600 font-semibold
                           hover:underline mx-auto disabled:opacity-50">
                {resending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
                Renvoyer le code
              </button>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Renvoyer dans <span className="font-bold text-blood-600">{countdown}s</span>
              </p>
            )}
          </div>

          {/* Skip */}
          <p className="text-center text-xs text-gray-400 mt-4">
            <button onClick={() => navigate('/')} className="hover:underline">
              Vérifier plus tard →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}