import { useState, useEffect } from 'react';
import {
  Megaphone, PlusCircle, Pencil, Trash2,
  X, Loader2, Calendar, Target, Droplets,
  Building2, CheckCircle, Clock, XCircle, ChevronDown, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Role } from '../types';

// ─── Types ───
interface Center   { id: string; name: string; city: string; }
interface Campaign {
  id: string; centerId: string; title: string; description?: string;
  startDate: string; endDate: string; goalUnits: number;
  collectedUnits: number; isActive: boolean; createdAt: string;
  center: Center;
}

// ─── Helpers ───
const pct = (c: Campaign) => Math.min(100, Math.round((c.collectedUnits / c.goalUnits) * 100));
const fmt = (d: string)   =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const statusInfo = (c: Campaign) => {
  const now = Date.now();
  const end = new Date(c.endDate).getTime();
  const start = new Date(c.startDate).getTime();
  if (!c.isActive) return { label: 'Inactive', cls: 'bg-gray-100 text-gray-500',   Icon: XCircle };
  if (now > end)   return { label: 'Terminée', cls: 'bg-red-100 text-red-600',     Icon: XCircle };
  if (now < start) return { label: 'À venir',  cls: 'bg-blue-100 text-blue-600',   Icon: Clock };
  return               { label: 'En cours', cls: 'bg-green-100 text-green-700', Icon: CheckCircle };
};

