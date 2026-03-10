import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService }   from '../mail/mail.service';  // ✅

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private mail:   MailService,  // ✅
  ) {}

  // ==================== CRÉER UNE NOTIFICATION ====================
  async create(userId: string, title: string, body: string, type: string, data?: any) {
    const notification = await this.prisma.notification.create({
      data: { userId, title, body, type, data },
    });

    // ✅ Envoyer email (fire & forget — لا يوقف العملية)
    this.prisma.user.findUnique({
      where:  { id: userId },
      select: { email: true, firstName: true },
    }).then((user) => {
      if (user) {
        this.mail.sendNotificationEmail(user.email, user.firstName, title, body, type)
          .catch(() => {});
      }
    }).catch(() => {});

    return notification;
  }

  // ==================== NOTIFIER PLUSIEURS DONNEURS ====================
  async notifyDonors(donorIds: string[], title: string, body: string, type: string, data?: any) {
    const notifications = donorIds.map((userId) => ({
      userId, title, body, type, data: data || {},
    }));

    await this.prisma.notification.createMany({ data: notifications });

    // ✅ Envoyer emails en parallèle (fire & forget)
    this.prisma.user.findMany({
      where:  { id: { in: donorIds } },
      select: { email: true, firstName: true },
    }).then((users) => {
      users.forEach((user) => {
        this.mail.sendNotificationEmail(user.email, user.firstName, title, body, type)
          .catch(() => {});
      });
    }).catch(() => {});
  }

  // ==================== RÉCUPÉRER LES NOTIFICATIONS ====================
  async findAllForUser(userId: string, page: number = 1, limit: number = 30) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where:   { userId },
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      unreadCount,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== MARQUER COMME LUE ====================
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.userId !== userId)
      throw new NotFoundException('Notification non trouvée');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data:  { isRead: true },
    });
  }

  // ==================== MARQUER TOUT COMME LU ====================
  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true },
    });
    return { message: 'Toutes les notifications ont été marquées comme lues' };
  }

  // ==================== SUPPRIMER UNE NOTIFICATION ====================
  async remove(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.userId !== userId)
      throw new NotFoundException('Notification non trouvée');

    return this.prisma.notification.delete({ where: { id: notificationId } });
  }
}