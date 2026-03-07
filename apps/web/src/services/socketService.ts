import { io, Socket } from 'socket.io-client';

const WS_URL =
  (import.meta.env.VITE_API_URL || 'http://localhost:3000/api')
    .replace('/api', '');

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  connect(userId: string) {
    this.userId = userId;

    if (this.socket?.connected) {
      console.log('🔌 WebSocket déjà connecté');
      return;
    }

    // تنظيف الـ socket القديم قبل إنشاء جديد
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const token = localStorage.getItem('accessToken');

    this.socket = io(`${WS_URL}/ws`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      // ✅ لا يوجد pingInterval هنا — هذا من مسؤولية السيرفر
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connecté:', this.socket?.id);
      this.socket?.emit('register', { userId: this.userId });
      this._startHeartbeat(); // ✅ نبدأ Heartbeat يدوي كل 25 ثانية
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 WebSocket déconnecté:', reason);
      this._stopHeartbeat();
      // إذا قطع السيرفر الاتصال يدوياً → أعد الاتصال
      if (reason === 'io server disconnect') {
        setTimeout(() => this.socket?.connect(), 1000);
      }
    });

    this.socket.on('reconnect', () => {
      console.log('🔄 WebSocket reconnecté');
      // ✅ إعادة التسجيل تلقائياً بعد كل reconnect
      this.socket?.emit('register', { userId: this.userId });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Erreur WebSocket:', error.message);
    });
  }

  // ============================================================
  // Heartbeat يدوي: emit 'ping' كل 25 ثانية لإبقاء الاتصال حياً
  // ============================================================
  private _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 25000);
  }

  private _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  onNotification(callback: (data: any) => void) {
    this.socket?.on('notification', callback);
  }

  onUrgentAlert(callback: (data: any) => void) {
    this.socket?.on('urgent-alert', callback);
  }

  onStatusUpdate(callback: (data: any) => void) {
    this.socket?.on('status-update', callback);
  }

  offNotification(callback: (data: any) => void) {
    this.socket?.off('notification', callback);
  }

  offUrgentAlert(callback: (data: any) => void) {
    this.socket?.off('urgent-alert', callback);
  }

  offStatusUpdate(callback: (data: any) => void) {
    this.socket?.off('status-update', callback);
  }

  disconnect() {
    this._stopHeartbeat();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
    console.log('🔌 WebSocket déconnecté manuellement');
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();