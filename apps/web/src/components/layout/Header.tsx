import { Menu, Bell, LogOut, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { BLOOD_GROUP_LABELS } from '../../types';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-500 hover:text-gray-700"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2 w-80">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="bg-transparent text-sm outline-none w-full placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Blood Group Badge */}
        {user?.bloodGroup && (
          <span className="badge bg-blood-100 text-blood-700 px-3 py-1 text-sm">
            🩸 {BLOOD_GROUP_LABELS[user.bloodGroup]}
          </span>
        )}

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blood-600 text-white text-[10px] rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-500 hover:text-blood-600 transition-colors text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}