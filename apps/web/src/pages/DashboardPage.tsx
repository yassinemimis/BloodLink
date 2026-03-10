import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, AlertTriangle, TrendingUp, 
  Clock, Heart, CheckCircle, Award, PlusCircle,
  ArrowRight, Users, UserCheck, 
   BarChart2, MapPin,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';
import { useAuthStore }           from '../store/useAuthStore';
import { bloodRequestService }    from '../services/bloodRequestService';
import {
  BLOOD_GROUP_LABELS, URGENCY_LABELS, URGENCY_COLORS,
  STATUS_LABELS, BloodGroup, UrgencyLevel, RequestStatus,
} from '../types';

// ── Palette ──────────────────────────────────────────────────
const PIE_COLORS   = ['#DC2626','#EA580C','#D97706','#65A30D','#059669','#0891B2','#2563EB','#7C3AED'];
const URGENCY_PIE  = { CRITICAL:'#DC2626', HIGH:'#EA580C', MEDIUM:'#D97706', LOW:'#65A30D' };
const STATUS_PIE   = { PENDING:'#F59E0B', SEARCHING:'#3B82F6', MATCHED:'#8B5CF6', FULFILLED:'#10B981', CANCELLED:'#6B7280' };

// ── Interfaces ────────────────────────────────────────────────
interface PatientRequest { id:string; bloodGroup:BloodGroup; urgencyLevel:UrgencyLevel; status:RequestStatus; hospital:string; unitsNeeded:number; unitsFulfilled:number; createdAt:string; donations:{id:string;status:string}[]; }
interface DonorDonation  { id:string; status:string; createdAt:string; request:{id:string;bloodGroup:BloodGroup;hospital:string;urgencyLevel:UrgencyLevel;status:string}; }
interface ActiveRequest  { id:string; bloodGroup:BloodGroup; urgencyLevel:UrgencyLevel; status:string; hospital:string; patient?:{firstName:string;lastName:string}; }
interface PatientStats   { role:'PATIENT'; myTotal:number; myPending:number; myMatched:number; myFulfilled:number; myCancelled:number; myRequests:PatientRequest[]; }
interface DonorStats     { role:'DONOR'; totalDonations:number; totalAccepted:number; totalCompleted:number; isAvailable:boolean; daysUntilNextDonation:number; lastDonationAt:string|null; recentDonations:DonorDonation[]; activeRequests:ActiveRequest[]; }

interface AdminStats {
  totalRequests:number; pendingRequests:number; fulfilledRequests:number; criticalRequests:number;
  totalDonors:number; availableDonors:number; totalPatients:number; totalDonations:number; todayRequests:number;
  fulfillmentRate:number; donorAvailabilityRate:number;
  requestsByBloodGroup:{bloodGroup:BloodGroup;_count:{id:number}}[];
  requestsByUrgency:   {urgencyLevel:string;  _count:{id:number}}[];
  requestsByStatus:    {status:string;        _count:{id:number}}[];
  monthlyTrend:        {month:string; total:number; fulfilled:number}[];
  topCities:           {city:string; count:number}[];
}

