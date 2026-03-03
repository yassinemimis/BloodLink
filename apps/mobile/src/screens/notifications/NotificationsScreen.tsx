import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import api from '../../services/api';
import { Notification } from '../../types';

const typeEmojis: Record<string, string> = {
  REQUEST: '🩸',
  DONATION: '✅',
  CAMPAIGN: '📢',
  SYSTEM: '⚙️',
  URGENT: '🚨',
};

const typeColors: Record<string, string> = {
  REQUEST: '#FEE2E2',
  DONATION: '#D1FAE5',
  CAMPAIGN: '#DBEAFE',
  SYSTEM: '#F3F4F6',
  URGENT: '#FEE2E2',
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (error) {
      // silently fail
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de marquer tout comme lu');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const emoji = typeEmojis[item.type] || '🔔';
    const bgColor = typeColors[item.type] || '#F3F4F6';

    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.notifUnread]}
        onPress={() => !item.isRead && markAsRead(item.id)}
        onLongPress={() => {
          Alert.alert('Supprimer', 'Supprimer cette notification ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => deleteNotification(item.id) },
          ]);
        }}
      >
        <View style={[styles.notifIcon, { backgroundColor: bgColor }]}>
          <Text style={styles.notifEmoji}>{emoji}</Text>
        </View>

        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notifTime}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
          <Text style={styles.markAllText}>✓✓ Tout marquer comme lu ({unreadCount})</Text>
        </TouchableOpacity>
      )}

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptySubtitle}>
              Vous serez notifié des demandes de sang compatibles à proximité
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  listContent: { padding: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', padding: 16 },
  markAllButton: {
    margin: 16, marginBottom: 0, backgroundColor: '#FEF2F2',
    borderRadius: 12, paddingVertical: 10, alignItems: 'center',
  },
  markAllText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },
  notifCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16,
    padding: 14, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: '#F3F4F6',
  },
  notifUnread: {
    backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderLeftWidth: 4, borderLeftColor: '#DC2626',
  },
  notifIcon: {
    width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  notifEmoji: { fontSize: 20 },
  notifContent: { flex: 1 },
  notifHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifTitle: { fontSize: 14, fontWeight: '500', color: '#374151', flex: 1 },
  notifTitleUnread: { fontWeight: '700', color: '#111827' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
  notifBody: { fontSize: 13, color: '#6B7280', marginTop: 3, lineHeight: 18 },
  notifTime: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center', lineHeight: 20 },
});