import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ✅ تحقق أن المستخدم له حق الوصول للمحادثة
  async verifyAccess(donationId: string, userId: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      include: { request: { select: { patientId: true } } },
    });
    if (!donation) throw new NotFoundException('Donation non trouvée');

    const isPatient = donation.request.patientId === userId;
    const isDonor   = donation.donorId === userId;

    if (!isPatient && !isDonor) {
      throw new ForbiddenException('Accès non autorisé à cette conversation');
    }

    // ✅ Chat uniquement si donation ACCEPTED, IN_PROGRESS ou COMPLETED
    if (!['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(donation.status)) {
      throw new ForbiddenException('Le chat est disponible seulement après acceptation du don');
    }

    return { donation, isPatient, isDonor };
  }

  // ✅ Envoyer un message
  async sendMessage(donationId: string, senderId: string, content: string) {
    await this.verifyAccess(donationId, senderId);
    return this.prisma.message.create({
      data:    { donationId, senderId, content },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
    });
  }

  // ✅ Récupérer les messages
  async getMessages(donationId: string, userId: string) {
    await this.verifyAccess(donationId, userId);

    // Marquer comme lus
    await this.prisma.message.updateMany({
      where: { donationId, isRead: false, senderId: { not: userId } },
      data:  { isRead: true },
    });

    return this.prisma.message.findMany({
      where:   { donationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } } },
    });
  }

  // ✅ قائمة المحادثات للمستخدم
  async getConversations(userId: string) {
    const donations = await this.prisma.donation.findMany({
      where: {
        status: { in: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] },
        OR: [
          { donorId: userId },
          { request: { patientId: userId } },
        ],
      },
      include: {
        donor:   { select: { id: true, firstName: true, lastName: true, avatar: true, bloodGroup: true } },
        request: { select: { id: true, hospital: true, bloodGroup: true, patientId: true,
                             patient: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { firstName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return donations.map((d) => {
      const isPatient  = d.request.patientId === userId;
      const otherUser  = isPatient ? d.donor : d.request.patient;
      const lastMsg    = d.messages[0] || null;
      const unread     = 0; // يمكن إضافة count لاحقاً

      return {
        donationId:  d.id,
        requestId:   d.request.id,
        hospital:    d.request.hospital,
        bloodGroup:  d.request.bloodGroup,
        status:      d.status,
        otherUser,
        lastMessage: lastMsg ? { content: lastMsg.content, senderName: lastMsg.sender.firstName, createdAt: lastMsg.createdAt } : null,
        unreadCount: unread,
      };
    });
  }

  // ✅ عدد الرسائل غير المقروءة
  async getUnreadCount(userId: string): Promise<number> {
    // جلب كل الـ donations التي فيها المستخدم
    const donations = await this.prisma.donation.findMany({
      where: {
        status: { in: ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] },
        OR: [
          { donorId: userId },
          { request: { patientId: userId } },
        ],
      },
      select: { id: true },
    });

    return this.prisma.message.count({
      where: {
        donationId: { in: donations.map((d) => d.id) },
        senderId:   { not: userId },
        isRead:     false,
      },
    });
  }
}