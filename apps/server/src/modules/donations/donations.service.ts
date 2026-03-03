import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { DonationStatus } from '@prisma/client';

@Injectable()
export class DonationsService {
  constructor(private prisma: PrismaService) {}

  // ==================== ACCEPTER UNE DEMANDE (par un donneur) ====================
  async acceptRequest(donorId: string, dto: CreateDonationDto) {
    // Vérifier que la demande existe et est active
    const request = await this.prisma.bloodRequest.findUnique({
      where: { id: dto.requestId },
    });

    if (!request) {
      throw new NotFoundException('Demande de sang non trouvée');
    }

    if (request.status === 'FULFILLED' || request.status === 'CANCELLED') {
      throw new BadRequestException('Cette demande n\'est plus active');
    }

    // Vérifier que le donneur n'a pas déjà accepté cette demande
    const existingDonation = await this.prisma.donation.findFirst({
      where: {
        requestId: dto.requestId,
        donorId: donorId,
        status: { notIn: ['REJECTED', 'CANCELLED'] },
      },
    });

    if (existingDonation) {
      throw new BadRequestException(
        'Vous avez déjà répondu à cette demande',
      );
    }

    // Vérifier l'éligibilité du donneur (délai de 56 jours)
    const donor = await this.prisma.user.findUnique({
      where: { id: donorId },
    });

    if (!donor) {
      throw new NotFoundException('Donneur non trouvé');
    }

    if (donor.lastDonationAt) {
      const daysSinceLastDonation = Math.floor(
        (Date.now() - donor.lastDonationAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceLastDonation < 56) {
        throw new BadRequestException(
          `Vous devez attendre encore ${56 - daysSinceLastDonation} jours avant de pouvoir donner`,
        );
      }
    }

    // Créer la donation
    const donation = await this.prisma.donation.create({
      data: {
        requestId: dto.requestId,
        donorId: donorId,
        status: 'ACCEPTED',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        notes: dto.notes,
      },
      include: {
        request: {
          select: {
            id: true,
            bloodGroup: true,
            hospital: true,
            urgencyLevel: true,
          },
        },
        donor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            bloodGroup: true,
          },
        },
      },
    });

    // Mettre à jour le statut de la demande
    await this.prisma.bloodRequest.update({
      where: { id: dto.requestId },
      data: { status: 'MATCHED' },
    });

    return {
      message: 'Donation acceptée avec succès',
      donation,
    };
  }

  // ==================== COMPLÉTER UNE DONATION ====================
  async completeDonation(donationId: string, userId: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      include: { request: true },
    });

    if (!donation) {
      throw new NotFoundException('Donation non trouvée');
    }

    if (donation.status !== 'ACCEPTED' && donation.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Cette donation ne peut pas être complétée',
      );
    }

    // Transaction : mettre à jour donation + donneur + demande
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Mettre à jour la donation
      const updatedDonation = await tx.donation.update({
        where: { id: donationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // 2. Mettre à jour le donneur
      await tx.user.update({
        where: { id: donation.donorId },
        data: {
          lastDonationAt: new Date(),
          totalDonations: { increment: 1 },
          isAvailable: false, // Indisponible après un don
        },
      });

      // 3. Mettre à jour la demande
      const updatedRequest = await tx.bloodRequest.update({
        where: { id: donation.requestId },
        data: {
          unitsFulfilled: { increment: 1 },
        },
      });

      // 4. Vérifier si la demande est complètement satisfaite
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
    });

    if (!donation) {
      throw new NotFoundException('Donation non trouvée');
    }

    if (donation.donorId !== donorId) {
      throw new ForbiddenException('Vous ne pouvez pas rejeter cette donation');
    }

    return this.prisma.donation.update({
      where: { id: donationId },
      data: { status: 'REJECTED' },
    });
  }

  // ==================== HISTORIQUE DES DONATIONS D'UN DONNEUR ====================
  async getDonorHistory(donorId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        where: { donorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          request: {
            select: {
              id: true,
              bloodGroup: true,
              hospital: true,
              urgencyLevel: true,
              patient: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
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

  // ==================== LISTER TOUTES LES DONATIONS (Admin) ====================
  async findAll(filters?: {
    status?: DonationStatus;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.status) where.status = filters.status;

    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          donor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              bloodGroup: true,
            },
          },
          request: {
            select: {
              id: true,
              bloodGroup: true,
              hospital: true,
              urgencyLevel: true,
            },
          },
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