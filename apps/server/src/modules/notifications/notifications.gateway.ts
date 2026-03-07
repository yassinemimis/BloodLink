import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:8081'],
    credentials: true,
  },
  namespace: '/ws',
  // ✅ pingInterval على السيرفر فقط — هنا مكانه الصحيح
  pingInterval: 25000,
  pingTimeout: 10000,
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationsGateway');
  private userToSocket = new Map<string, string>();
  private socketToUser = new Map<string, string>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.userToSocket.delete(userId);
      this.socketToUser.delete(client.id);
    }
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const userId = data.userId;
    const oldSocketId = this.userToSocket.get(userId);
    if (oldSocketId && oldSocketId !== client.id) {
      this.socketToUser.delete(oldSocketId);
    }
    this.userToSocket.set(userId, client.id);
    this.socketToUser.set(client.id, userId);
    this.logger.log(`User ${userId} registered → socket ${client.id}`);
    return { event: 'registered', data: { success: true } };
  }

  // ✅ معالجة الـ ping اليدوي من الـ Client
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong');
  }

  sendNotificationToUser(userId: string, notification: any) {
    const socketId = this.userToSocket.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
      this.logger.log(`Notification sent to user ${userId}`);
    }
  }

  sendUrgentAlert(donorIds: string[], alert: any) {
    let delivered = 0;
    donorIds.forEach((donorId) => {
      const socketId = this.userToSocket.get(donorId);
      if (socketId) {
        this.server.to(socketId).emit('urgent-alert', alert);
        delivered++;
      }
    });
    this.logger.log(`Urgent alert: ${delivered}/${donorIds.length} delivered`);
  }

  sendStatusUpdate(userId: string, requestId: string, status: string) {
    const socketId = this.userToSocket.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('status-update', { requestId, status });
    }
  }
}