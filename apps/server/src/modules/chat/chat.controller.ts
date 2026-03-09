import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService }  from './chat.service';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Liste des conversations' })
  getConversations(@Req() req: any) {
    return this.chatService.getConversations(req.user.sub);
  }

  @Get(':donationId/messages')
  @ApiOperation({ summary: 'Messages d\'une conversation' })
  getMessages(@Param('donationId') id: string, @Req() req: any) {
    return this.chatService.getMessages(id, req.user.sub);
  }

  @Post(':donationId/messages')
  @ApiOperation({ summary: 'Envoyer un message' })
  sendMessage(
    @Param('donationId') id: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(id, req.user.sub, content);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nombre de messages non lus' })
  getUnreadCount(@Req() req: any) {
    return this.chatService.getUnreadCount(req.user.sub);
  }
}