import { useState } from 'react';
import { X, Star, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function RateDonorModal({ open, onClose, donationId, onSubmitted } : {
  open: boolean;
  onClose: () => void;
  donationId: string;
  onSubmitted?: () => void;
}) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (rating < 1 || rating > 5) { toast.error('Note invalide'); return; }
    setSubmitting(true);
    try {
      await api.post('/ratings', { donationId, rating, comment });
      toast.success('Merci pour votre évaluation !');
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <X />
        </button>
        <h3 className="text-lg font-bold mb-2">Évaluer le donneur</h3>
        <p className="text-sm text-gray-500 mb-4">Votre retour aide la communauté — soyez bienveillant et honnête.</p>

        <div className="flex items-center gap-2 mb-4">
          {[1,2,3,4,5].map((s) => (
            <button key={s} onClick={() => setRating(s)} className={`p-2 rounded-full ${s <= rating ? 'bg-blood-50' : 'bg-gray-100 dark:bg-gray-800'}`}>
              <Star className={`w-6 h-6 ${s <= rating ? 'text-blood-600' : 'text-gray-400'}`} />
            </button>
          ))}
          <span className="text-sm text-gray-500 ml-3">{rating}/5</span>
        </div>

        <textarea value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="Commentaire (optionnel)"
          className="w-full input-field text-sm mb-4 h-24 resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100" />

        <div className="flex gap-2">
          <button onClick={submit} disabled={submitting}
            className="flex-1 py-2 bg-blood-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer l\'évaluation'}
          </button>
          <button onClick={onClose} className="py-2 px-4 rounded-xl border border-gray-200 text-sm">Annuler</button>
        </div>
      </div>
    </div>
  );
}