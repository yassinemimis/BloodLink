import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Droplets,
  Users,
  Building2,
  Map,
  Bell,
  User,
  X,
  Heart,
  PlusCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { Role } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  {
    path: '/',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT],
  },
  {
    path: '/requests',
    label: 'Demandes de sang',
    icon: Droplets,
    roles: [Role.ADMIN, Role.DOCTOR, Role.PATIENT],
  },
  {
    path: '/requests/new',
    label: 'Nouvelle demande',
    icon: PlusCircle,
    roles: [Role.DOCTOR, Role.PATIENT],
  },
  {
    path: '/donors',
    label: 'Donneurs',
    icon: Users,
    roles: [Role.ADMIN, Role.DOCTOR],
  },
  {
    path: '/centers',
    label: 'Centres de collecte',
    icon: Building2,
    roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT],
  },
  {
    path: '/map',
    label: 'Carte',
    icon: Map,
    roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT],
  },
  {
    path: '/notifications',
    label: 'Notifications',
    icon: Bell,
    roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT],
  },
  {
    path: '/profile',
    label: 'Mon profil',
    icon: User,
    roles: [Role.ADMIN, Role.DOCTOR, Role.DONOR, Role.PATIENT],
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore();

  const filteredNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blood-600 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-blood-600">BloodLink</h1>
              <p className="text-xs text-gray-500">Sauver des vies</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-500">
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
                 ${
                   isActive
                     ? 'bg-blood-50 text-blood-700 border-l-4 border-blood-600'
                     : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                 }`
              }
            >
              <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
            <div className="w-10 h-10 bg-blood-100 rounded-full flex items-center justify-center">
              <span className="text-blood-700 font-bold text-sm">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}