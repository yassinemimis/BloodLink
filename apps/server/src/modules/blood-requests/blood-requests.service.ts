import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { CreateBloodRequestDto } from './dto/create-blood-request.dto';
import { RequestStatus, UrgencyLevel } from '@prisma/client';

@Injectable()
export class BloodRequestsService {
  constructor(
    private prisma: PrismaService,
    private matchingService: MatchingService,
  ) {}

  // ==================== CRÉER UNE DEMANDE ====================
  async create(userId: string, dto: CreateBloodRequestDto) {
    // Calculer la date d'expiration selon le niveau d'urgence
    const expiresAt = this.calculateExpiration(dto.urgencyLevel);

    const request = await this.prisma.bloodRequest.create({
      data: {
        patientId: userId,
        bloodGroup: dto.bloodGroup,
        urgencyLevel: dto.urgencyLevel,
        unitsNeeded: dto.unitsNeeded,
        hospital: dto.hospital,
        description: dto.description,
        latitude: dto.latitude,
        longitude: dto.longitude,
        searchRadius: dto.searchRadius || 25,
        expiresAt,
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            bloodGroup: true,
          },
        },
      },
    });

    // Lancer le matching automatique
    const matchingResult =
      await this.matchingService.matchDonorsToRequest(request.id);

    return {
      message: 'Demande de sang créée avec succès',
      request,
      matching: {
        donorsFound: matchingResult.totalFound,
        donors: matchingResult.compatibleDonors.slice(0, 5), // Top 5
      },
    };
  }

  // ==================== LISTER LES DEMANDES ====================
  async findAll(filters?: {
    status?: RequestStatus;
    urgencyLevel?: UrgencyLevel;
    bloodGroup?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.urgencyLevel) where.urgencyLevel = filters.urgencyLevel;
    if (filters?.bloodGroup) where.bloodGroup = filters.bloodGroup;

    const [requests, total] = await Promise.all([
      this.prisma.bloodRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { urgencyLevel: 'asc' }, // Critique en premier
          { createdAt: 'desc' },
        ],
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              bloodGroup: true,
            },
          },
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: { donations: true },
          },
        },
      }),
      this.prisma.bloodRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== DÉTAIL D'UNE DEMANDE ====================
  async findOne(id: string) {
    const request = await this.prisma.bloodRequest.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            bloodGroup: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        donations: {
          include: {
            donor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                bloodGroup: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Demande de sang non trouvée');
    }

    return request;
  }

  // ==================== ANNULER UNE DEMANDE ====================
  async cancel(id: string, userId: string) {
    const request = await this.prisma.bloodRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Demande non trouvée');
    }

    if (request.patientId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez annuler que vos propres demandes',
      );
    }

    return this.prisma.bloodRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ==================== STATISTIQUES ====================
  async getStatistics() {
    const [
      totalRequests,
      pendingRequests,
      fulfilledRequests,
      criticalRequests,
      requestsByBloodGroup,
    ] = await Promise.all([
      this.prisma.bloodRequest.count(),
      this.prisma.bloodRequest.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.bloodRequest.count({
        where: { status: 'FULFILLED' },
      }),
      this.prisma.bloodRequest.count({
        where: {
          urgencyLevel: 'CRITICAL',
          status: { in: ['PENDING', 'SEARCHING'] },
        },
      }),
      this.prisma.bloodRequest.groupBy({
        by: ['bloodGroup'],
        _count: { id: true },
      }),
    ]);

    return {
      totalRequests,
      pendingRequests,
      fulfilledRequests,
      criticalRequests,
      fulfillmentRate: totalRequests > 0
        ? ((fulfilledRequests / totalRequests) * 100).toFixed(1)
        : 0,
      requestsByBloodGroup,
    };
  }

  // ==================== HELPER ====================
  private calculateExpiration(urgencyLevel: UrgencyLevel): Date {
    const now = new Date();
    switch (urgencyLevel) {
      case 'CRITICAL':
        return new Date(now.getTime() + 1 * 60 * 60 * 1000);   // 1h
      case 'HIGH':
        return new Date(now.getTime() + 6 * 60 * 60 * 1000);   // 6h
      case 'MEDIUM':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);  // 24h
      case 'LOW':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 jours
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}