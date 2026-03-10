import { useState, useEffect } from 'react';
import {
  Mail, Send, Users, UserCheck, UsersRound,
  Loader2, CheckCircle, AlertCircle, Eye,
  ChevronDown, Sparkles, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api   from '../services/api';

// ── Types ─────────────────────────────────────────────────────
type Audience = 'DONOR' | 'PATIENT' | 'ALL';

interface AudienceOption {
  value:    Audience;
  label:    string;
  desc:     string;
  icon:     any;
  color:    string;
  bg:       string;
  border:   string;
}

const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    value:  'DONOR',
    label:  'Donneurs',
    desc:   'Tous les donneurs actifs',
    icon:   UserCheck,
    color:  'text-blue-600 dark:text-blue-400',
    bg:     'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-500',
  },
  {
    value:  'PATIENT',
    label:  'Patients',
    desc:   'Tous les patients actifs',
    icon:   Users,
    color:  'text-purple-600 dark:text-purple-400',
    bg:     'bg-purple-50 dark:bg-purple-950',
    border: 'border-purple-500',
  },
  {
    value:  'ALL',
    label:  'Tous',
    desc:   'Donneurs + Patients',
    icon:   UsersRound,
    color:  'text-blood-600 dark:text-blood-400',
    bg:     'bg-blood-50 dark:bg-blood-950',
    border: 'border-blood-500',
  },
];

// ── Templates prédéfinis ──────────────────────────────────────
const TEMPLATES = [
  {
    label:   '🩸 Campagne de don',
    subject: 'Rejoignez notre campagne de don de sang !',
    message: 'Nous organisons une grande campagne de don de sang.\n\nVotre don peut sauver jusqu\'à 3 vies. Rendez-vous dans votre centre de collecte le plus proche.\n\nMerci pour votre générosité et votre engagement envers la communauté.',
  },
  {
    label:   '🚨 Urgence sang',
    subject: '🚨 URGENT — Besoin critique de sang',
    message: 'Nous avons un besoin urgent de donneurs de sang.\n\nDes patients ont besoin de transfusions en urgence. Si vous êtes disponible, merci de vous présenter immédiatement dans votre centre de collecte.\n\nChaque don compte. Merci de votre aide.',
  },
  {
    label:   '📢 Mise à jour BloodLink',
    subject: 'Mise à jour importante — BloodLink',
    message: 'Nous avons le plaisir de vous informer des dernières nouveautés sur BloodLink.\n\nDe nouvelles fonctionnalités sont disponibles pour améliorer votre expérience.\n\nConnectez-vous pour les découvrir.',
  },
  {
    label:   '🎉 Remerciements',
    subject: 'Merci pour votre contribution à BloodLink !',
    message: 'Nous tenons à vous remercier chaleureusement pour votre engagement sur BloodLink.\n\nGrâce à vous et à toute notre communauté, nous avons pu sauver de nombreuses vies.\n\nContinuez à faire la différence !',
  },
];

