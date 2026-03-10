import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth }  from '@nestjs/swagger';
import { JwtAuthGuard }  from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { MailService }   from './mail.service';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('admin-mail')
@Controller('admin/mail')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminMailController {
  constructor(
    private mail:   MailService,
    private prisma: PrismaService,
  ) {}

  @Post('send')
  @ApiOperation({ summary: 'Envoyer un email groupé (Admin)' })
  async sendBulkEmail(
    @Req() req: any,
    @Body() body: {
      subject:    string;
      message:    string;
      audience:   'DONOR' | 'PATIENT' | 'ALL';
      onlyVerified?: boolean;
    },
  ) {
    const admin = await this.prisma.user.findUnique({
      where:  { id: req.user.sub },
      select: { firstName: true, lastName: true },
    });
    const adminName = `${admin?.firstName} ${admin?.lastName}`;

    // ── Construire le where ──
    const where: any = { isActive: true };
    if (body.audience === 'DONOR')   where.role = 'DONOR';
    if (body.audience === 'PATIENT') where.role = 'PATIENT';
    if (body.audience === 'ALL')     where.role = { in: ['DONOR', 'PATIENT'] };
    if (body.onlyVerified)           where.isVerified = true;

    const users = await this.prisma.user.findMany({
      where,
      select: { email: true, firstName: true },
    });

    if (users.length === 0) return { message: 'Aucun destinataire trouvé', sent: 0, failed: 0 };

    // ── Convertir le message en HTML ──
    const htmlBody = body.message
      .split('\n')
      .map((line) => line.trim() ? `<p style="margin:0 0 12px;">${line}</p>` : '<br>')
      .join('');

    const result = await this.mail.sendBulkEmail(users, body.subject, htmlBody, adminName);

    return {
      message:    `Email envoyé à ${result.sent} destinataire(s)`,
      total:      users.length,
      sent:       result.sent,
      failed:     result.failed,
      audience:   body.audience,
    };
  }

  @Post('preview')
  @ApiOperation({ summary: 'Prévisualiser le nombre de destinataires' })
  async previewAudience(
    @Body() body: { audience: 'DONOR' | 'PATIENT' | 'ALL'; onlyVerified?: boolean },
  ) {
    const where: any = { isActive: true };
    if (body.audience === 'DONOR')   where.role = 'DONOR';
    if (body.audience === 'PATIENT') where.role = 'PATIENT';
    if (body.audience === 'ALL')     where.role = { in: ['DONOR', 'PATIENT'] };
    if (body.onlyVerified)           where.isVerified = true;

    const count = await this.prisma.user.count({ where });
    return { count, audience: body.audience };
  }
}