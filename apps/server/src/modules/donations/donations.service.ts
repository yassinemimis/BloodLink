import {
  Injectable, NotFoundException,
  BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { CreateDonationDto } from './dto/create-donation.dto';
import { DonationStatus } from '@prisma/client';


// ✅ خريطة أسماء فصائل الدم
const BG: Record<string, string> = {
  O_POSITIVE: 'O+', O_NEGATIVE: 'O-',
  A_POSITIVE: 'A+', A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+', B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+', AB_NEGATIVE: 'AB-',
};

@Injectable()
export class DonationsService {
  private readonly logger = new Logger('DonationsService');

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService, // ✅
    private notificationsGateway: NotificationsGateway, // ✅
  ) {}

  // ==================== ACCEPTER UNE DEMANDE ====================
  async acceptRequest(donorId: string, dto: CreateDonationDto) {
    // 1. Vérifier la demande
    const request = await this.prisma.bloodRequest.findUnique({
      where: { id: dto.requestId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!request) throw new NotFoundException('Demande de sang non trouvée');

    if (request.status === 'FULFILLED' || request.status === 'CANCELLED') {
      throw new BadRequestException('Cette demande n\'est plus active');
    }

    // 2. Vérifier si déjà accepté
    const existingDonation = await this.prisma.donation.findFirst({
      where: {
        requestId: dto.requestId,
        donorId,
        status: { notIn: ['REJECTED', 'CANCELLED'] },
      },
    });

    if (existingDonation) {
      throw new BadRequestException('Vous avez déjà répondu à cette demande');
    }

    // 3. Vérifier éligibilité (56 jours)
    const donor = await this.prisma.user.findUnique({ where: { id: donorId } });
    if (!donor) throw new NotFoundException('Donneur non trouvé');

    if (donor.lastDonationAt) {
      const days = Math.floor(
        (Date.now() - donor.lastDonationAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days < 56) {
        throw new BadRequestException(
          `Vous devez attendre encore ${56 - days} jours avant de pouvoir donner`,
        );
      }
    }

    // 4. Créer la donation
    const donation = await this.prisma.donation.create({
      data: {
        requestId: dto.requestId,
        donorId,
        status: 'ACCEPTED',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        notes: dto.notes,
      },
      include: {
        request: { select: { id: true, bloodGroup: true, hospital: true, urgencyLevel: true } },
        donor:   { select: { id: true, firstName: true, lastName: true, bloodGroup: true } },
      },
    });

    // 5. Mettre à jour statut demande
    await this.prisma.bloodRequest.update({
      where: { id: dto.requestId },
      data: { status: 'MATCHED' },
    });

    // ✅ 6. Notifier le Patient
    const bgLabel    = BG[request.bloodGroup] || request.bloodGroup;
    const donorName  = `${donor.firstName} ${donor.lastName}`;
    const patientId  = request.patientId;

    const title = `✅ Un donneur a accepté votre demande !`;
    const body  = `${donorName} (${BG[donor.bloodGroup] || donor.bloodGroup}) accepte de donner du sang ${bgLabel} à ${request.hospital}.`;
    const data  = {
      requestId:  request.id,
      donationId: donation.id,
      donorName,
      hospital:   request.hospital,
      bloodGroup: request.bloodGroup,
    };

    try {
      // Sauvegarder en DB
      await this.notificationsService.create(patientId, title, body, 'DONATION', data);
      this.logger.log(`✅ Notification envoyée au patient ${patientId}`);

      // Envoyer en temps réel via WebSocket
      this.notificationsGateway.sendNotificationToUser(patientId, {
        title, body, type: 'DONATION', data,
      });
      this.logger.log(`✅ WebSocket notification envoyée au patient`);
    } catch (err) {
      this.logger.error('Erreur notification patient:', err);
    }

    return {
      message: 'Donation acceptée avec succès',
      donation,
    };
  }

   // ==================== COMPLÉTER UNE DONATION ====================
  async completeDonation(donationId: string, userId: string, userRole: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      include: {
        request: {
          select: {
            id: true, hospital: true, patientId: true,
          },
        },
      },
    });

    if (!donation) throw new NotFoundException('Donation non trouvée');

    // ✅ Vérification des droits :
    //    - ADMIN / DOCTOR : accès libre
    //    - PATIENT : seulement si c'est SA demande
    if (userRole === 'PATIENT') {
      const request = donation.request as any;
      if (request?.patientId !== userId) {
        throw new ForbiddenException('Vous ne pouvez confirmer que vos propres demandes');
      }
    }

    if (donation.status !== 'ACCEPTED' && donation.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Cette donation ne peut pas être complétée');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedDonation = await tx.donation.update({
        where: { id: donationId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      await tx.user.update({
        where: { id: donation.donorId },
        data: {
          lastDonationAt: new Date(),
          totalDonations: { increment: 1 },
          isAvailable: false,
        },
      });

      const updatedRequest = await tx.bloodRequest.update({
        where: { id: donation.requestId },
        data: { unitsFulfilled: { increment: 1 } },
      });

      if (updatedRequest.unitsFulfilled >= updatedRequest.unitsNeeded) {
        await tx.bloodRequest.update({
          where: { id: donation.requestId },
          data: { status: 'FULFILLED' },
        });
      }

      return updatedDonation;
    });

    return {
      message: 'Donation complétée avec succès. Merci pour votre don !',
      donation: result,
    };
  }

  // ==================== REJETER UNE DONATION ====================
  async rejectDonation(donationId: string, donorId: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      include: { request: true },
    });

    if (!donation) throw new NotFoundException('Donation non trouvée');
    if (donation.donorId !== donorId) {
      throw new ForbiddenException('Vous ne pouvez pas rejeter cette donation');
    }

    const updated = await this.prisma.donation.update({
      where: { id: donationId },
      data: { status: 'REJECTED' },
    });

    // ✅ Notifier le Patient
    try {
      const req = donation.request as any;
      await this.notificationsService.create(
        req?.patientId,
        '😔 Un donneur a décliné',
        `Un donneur a décliné votre demande à ${req?.hospital}. Nous continuons la recherche.`,
        'DONATION',
        { requestId: req?.id },
      );
    } catch (err) {
      this.logger.error('Erreur notification rejet:', err);
    }

    return updated;
  }

  // ==================== HISTORIQUE ====================
  async getDonorHistory(donorId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        where: { donorId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          request: {
            select: {
              id: true, bloodGroup: true, hospital: true, urgencyLevel: true,
              patient: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.donation.count({ where: { donorId } }),
    ]);

    return {
      data: donations,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== LISTER (Admin) ====================
  async findAll(filters?: { status?: DonationStatus; page?: number; limit?: number }) {
    const page  = filters?.page  || 1;
    const limit = filters?.limit || 20;
    const skip  = (page - 1) * limit;
    const where: any = {};
    if (filters?.status) where.status = filters.status;

    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          donor:   { select: { id: true, firstName: true, lastName: true, bloodGroup: true } },
          request: { select: { id: true, bloodGroup: true, hospital: true, urgencyLevel: true } },
        },
      }),
      this.prisma.donation.count({ where }),
    ]);

    return {
      data: donations,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}