// ─────────────────────────────────────────────────────────────
export default function AdminMailPage() {
  const [audience,      setAudience]      = useState<Audience>('ALL');
  const [onlyVerified,  setOnlyVerified]  = useState(false);
  const [subject,       setSubject]       = useState('');
  const [message,       setMessage]       = useState('');
  const [sending,       setSending]       = useState(false);
  const [previewing,    setPreviewing]    = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [showPreview,   setShowPreview]   = useState(false);
  const [result,        setResult]        = useState<any>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // ── Preview count auto ────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => fetchPreview(), 300);
    return () => clearTimeout(t);
  }, [audience, onlyVerified]);

  const fetchPreview = async () => {
    setPreviewing(true);
    try {
      const res = await api.post('/admin/mail/preview', { audience, onlyVerified });
      setRecipientCount(res.data.count);
    } catch {
      setRecipientCount(null);
    } finally {
      setPreviewing(false);
    }
  };

  // ── Apply template ────────────────────────────────────────
  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setSubject(tpl.subject);
    setMessage(tpl.message);
    setShowTemplates(false);
    toast.success('Template appliqué !');
  };

  // ── Send ──────────────────────────────────────────────────
  const handleSend = async () => {
    if (!subject.trim()) { toast.error('Objet requis'); return; }
    if (!message.trim()) { toast.error('Message requis'); return; }
    if (!recipientCount) { toast.error('Aucun destinataire'); return; }

    setSending(true);
    setResult(null);
    try {
      const res = await api.post('/admin/mail/send', {
        subject, message, audience, onlyVerified,
      });
      setResult(res.data);
      toast.success(`✅ ${res.data.sent} email(s) envoyé(s) !`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const selectedAudience = AUDIENCE_OPTIONS.find((o) => o.value === audience)!;
  const AudienceIcon     = selectedAudience.icon;
  const charCount        = message.length;
  const wordCount        = message.trim() ? message.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Mail className="w-7 h-7 text-blood-600" />
            Campagne Email
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Envoyez des emails groupés à vos utilisateurs
          </p>
        </div>

        {/* Stats badge */}
        <div className="hidden sm:flex items-center gap-2 bg-blood-50 dark:bg-blood-950
                        border border-blood-200 dark:border-blood-800 rounded-2xl px-4 py-2">
          <Sparkles className="w-4 h-4 text-blood-600" />
          <span className="text-sm font-semibold text-blood-700 dark:text-blood-400">
            Admin Email Center
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne principale ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Audience ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100
                          dark:border-gray-800 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-4 flex items-center gap-2">
              <div className="w-6 h-6 bg-blood-100 dark:bg-blood-950 rounded-lg flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-blood-600" />
              </div>
              Audience cible
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {AUDIENCE_OPTIONS.map((opt) => {
                const Icon     = opt.icon;
                const selected = audience === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setAudience(opt.value)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all
                      ${selected
                        ? `${opt.border} ${opt.bg}`
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2
                      ${selected ? opt.bg : 'bg-gray-100 dark:bg-gray-800'}`}>
                      <Icon className={`w-5 h-5 ${selected ? opt.color : 'text-gray-400'}`} />
                    </div>
                    <p className={`font-bold text-sm ${selected
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-600 dark:text-gray-400'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Only verified toggle */}
            <label className="flex items-center justify-between p-3 rounded-xl
                              bg-gray-50 dark:bg-gray-800 cursor-pointer group">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Comptes vérifiés uniquement
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Exclure les comptes non vérifiés
                </p>
              </div>
              <div
                onClick={() => setOnlyVerified((v) => !v)}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative
                  ${onlyVerified ? 'bg-blood-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow
                                 transition-transform ${onlyVerified ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </label>
          </div>

          {/* ── Contenu ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100
                          dark:border-gray-800 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
                <div className="w-6 h-6 bg-blood-100 dark:bg-blood-950 rounded-lg flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-blood-600" />
                </div>
                Contenu de l'email
              </h3>

              {/* Templates dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                             bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300
                             hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  <Sparkles className="w-3.5 h-3.5" />
                  Templates
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                </button>

                {showTemplates && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900
                                  rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800
                                  overflow-hidden z-50">
                    {TEMPLATES.map((tpl, i) => (
                      <button key={i} onClick={() => applyTemplate(tpl)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800
                                   transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tpl.label}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{tpl.subject}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Objet */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400
                                  uppercase tracking-wide block mb-1.5">
                  Objet de l'email *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Campagne de don de sang — Rejoignez-nous !"
                  maxLength={150}
                  className="input-field text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{subject.length}/150</p>
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400
                                  uppercase tracking-wide block mb-1.5">
                  Message *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Rédigez votre message ici...&#10;&#10;Chaque ligne vide crée un paragraphe dans l'email."
                  rows={10}
                  className="input-field text-sm resize-none leading-relaxed
                             dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-gray-400">{wordCount} mots</p>
                  <p className="text-xs text-gray-400">{charCount} caractères</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Résultat ── */}
          {result && (
            <div className={`rounded-2xl border-2 p-5
              ${result.failed === 0
                ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'}`}>
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className={`w-6 h-6 flex-shrink-0
                  ${result.failed === 0 ? 'text-green-600' : 'text-orange-500'}`} />
                <p className={`font-bold ${result.failed === 0
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-orange-800 dark:text-orange-300'}`}>
                  Envoi terminé
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total',   value: result.total,  color: 'text-gray-700 dark:text-gray-300' },
                  { label: 'Envoyés', value: result.sent,   color: 'text-green-700 dark:text-green-400' },
                  { label: 'Échecs',  value: result.failed, color: result.failed > 0 ? 'text-red-600' : 'text-gray-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/60 dark:bg-gray-900/60 rounded-xl p-3 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Colonne droite ── */}
        <div className="space-y-5">

          {/* ── Récapitulatif ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100
                          dark:border-gray-800 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-4 flex items-center gap-2">
              <div className="w-6 h-6 bg-blood-100 dark:bg-blood-950 rounded-lg flex items-center justify-center">
                <Eye className="w-3.5 h-3.5 text-blood-600" />
              </div>
              Récapitulatif
            </h3>

            <div className="space-y-3">
              {/* Audience */}
              <div className={`rounded-xl p-3 ${selectedAudience.bg} border ${selectedAudience.border}`}>
                <div className="flex items-center gap-2">
                  <AudienceIcon className={`w-4 h-4 ${selectedAudience.color}`} />
                  <span className={`text-sm font-bold ${selectedAudience.color}`}>
                    {selectedAudience.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {selectedAudience.desc}
                  {onlyVerified && ' · Vérifiés uniquement'}
                </p>
              </div>

              {/* Count */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
                {previewing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-blood-600 mx-auto" />
                ) : (
                  <>
                    <p className="text-3xl font-black text-gray-900 dark:text-gray-100">
                      {recipientCount ?? '—'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      destinataire{(recipientCount || 0) > 1 ? 's' : ''}
                    </p>
                  </>
                )}
                <button onClick={fetchPreview}
                  className="mt-2 text-xs text-blood-600 hover:underline flex items-center
                             gap-1 mx-auto">
                  <RefreshCw className="w-3 h-3" /> Actualiser
                </button>
              </div>

              {/* Objet */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Objet</p>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium break-words">
                  {subject || <span className="text-gray-400 italic">Non défini</span>}
                </p>
              </div>

              {/* Message length */}
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Message</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {wordCount > 0
                    ? <>{wordCount} mots · {charCount} caractères</>
                    : <span className="text-gray-400 italic">Vide</span>
                  }
                </p>
              </div>
            </div>
          </div>

          {/* ── Preview email ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100
                          dark:border-gray-800 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between px-5 py-4
                         hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100
                               flex items-center gap-2">
                <Eye className="w-4 h-4 text-blood-600" /> Aperçu email
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform
                ${showPreview ? 'rotate-180' : ''}`} />
            </button>

            {showPreview && (
              <div className="px-4 pb-4">
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700
                                bg-white text-xs" style={{ transform: 'scale(0.85)', transformOrigin: 'top left',
                                width: '118%' }}>
                  {/* Mini email preview */}
                  <div style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)', padding:'16px', textAlign:'center' }}>
                    <p style={{ color:'white', margin:0, fontWeight:'bold', fontSize:'14px' }}>🩸 BloodLink</p>
                  </div>
                  <div style={{ padding:'16px' }}>
                    <p style={{ color:'#111827', fontWeight:'bold', margin:'0 0 8px' }}>
                      {subject || 'Objet de l\'email...'}
                    </p>
                    <div style={{ background:'#fafafa', borderRadius:'8px', padding:'12px',
                                  color:'#374151', lineHeight:'1.6', whiteSpace:'pre-wrap',
                                  fontSize:'11px', maxHeight:'120px', overflow:'hidden' }}>
                      {message || 'Votre message apparaîtra ici...'}
                    </div>
                    <div style={{ textAlign:'center', marginTop:'12px' }}>
                      <span style={{ background:'#dc2626', color:'white', padding:'8px 16px',
                                     borderRadius:'6px', fontSize:'10px', fontWeight:'bold' }}>
                        Accéder à BloodLink →
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Avertissement ── */}
          {recipientCount !== null && recipientCount > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800
                            rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Vous allez envoyer cet email à <strong>{recipientCount}</strong> personne(s).
                  Cette action est <strong>irréversible</strong>.
                </p>
              </div>
            </div>
          )}

          {/* ── Bouton Envoyer ── */}
          <button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !message.trim() || !recipientCount}
            className="w-full py-4 bg-blood-600 hover:bg-blood-700 disabled:opacity-50
                       disabled:cursor-not-allowed text-white font-black text-base rounded-2xl
                       transition-all flex items-center justify-center gap-2
                       shadow-lg shadow-blood-200 dark:shadow-blood-950 hover:shadow-xl
                       hover:-translate-y-0.5 active:translate-y-0">
            {sending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours...</>
            ) : (
              <><Send className="w-5 h-5" /> Envoyer à {recipientCount ?? '...'} personne(s)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}