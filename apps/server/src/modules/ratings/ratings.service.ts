import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RatingsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // إنشاء تقييم — فقط المريض المرتبط بالـ donation و donation يجب أن يكون COMPLETED
  async createRating(patientId: string, donationId: string, rating: number, comment?: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        request: { select: { patientId: true } },
        donor:   { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!donation) throw new NotFoundException('Donation non trouvée');
    if (donation.request?.patientId !== patientId) throw new ForbiddenException('Vous ne pouvez évaluer que pour votre demande');
    if (donation.status !== 'COMPLETED') throw new BadRequestException('La donation doit être complétée avant de laisser un avis');

    const existing = await this.prisma.rating.findUnique({ where: { donationId } });
    if (existing) throw new BadRequestException('Cette donation a déjà été évaluée');

    const created = await this.prisma.rating.create({
      data: {
        donationId,
        patientId,
        donorId: donation.donor.id,
        rating,
        comment,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Envoyer notification au donneur (fire & forget)
    try {
      const title = '🎉 Nouvelle évaluation';
      const body  = `Vous avez reçu une nouvelle évaluation (${rating}/5).`;
      await this.notificationsService.create(donation.donor.id, title, body, 'SYSTEM', { donationId, rating });
    } catch { /* ignore errors */ }

    return created;
  }

  // جلب تقييم بواسطة donationId
  async findByDonation(donationId: string) {
    return this.prisma.rating.findUnique({
      where: { donationId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // جلب قائمة تقييمات لمتبرع (recent), مع pagination/limit
  async listRatingsForDonor(donorId: string, limit = 10, page = 1) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.rating.findMany({
        where: { donorId },
        include: {
          patient: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.rating.count({ where: { donorId } }),
    ]);

    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // إحصاءات: متوسط وعدد التقييمات لمستخدم (donor)
  async getUserRatingStats(userId: string) {
    const res = await this.prisma.rating.aggregate({
      where: { donorId: userId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return { avg: res._avg.rating ?? 0, count: res._count.rating ?? 0 };
  }
}