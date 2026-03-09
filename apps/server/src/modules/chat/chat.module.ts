import { Module } from '@nestjs/common';
import { ChatGateway }     from './chat.gateway';
import { ChatService }     from './chat.service';
import { ChatController }  from './chat.controller';
import { PrismaModule }    from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports:     [PrismaModule, NotificationsModule],
  providers:   [ChatGateway, ChatService],
  controllers: [ChatController],
})
export class ChatModule {}