type DashboardData = PatientStats | DonorStats | AdminStats;

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, trend }:
  { label:string; value:string|number; sub?:string; icon:any; color:string; trend?:{value:number;up:boolean} }) {
  return (
    <div className="stat-card group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
          {trend && (
            <p className={`text-xs font-medium mt-1 ${trend.up ? 'text-green-600' : 'text-red-500'}`}>
              {trend.up ? '▲' : '▼'} {trend.value}% vs mois dernier
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <b>{p.value}</b></p>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const { user }              = useAuthStore();
  const navigate              = useNavigate();
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bloodRequestService.getStatistics()
      .then((s) => setData(s as DashboardData))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blood-600 border-t-transparent" />
    </div>
  );

  // ════ PATIENT ════════════════════════════════════════════════
  if (data && 'role' in data && data.role === 'PATIENT') {
    const d = data as PatientStats;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bonjour, {user?.firstName} 👋</h1>
            <p className="text-gray-500 mt-1 text-sm">Suivi de vos demandes de sang</p>
          </div>
          <button onClick={() => navigate('/requests1/new')} className="btn-primary flex items-center gap-2">
            <PlusCircle className="w-5 h-5" /> Nouvelle demande
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total demandes" value={d.myTotal}     icon={Droplets}    color="bg-blood-100 text-blood-700" />
          <KpiCard label="En attente"     value={d.myPending}   icon={Clock}       color="bg-orange-100 text-orange-700" />
          <KpiCard label="Donneur trouvé" value={d.myMatched}   icon={Heart}       color="bg-blue-100 text-blue-700" />
          <KpiCard label="Satisfaites"    value={d.myFulfilled} icon={CheckCircle} color="bg-green-100 text-green-700" />
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Mes demandes récentes</h3>
            <button onClick={() => navigate('/requests')} className="text-sm text-blood-600 hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {d.myRequests?.length > 0 ? (
            <div className="space-y-3">
              {d.myRequests.map((req) => (
                <div key={req.id} onClick={() => navigate(`/requests/${req.id}`)}
                  className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blood-100 dark:bg-blood-950 rounded-xl flex items-center justify-center">
                      <span className="font-bold text-blood-700 dark:text-blood-400 text-sm">{BLOOD_GROUP_LABELS[req.bloodGroup]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{req.hospital}</p>
                      <p className="text-sm text-gray-500">{req.unitsNeeded} unité(s) · {new Date(req.createdAt).toLocaleDateString('fr-FR')}</p>
                      {req.donations?.length > 0 && <p className="text-xs text-green-600 font-medium mt-0.5">✅ {req.donations.length} donneur(s) ont accepté</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`badge text-xs ${URGENCY_COLORS[req.urgencyLevel]}`}>{URGENCY_LABELS[req.urgencyLevel]}</span>
                    <span className="text-xs text-gray-500">{STATUS_LABELS[req.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Droplets className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">Aucune demande pour le moment</p>
              <button onClick={() => navigate('/requests1/new')} className="btn-primary mt-4 text-sm">Créer ma première demande</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════ DONOR ══════════════════════════════════════════════════
  if (data && 'role' in data && data.role === 'DONOR') {
    const d = data as DonorStats;
    const canDonate = d.daysUntilNextDonation === 0;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bonjour, {user?.firstName} 👋</h1>
          <p className="text-gray-500 mt-1 text-sm">Merci pour votre générosité !</p>
        </div>
        <div className={`card border-2 ${canDonate ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800' : 'border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${canDonate ? 'bg-green-200 dark:bg-green-800' : 'bg-orange-200 dark:bg-orange-800'}`}>
              {canDonate ? <CheckCircle className="w-7 h-7 text-green-700" /> : <Clock className="w-7 h-7 text-orange-700" />}
            </div>
            <div>
              {canDonate ? (
                <><p className="font-bold text-green-800 dark:text-green-300 text-lg">Vous pouvez donner ! 🩸</p><p className="text-green-700 dark:text-green-400 text-sm">Votre sang est prêt à sauver des vies</p></>
              ) : (
                <><p className="font-bold text-orange-800 dark:text-orange-300 text-lg">Prochain don dans {d.daysUntilNextDonation} jours</p><p className="text-orange-700 dark:text-orange-400 text-sm">Dernier don : {d.lastDonationAt ? new Date(d.lastDonationAt).toLocaleDateString('fr-FR') : '—'}</p></>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard label="Total dons"  value={d.totalDonations} icon={Award}       color="bg-blood-100 text-blood-700" />
          <KpiCard label="En cours"    value={d.totalAccepted}  icon={Heart}       color="bg-blue-100 text-blue-700" />
          <KpiCard label="Complétés"   value={d.totalCompleted} icon={CheckCircle} color="bg-green-100 text-green-700" />
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Demandes actives à proximité</h3>
            <button onClick={() => navigate('/requests')} className="text-sm text-blood-600 hover:underline flex items-center gap-1">Voir tout <ArrowRight className="w-4 h-4" /></button>
          </div>
          {d.activeRequests?.length > 0 ? (
            <div className="space-y-3">
              {d.activeRequests.map((req) => (
                <div key={req.id} onClick={() => navigate(`/requests/${req.id}`)}
                  className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-blood-50 dark:hover:bg-blood-950 cursor-pointer transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blood-100 dark:bg-blood-950 rounded-xl flex items-center justify-center">
                      <span className="font-bold text-blood-700 dark:text-blood-400 text-sm">{BLOOD_GROUP_LABELS[req.bloodGroup]}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{req.hospital}</p>
                      <p className="text-sm text-gray-500">{req.patient?.firstName} {req.patient?.lastName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${URGENCY_COLORS[req.urgencyLevel]}`}>{URGENCY_LABELS[req.urgencyLevel]}</span>
                    <ArrowRight className="w-4 h-4 text-blood-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-center text-gray-400 py-8">Aucune demande active pour le moment</p>}
        </div>
      </div>
    );
  }

  // ════ ADMIN / DOCTOR — Analytics ═════════════════════════════
  const ad = data as AdminStats | null;
  if (!ad) return null;

  const bloodGroupChart = (ad.requestsByBloodGroup || []).map((i) => ({
    name:  BLOOD_GROUP_LABELS[i.bloodGroup] || i.bloodGroup,
    value: i._count.id,
  }));

  const urgencyChart = (ad.requestsByUrgency || []).map((i) => ({
    name:  URGENCY_LABELS[i.urgencyLevel as UrgencyLevel] || i.urgencyLevel,
    value: i._count.id,
    color: URGENCY_PIE[i.urgencyLevel as keyof typeof URGENCY_PIE] || '#888',
  }));

  const statusChart = (ad.requestsByStatus || []).map((i) => ({
    name:  STATUS_LABELS[i.status as RequestStatus] || i.status,
    value: i._count.id,
    color: STATUS_PIE[i.status as keyof typeof STATUS_PIE]   || '#888',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Bonjour, {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Tableau de bord analytique — BloodLink
        </p>
      </div>

      {/* ── Row 1: KPIs principaux ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total demandes"    value={ad.totalRequests}     sub={`+${ad.todayRequests} aujourd'hui`} icon={Droplets}      color="bg-blood-100 text-blood-600"   />
        <KpiCard label="En attente"        value={ad.pendingRequests}   icon={Clock}         color="bg-orange-100 text-orange-600" />
        <KpiCard label="Satisfaites"       value={ad.fulfilledRequests} sub={`${ad.fulfillmentRate}% taux`}      icon={TrendingUp}    color="bg-green-100 text-green-600"   />
        <KpiCard label="Urgences critiques"value={ad.criticalRequests}  icon={AlertTriangle} color="bg-red-100 text-red-600"       />
      </div>

      {/* ── Row 2: KPIs donneurs/patients ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total donneurs"   value={ad.totalDonors}          sub={`${ad.availableDonors} disponibles`} icon={Users}      color="bg-blue-100 text-blue-600"   />
        <KpiCard label="Taux disponibilité" value={`${ad.donorAvailabilityRate}%`} icon={UserCheck}  color="bg-cyan-100 text-cyan-600"  />
        <KpiCard label="Total patients"   value={ad.totalPatients}        icon={Heart}      color="bg-purple-100 text-purple-600"/>
        <KpiCard label="Dons complétés"   value={ad.totalDonations}       icon={Award}      color="bg-emerald-100 text-emerald-600"/>
      </div>

      {/* ── Row 3: Trend mensuel ── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-5 h-5 text-blood-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Évolution sur 6 mois</h3>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={ad.monthlyTrend || []} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTotal"     x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#DC2626" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradFulfilled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="total"     name="Demandes"  stroke="#DC2626" fill="url(#gradTotal)"     strokeWidth={2} />
            <Area type="monotone" dataKey="fulfilled" name="Satisfaites" stroke="#10B981" fill="url(#gradFulfilled)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Row 4: Pie charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groupe sanguin */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Par groupe sanguin</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={bloodGroupChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {bloodGroupChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Urgence */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Par niveau d'urgence</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={urgencyChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {urgencyChart.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip /><Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Statut */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Par statut</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusChart} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {statusChart.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip /><Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 5: Bar + Top cities ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart groupe sanguin */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Distribution demandes / groupe sanguin</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bloodGroupChart} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Demandes" fill="#DC2626" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top villes */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-blood-600" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top villes — donneurs</h3>
          </div>
          {(ad.topCities || []).length > 0 ? (
            <div className="space-y-3">
              {ad.topCities.map((c, i) => (
                <div key={c.city} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-blood-100 dark:bg-blood-950 text-blood-700 dark:text-blood-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.city}</p>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-1">
                      <div className="bg-blood-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, (c.count / (ad.topCities[0]?.count || 1)) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-6 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-4">Aucune donnée</p>}
        </div>
      </div>

      {/* ── Row 6: Taux global ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-950 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-7 h-7 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Taux de satisfaction global</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{ad.fulfillmentRate}%</p>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-2">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${ad.fulfillmentRate}%` }} />
            </div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950 rounded-xl flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-7 h-7 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Taux de disponibilité donneurs</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{ad.donorAvailabilityRate}%</p>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${ad.donorAvailabilityRate}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}