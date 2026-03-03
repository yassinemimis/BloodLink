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
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationsGateway');
  private connectedUsers = new Map<string, string>(); // userId -> socketId

  // ==================== CONNEXION ====================
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  // ==================== DÉCONNEXION ====================
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Supprimer l'utilisateur de la map
    for (const [userId, socketId] of this.connectedUsers.entries()) {
      if (socketId === client.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
  }

  // ==================== ENREGISTREMENT UTILISATEUR ====================
  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    this.connectedUsers.set(data.userId, client.id);
    this.logger.log(`User ${data.userId} registered with socket ${client.id}`);
    return { event: 'registered', data: { success: true } };
  }

  // ==================== ENVOYER NOTIFICATION À UN UTILISATEUR ====================
  sendNotificationToUser(userId: string, notification: any) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', notification);
      this.logger.log(`Notification sent to user ${userId}`);
    }
  }

  // ==================== ENVOYER ALERTE URGENTE ====================
  sendUrgentAlert(donorIds: string[], alert: any) {
    donorIds.forEach((donorId) => {
      const socketId = this.connectedUsers.get(donorId);
      if (socketId) {
        this.server.to(socketId).emit('urgent-alert', alert);
      }
    });
    this.logger.log(
      `Urgent alert sent to ${donorIds.length} donors`,
    );
  }

  // ==================== MISE À JOUR DU STATUT ====================
  sendStatusUpdate(userId: string, requestId: string, status: string) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('status-update', { requestId, status });
    }
  }
}