// ─── Quick Units Modal ───
function AddUnitsModal({ campaign, onClose, onUpdated }: {
  campaign: Campaign;
  onClose: () => void;
  onUpdated: (id: string, newCollected: number) => void;
}) {
  const [amount,  setAmount]  = useState(0);
  const [saving,  setSaving]  = useState(false);
  const current = campaign.collectedUnits;
  const goal    = campaign.goalUnits;
  const preview = Math.min(goal, current + amount);
  const previewPct = Math.min(100, Math.round((preview / goal) * 100));

  const handleConfirm = async () => {
    if (amount <= 0) { toast.error('Entrez un nombre valide'); return; }
    setSaving(true);
    try {
      await api.patch(`/campaigns/${campaign.id}`, {
        collectedUnits: preview,
      });
      toast.success(`✅ +${amount} unités ajoutées`);
      onUpdated(campaign.id, preview);
      onClose();
    } catch {
      toast.error('Erreur mise à jour');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Droplets className="w-5 h-5 text-blood-600" />
            Ajouter des unités
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nom campagne */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Campagne</p>
            <p className="font-semibold text-gray-900 text-sm truncate">{campaign.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{campaign.center.name} — {campaign.center.city}</p>
          </div>

          {/* Progress actuelle */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>{current} / {goal} unités</span>
              <span className="font-bold text-blood-600">{pct(campaign)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div className="h-2 rounded-full bg-blood-400 transition-all duration-300"
                style={{ width: `${pct(campaign)}%` }} />
            </div>
          </div>

          {/* Quick buttons */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium">Ajout rapide</p>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 25, 50].map((n) => (
                <button key={n} type="button"
                  onClick={() => setAmount((p) => p + n)}
                  className="py-2 rounded-lg bg-blood-50 text-blood-700 text-sm font-bold
                             hover:bg-blood-100 transition-colors border border-blood-100">
                  +{n}
                </button>
              ))}
            </div>
          </div>

          {/* Input manuel */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Ou entrez manuellement</p>
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => setAmount((p) => Math.max(0, p - 1))}
                className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 transition-colors">
                −
              </button>
              <input
                type="number" min={0} value={amount}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="input-field text-center font-bold text-lg flex-1"
              />
              <button type="button"
                onClick={() => setAmount((p) => p + 1)}
                className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 transition-colors">
                +
              </button>
            </div>
          </div>

          {/* Preview après ajout */}
          {amount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-xs text-green-600 font-medium mb-1.5">Après ajout</p>
              <div className="flex justify-between text-xs text-green-700 mb-1.5">
                <span>{preview} / {goal} unités</span>
                <span className="font-bold">{previewPct}%</span>
              </div>
              <div className="w-full bg-green-100 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full bg-green-500 transition-all duration-300"
                  style={{ width: `${previewPct}%` }} />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">Annuler</button>
            <button onClick={handleConfirm} disabled={saving || amount <= 0}
              className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Plus className="w-4 h-4" /> Confirmer</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Campaign Modal (Create / Edit) ───
function CampaignModal({ campaign, onClose, onSaved }: {
  campaign: Campaign | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!campaign;
  const toDate = (iso: string) => iso ? iso.slice(0, 10) : '';

  const [centers,  setCenters]  = useState<Center[]>([]);
  const [loadingC, setLoadingC] = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [form, setForm] = useState({
    centerId:       campaign?.centerId       || '',
    title:          campaign?.title          || '',
    description:    campaign?.description    || '',
    startDate:      toDate(campaign?.startDate || ''),
    endDate:        toDate(campaign?.endDate   || ''),
    goalUnits:      campaign?.goalUnits      || 100,
    collectedUnits: campaign?.collectedUnits || 0,
    isActive:       campaign?.isActive       ?? true,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/centers', { params: { limit: 100 } });
        setCenters(res.data.data || []);
      } catch {
        toast.error('Impossible de charger les centres');
      } finally {
        setLoadingC(false);
      }
    };
    load();
  }, []);

  const f = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.centerId) { toast.error('Sélectionnez un centre'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        // ✅ PATCH — tous les champs acceptés
        await api.patch(`/campaigns/${campaign!.id}`, {
          centerId:       form.centerId,
          title:          form.title,
          description:    form.description,
          startDate:      form.startDate,
          endDate:        form.endDate,
          goalUnits:      form.goalUnits,
          collectedUnits: form.collectedUnits,
          isActive:       form.isActive,
        });
        toast.success('✅ Campagne mise à jour');
      } else {
        // ✅ POST — uniquement les champs de CreateCampaignDto
        await api.post('/campaigns', {
          centerId:    form.centerId,
          title:       form.title,
          description: form.description,
          startDate:   form.startDate,
          endDate:     form.endDate,
          goalUnits:   form.goalUnits,
          // ❌ pas collectedUnits (default 0 en DB)
          // ❌ pas isActive       (default true en DB)
        });
        toast.success('✅ Campagne créée');
      }
      onSaved(); onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blood-600" />
            {isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'}
          </h2>
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Centre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Centre de collecte *</label>
            {loadingC ? (
              <div className="input-field flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
              </div>
            ) : centers.length === 0 ? (
              <div className="input-field text-red-500 text-sm">
                ⚠️ Aucun centre disponible
              </div>
            ) : (
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select value={form.centerId} onChange={f('centerId')} required
                  className="input-field pl-10 pr-10 text-sm appearance-none">
                  <option value="">-- Sélectionnez un centre --</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>🏥 {c.name} — {c.city}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
            <input value={form.title} onChange={f('title')} required
              className="input-field text-sm" placeholder="Campagne Ramadan 2026" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea value={form.description} onChange={f('description')} rows={3}
              className="input-field text-sm resize-none" placeholder="Description..." />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date début *</label>
              <input type="date" value={form.startDate} onChange={f('startDate')} required
                className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin *</label>
              <input type="date" value={form.endDate} onChange={f('endDate')} required
                className="input-field text-sm" />
            </div>
          </div>

          {/* Objectif + Collecté */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Objectif (unités) *</label>
              <input type="number" min={1} value={form.goalUnits} required
                onChange={(e) => setForm((p) => ({ ...p, goalUnits: parseInt(e.target.value) || 1 }))}
                className="input-field text-sm" placeholder="500" />
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unités collectées</label>
                <input type="number" min={0} value={form.collectedUnits}
                  onChange={(e) => setForm((p) => ({ ...p, collectedUnits: parseInt(e.target.value) || 0 }))}
                  className="input-field text-sm" />
              </div>
            )}
          </div>

          {/* Statut (edit only) */}
          {isEdit && (
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="w-4 h-4 accent-blood-600" />
              <div>
                <p className="text-sm font-medium text-gray-700">Campagne active</p>
                <p className="text-xs text-gray-400">Visible par tous les utilisateurs</p>
              </div>
            </label>
          )}

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving || loadingC}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function CampaignsPage() {
  const { user } = useAuthStore();
  const isAdmin  = user?.role === Role.ADMIN;

  const [campaigns,   setCampaigns]   = useState<Campaign[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState<'active' | 'upcoming' | 'ended' | 'all'>('active');
  const [modal,       setModal]       = useState<'create' | Campaign | null>(null);
  const [addUnits,    setAddUnits]    = useState<Campaign | null>(null);
  const [deleting,    setDeleting]    = useState<string | null>(null);

  useEffect(() => { loadCampaigns(); }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/campaigns', { params: { limit: 100 } });
      setCampaigns(res.data.data || []);
    } catch {
      toast.error('Erreur chargement des campagnes');
    } finally {
      setLoading(false);
    }
  };

  // ✅ تحديث محلي بدون reload
  const handleUnitsUpdated = (id: string, newCollected: number) => {
    setCampaigns((prev) =>
      prev.map((c) => c.id === id ? { ...c, collectedUnits: newCollected } : c),
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return;
    setDeleting(id);
    try {
      await api.delete(`/campaigns/${id}`);
      toast.success('Campagne supprimée');
      setCampaigns((p) => p.filter((c) => c.id !== id));
    } catch {
      toast.error('Erreur suppression');
    } finally {
      setDeleting(null);
    }
  };

  const now = Date.now();
  const filtered = campaigns.filter((c) => {
    const end   = new Date(c.endDate).getTime();
    const start = new Date(c.startDate).getTime();
    if (filter === 'active')   return c.isActive && now >= start && now <= end;
    if (filter === 'upcoming') return c.isActive && now < start;
    if (filter === 'ended')    return !c.isActive || now > end;
    return true;
  });

  const totalActive = campaigns.filter((c) => {
    const end = new Date(c.endDate).getTime();
    const start = new Date(c.startDate).getTime();
    return c.isActive && now >= start && now <= end;
  }).length;

  const FILTERS = [
    { key: 'active',   label: '🟢 En cours' },
    { key: 'upcoming', label: '🔵 À venir' },
    { key: 'ended',    label: '⚫ Terminées' },
    { key: 'all',      label: '📋 Toutes' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blood-600" /> Campagnes de don
          </h1>
          <p className="text-gray-500 text-sm mt-1">Campagnes de collecte organisées par les centres</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('create')}
            className="btn-primary flex items-center gap-2 text-sm">
            <PlusCircle className="w-4 h-4" /> Nouvelle campagne
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">En cours</p>
              <p className="text-3xl font-extrabold text-green-600">{totalActive}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-200" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Unités collectées</p>
              <p className="text-3xl font-extrabold text-blood-600">
                {campaigns.reduce((s, c) => s + c.collectedUnits, 0)}
              </p>
            </div>
            <Droplets className="w-8 h-8 text-blood-200" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Objectif total</p>
              <p className="text-3xl font-extrabold text-blue-600">
                {campaigns.reduce((s, c) => s + c.goalUnits, 0)}
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
              ${filter === f.key
                ? 'bg-blood-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blood-300 hover:text-blood-600'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blood-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Megaphone className="w-14 h-14 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucune campagne trouvée</p>
          {isAdmin && (
            <button onClick={() => setModal('create')}
              className="btn-primary mt-4 text-sm inline-flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> Créer une campagne
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filtered.map((c) => {
            const p = pct(c);
            const status = statusInfo(c);
            const { Icon } = status;

            return (
              <div key={c.id} className="card hover:shadow-md transition-shadow">
                {/* Top */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-blood-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-blood-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 leading-tight truncate">{c.title}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-500 truncate">
                          {c.center.name} — {c.center.city}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${status.cls}`}>
                      <Icon className="w-3 h-3" /> {status.label}
                    </span>
                    {isAdmin && (
                      <>
                        {/* ✅ زر إضافة وحدات سريع */}
                        <button
                          onClick={() => setAddUnits(c)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blood-600 hover:bg-blood-50 transition-colors"
                          title="Ajouter des unités">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={() => setModal(c)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Modifier">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Supprimer">
                          {deleting === c.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {c.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{c.description}</p>
                )}

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-blood-500" />
                      {c.collectedUnits} / {c.goalUnits} unités
                    </span>
                    <span className={`text-xs font-bold
                      ${p >= 100 ? 'text-green-600' : p >= 50 ? 'text-blue-600' : 'text-blood-600'}`}>
                      {p}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div className={`h-2.5 rounded-full transition-all duration-700
                      ${p >= 100 ? 'bg-green-500' : p >= 50 ? 'bg-blue-500' : 'bg-blood-500'}`}
                      style={{ width: `${p}%` }} />
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {fmt(c.startDate)}
                  </span>
                  <span>→</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {fmt(c.endDate)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {modal !== null && (
        <CampaignModal
          campaign={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={loadCampaigns}
        />
      )}
      {addUnits !== null && (
        <AddUnitsModal
          campaign={addUnits}
          onClose={() => setAddUnits(null)}
          onUpdated={handleUnitsUpdated}
        />
      )}
    </div>
  );
}