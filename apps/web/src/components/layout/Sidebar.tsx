import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Droplets, Users,
  Building2, Map, Bell, User, X,  PlusCircle,
  ShieldCheck, Megaphone, Moon, Sun,
  MessageSquare,
  MailOpen,
  
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useDarkMode } from '../../store/useDarkMode';
import { Role } from '../../types';
import logo from '../../assets/blooslink-logo.png';
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { path: '/', label: 'Tableau de bord', icon: LayoutDashboard, roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT] },
  { path: '/requests', label: 'Demandes de sang', icon: Droplets, roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT] },
  { path: '/requests1/new', label: 'Nouvelle demande', icon: PlusCircle, roles: [Role.DOCTOR, Role.PATIENT] },
  { path: '/chat', label: 'Messages', icon: MessageSquare, roles: [Role.DONOR, Role.PATIENT] },
  { path: '/donors', label: 'Donneurs', icon: Users, roles: [Role.ADMIN, Role.DOCTOR] },
  { path: '/centers', label: 'Centres de collecte', icon: Building2, roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT] },
  { path: '/verification', label: 'Vérification', icon: ShieldCheck, roles: [Role.ADMIN] },
  { path: '/campaigns', label: 'Campagnes', icon: Megaphone, roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT] },
  { path: '/map', label: 'Carte', icon: Map, roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT] },
  { path: '/admin/mail', label: 'Campagne Email', icon: MailOpen, roles: [Role.ADMIN] },
  { path: '/notifications', label: 'Notifications', icon: Bell, roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT] },
  { path: '/profile', label: 'Mon profil', icon: User, roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT] },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const { isDark, toggle } = useDarkMode();

  const filteredNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 flex flex-col
        w-72 bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-800
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-800">
  <div className="flex items-center gap-3">
    {/* ✅ أيقونة فقط — بدون خلفية حمراء */}
    <img
      src={logo}
      alt="BloodLink"
      className="h-10 w-10 object-contain"
    />
    <div>
      <h1 className="text-xl font-bold text-blood-600">BloodLink</h1>
      <p className="text-xs text-gray-500 dark:text-gray-400">Sauver des vies</p>
    </div>
  </div>
  <button onClick={onClose} className="lg:hidden text-gray-500 dark:text-gray-400">
    <X className="w-5 h-5" />
  </button>
</div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                 transition-all duration-200 group
                 ${isActive
                  ? 'bg-blood-50 text-blood-700 border-l-4 border-blood-600 dark:bg-blood-950 dark:text-blood-400'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                }`
              }
            >
              <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* ✅ Dark Mode Toggle */}
        <div className="px-4 pb-3">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                       text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800
                       transition-colors duration-200"
          >
            {isDark ? (
              <><Sun className="w-5 h-5 text-yellow-400" /> Mode clair</>
            ) : (
              <><Moon className="w-5 h-5 text-gray-500" /> Mode sombre</>
            )}
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-blood-100 dark:bg-blood-950 flex items-center justify-center">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-blood-700 dark:text-blood-400 font-bold text-sm">{initials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}