import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, Droplets, AlertTriangle, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Notification } from '../types';

const typeIcons: Record<string, any> = {
  REQUEST: Droplets,
  DONATION: Check,
  CAMPAIGN: Megaphone,
  SYSTEM: Bell,
  URGENT: AlertTriangle,
};

const typeColors: Record<string, string> = {
  REQUEST: 'bg-blood-100 text-blood-600',
  DONATION: 'bg-green-100 text-green-600',
  CAMPAIGN: 'bg-blue-100 text-blue-600',
  SYSTEM: 'bg-gray-100 text-gray-600',
  URGENT: 'bg-red-100 text-red-600',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Toutes les notifications marquées comme lues');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification supprimée');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} non lue(s)` : 'Tout est à jour'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-blood-600 border-t-transparent" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const IconComponent = typeIcons[notif.type] || Bell;
            const colorClass = typeColors[notif.type] || typeColors.SYSTEM;

            return (
              <div
                key={notif.id}
                className={`card flex items-start gap-4 transition-all cursor-pointer hover:shadow-md ${
                  !notif.isRead ? 'border-l-4 border-l-blood-600 bg-blood-50/30' : ''
                }`}
                onClick={() => !notif.isRead && markAsRead(notif.id)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <IconComponent className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm ${!notif.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">{notif.body}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>

                {!notif.isRead && (
                  <div className="w-2.5 h-2.5 bg-blood-600 rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-16">
          <Bell className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">Aucune notification</p>
          <p className="text-gray-400 text-sm mt-1">
            Vous serez notifié des demandes de sang à proximité
          </p>
        </div>
      )}
    </div>
  );
}