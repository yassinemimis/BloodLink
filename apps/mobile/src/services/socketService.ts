import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

const WS_URL = 'http://10.0.2.2:3000/ws';

class SocketService {
  private socket: Socket | null = null;

  async connect(userId: string) {
    const token = await SecureStore.getItemAsync('accessToken');

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connecté');
      this.socket?.emit('register', { userId });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket déconnecté:', reason);
    });

    // Écouter les notifications
    this.socket.on('notification', async (data) => {
      console.log('🔔 Notification reçue:', data);
      await this.showLocalNotification(data.title, data.body);
    });

    // Écouter les alertes urgentes
    this.socket.on('urgent-alert', async (data) => {
      console.log('🚨 Alerte urgente:', data);
      await this.showLocalNotification(
        '🚨 URGENCE: ' + data.title,
        data.body,
      );
    });

    // Écouter les mises à jour de statut
    this.socket.on('status-update', (data) => {
      console.log('📊 Mise à jour statut:', data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Erreur WebSocket:', error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 WebSocket déconnecté manuellement');
    }
  }

  private async showLocalNotification(title: string, body: string) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();