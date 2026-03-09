import { useEffect, useState, useRef, useCallback } from 'react';
import { Menu, Bell, LogOut, Search, Droplets, Users, Building2, Megaphone, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore }        from '../../store/useAuthStore';
import { BLOOD_GROUP_LABELS }  from '../../types';
import api                     from '../../services/api';

interface HeaderProps { onMenuClick: () => void; }

// ── Types ──
interface SearchResult {
  id:       string;
  type:     'request' | 'donor' | 'center' | 'campaign';
  title:    string;
  subtitle: string;
  path:     string;
}

const TYPE_CONFIG = {
  request:  { icon: Droplets,   label: 'Demande',  color: 'text-red-500',   bg: 'bg-red-50  dark:bg-red-950'  },
  donor:    { icon: Users,      label: 'Donneur',  color: 'text-blue-500',  bg: 'bg-blue-50 dark:bg-blue-950' },
  center:   { icon: Building2,  label: 'Centre',   color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950'},
  campaign: { icon: Megaphone,  label: 'Campagne', color: 'text-purple-500',bg: 'bg-purple-50 dark:bg-purple-950'},
};
const bloodLabel = (bg: any): string =>
  BLOOD_GROUP_LABELS[bg as keyof typeof BLOOD_GROUP_LABELS] ?? bg;
// ── debounce helper ──
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout }  = useAuthStore();
  const navigate          = useNavigate();

  // Notifications
  const [unreadCount, setUnreadCount] = useState(0);

  // Search
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const debouncedQuery          = useDebounce(query, 350);
  const inputRef                = useRef<HTMLInputElement>(null);
  const dropdownRef             = useRef<HTMLDivElement>(null);

  // ── Notifications ──────────────────────────────────────────
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications?limit=1');
      setUnreadCount(res.data.unreadCount || 0);
    } catch { /* ignore */ }
  };

  // ── Global Search ──────────────────────────────────────────
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      // appels parallèles
      const [reqRes, donRes, cenRes, camRes] = await Promise.allSettled([
        api.get('/blood-requests', { params: { search: q, limit: 3 } }),
        api.get('/users/donors',   { params: { city:   q, limit: 3 } }),
        api.get('/centers',        { params: { search: q, limit: 3 } }),
        api.get('/campaigns',      { params: { limit: 50 } }),
      ]);

      const out: SearchResult[] = [];

      // Demandes
      if (reqRes.status === 'fulfilled') {
        (reqRes.value.data.data || []).forEach((r: any) => {
          out.push({
            id:       r.id,
            type:     'request',
            title:    `${r.bloodGroup.replace('_', ' ')} — ${r.hospital}`,
            subtitle: `${r.urgencyLevel} · ${r.status}`,
            path:     `/requests/${r.id}`,
          });
        });
      }

      // Donneurs
      if (donRes.status === 'fulfilled') {
        (donRes.value.data.data || []).forEach((d: any) => {
          if (
            `${d.firstName} ${d.lastName}`.toLowerCase().includes(q.toLowerCase()) ||
            (d.city || '').toLowerCase().includes(q.toLowerCase())
          ) {
            out.push({
              id:       d.id,
              type:     'donor',
              title:    `${d.firstName} ${d.lastName}`,
              subtitle: `${bloodLabel(d.bloodGroup)} · ${d.city || '—'}`,
              path:     `/donors`,
            });
          }
        });
      }

      // Centres
      if (cenRes.status === 'fulfilled') {
        (cenRes.value.data.data || []).forEach((c: any) => {
          out.push({
            id:       c.id,
            type:     'center',
            title:    c.name,
            subtitle: `${c.city} · ${c.address}`,
            path:     `/centers`,
          });
        });
      }

      // Campagnes — filtrage côté client
      if (camRes.status === 'fulfilled') {
        (camRes.value.data.data || [])
          .filter((c: any) =>
            c.title.toLowerCase().includes(q.toLowerCase()) ||
            (c.description || '').toLowerCase().includes(q.toLowerCase()),
          )
          .slice(0, 3)
          .forEach((c: any) => {
            out.push({
              id:       c.id,
              type:     'campaign',
              title:    c.title,
              subtitle: `${c.center?.name || ''} · ${c.goalUnits} unités`,
              path:     `/campaigns`,
            });
          });
      }

      setResults(out.slice(0, 10));
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { search(debouncedQuery); }, [debouncedQuery, search]);

  // fermer au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current    && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const highlight = (text: string, q: string) => {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-blood-100 dark:bg-blood-900 text-blood-700 dark:text-blood-300 rounded px-0.5">
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800
                       flex items-center justify-between px-6 relative z-30">
      {/* Left */}
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onMenuClick} className="lg:hidden text-gray-500 hover:text-gray-700">
          <Menu className="w-6 h-6" />
        </button>

        {/* ── Search ── */}
        <div className="relative hidden md:block w-80">
          {/* Input */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2
                          border border-transparent focus-within:border-blood-400
                          dark:focus-within:border-blood-600 transition-colors">
            {loading
              ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
              : <Search   className="w-4 h-4 text-gray-400 flex-shrink-0" />
            }
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="Rechercher demandes, donneurs, centres..."
              className="bg-transparent text-sm outline-none w-full placeholder:text-gray-400
                         dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* ── Dropdown ── */}
          {open && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-900
                         border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl
                         overflow-hidden z-50 max-h-96 overflow-y-auto"
            >
              {results.length === 0 && !loading ? (
                <div className="px-4 py-8 text-center">
                  <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">Aucun résultat pour «{query}»</p>
                </div>
              ) : (
                <>
                  {/* Grouper par type */}
                  {(['request', 'donor', 'center', 'campaign'] as const).map((type) => {
                    const group = results.filter((r) => r.type === type);
                    if (group.length === 0) return null;
                    const cfg = TYPE_CONFIG[type];
                    const Icon = cfg.icon;
                    return (
                      <div key={type}>
                        {/* Section header */}
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {cfg.label}s
                          </span>
                        </div>
                        {group.map((r) => {
                          const Icon2 = TYPE_CONFIG[r.type].icon;
                          return (
                            <button
                              key={r.id}
                              onClick={() => handleSelect(r)}
                              className="w-full flex items-center gap-3 px-4 py-3
                                         hover:bg-gray-50 dark:hover:bg-gray-800
                                         transition-colors text-left"
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                                <Icon2 className={`w-4 h-4 ${cfg.color}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {highlight(r.title, query)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {r.subtitle}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}

                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                      {results.length} résultat{results.length > 1 ? 's' : ''} · Entrée pour naviguer
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {user?.bloodGroup && (
          <span className="badge bg-blood-100 dark:bg-blood-950 text-blood-700 dark:text-blood-400 px-3 py-1 text-sm">
            🩸 {BLOOD_GROUP_LABELS[user.bloodGroup]}
          </span>
        )}

        <button
          onClick={() => navigate('/notifications')}
          className="relative text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blood-600 text-white
                             text-[10px] rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-500 hover:text-blood-600
                     dark:hover:text-blood-400 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}