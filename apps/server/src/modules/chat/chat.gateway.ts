import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger }         from '@nestjs/common';
import { ChatService }    from './chat.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@WebSocketGateway({
  cors: { origin: ['http://localhost:5173', 'http://localhost:8081'], credentials: true },
  namespace: '/ws',
})
export class ChatGateway {
  @WebSocketServer() server: Server;
  private logger = new Logger('ChatGateway');

  constructor(
    private chatService: ChatService,
    private notifGateway: NotificationsGateway,
  ) {}

  // ✅ Rejoindre une room de chat
  @SubscribeMessage('chat:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { donationId: string; userId: string },
  ) {
    client.join(`chat:${data.donationId}`);
    this.logger.log(`User ${data.userId} joined chat:${data.donationId}`);
    return { event: 'chat:joined', donationId: data.donationId };
  }

  // ✅ Quitter une room
  @SubscribeMessage('chat:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { donationId: string },
  ) {
    client.leave(`chat:${data.donationId}`);
  }

  // ✅ Envoyer un message via WebSocket
  @SubscribeMessage('chat:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { donationId: string; senderId: string; content: string },
  ) {
    try {
      const message = await this.chatService.sendMessage(
        data.donationId, data.senderId, data.content,
      );

      // Broadcast à tous dans la room
      this.server.to(`chat:${data.donationId}`).emit('chat:message', message);

      // Notification push à l'autre utilisateur
      const donation = await this.getDonationParticipants(data.donationId);
      if (donation) {
        const receiverId = donation.donorId === data.senderId
          ? donation.patientId
          : donation.donorId;

        this.notifGateway.sendNotificationToUser(receiverId, {
          type:  'CHAT',
          title: '💬 Nouveau message',
          body:  `${message.sender.firstName}: ${data.content.substring(0, 50)}`,
          data:  { donationId: data.donationId },
        });
      }

      return { success: true, message };
    } catch (err) {
      this.logger.error(err.message);
      client.emit('chat:error', { message: err.message });
    }
  }

  // ✅ Typing indicator
  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { donationId: string; userId: string; isTyping: boolean },
  ) {
    client.to(`chat:${data.donationId}`).emit('chat:typing', {
      userId: data.userId, isTyping: data.isTyping,
    });
  }

  private async getDonationParticipants(donationId: string) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const d = await prisma.donation.findUnique({
        where:   { id: donationId },
        include: { request: { select: { patientId: true } } },
      });
      await prisma.$disconnect();
      return d ? { donorId: d.donorId, patientId: d.request.patientId } : null;
    } catch { return null; }
  }
}