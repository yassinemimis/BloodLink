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
    userId?: string;  // ✅ جديد
    role?: string;    // ✅ جديد
  }) {
    const page  = filters?.page  || 1;
    const limit = filters?.limit || 20;
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (filters?.status)       where.status       = filters.status;
    if (filters?.urgencyLevel) where.urgencyLevel = filters.urgencyLevel;
    if (filters?.bloodGroup)   where.bloodGroup   = filters.bloodGroup;

    // ✅ PATIENT يرى فقط طلباته الخاصة
    if (filters?.role === 'PATIENT' && filters?.userId) {
      where.patientId = filters.userId;
    }

    // ✅ DONOR يرى كل الطلبات النشطة (ليس CANCELLED/FULFILLED)
    if (filters?.role === 'DONOR') {
      where.status = filters.status || {
        notIn: ['CANCELLED', 'FULFILLED'],
      };
    }

    const [requests, total] = await Promise.all([
      this.prisma.bloodRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { urgencyLevel: 'asc' },
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
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== DÉTAIL D'UNE DEMANDE ====================
  async // أضف هذا في دالة findOne — داخل include للـ donations
findOne(id: string) {
  return this.prisma.bloodRequest.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          id: true, firstName: true, lastName: true,
          phone: true, bloodGroup: true, city: true,
        },
      },
      doctor: {
        select: { id: true, firstName: true, lastName: true },
      },
      donations: {
        orderBy: { createdAt: 'desc' },
        include: {
          donor: {
            select: {
              id: true, firstName: true, lastName: true,
              bloodGroup: true, phone: true,      // ✅ رقم هاتف الـ donor
              city: true, totalDonations: true,   // ✅ مدينة وعدد تبرعات
              isAvailable: true,
            },
          },
        },
      },
    },
  });
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


    // ==================== STATISTIQUES PAR RÔLE ====================
  async getStatisticsByRole(userId: string, role: string) {
    // ADMIN & DOCTOR: statistiques globales
    if (role === 'ADMIN' || role === 'DOCTOR') {
      return this.getStatistics();
    }

    // PATIENT: ses propres demandes
    if (role === 'PATIENT') {
      const [
        myTotal,
        myPending,
        myMatched,
        myFulfilled,
        myCancelled,
        myRequests,
      ] = await Promise.all([
        this.prisma.bloodRequest.count({ where: { patientId: userId } }),
        this.prisma.bloodRequest.count({ where: { patientId: userId, status: 'PENDING' } }),
        this.prisma.bloodRequest.count({ where: { patientId: userId, status: 'MATCHED' } }),
        this.prisma.bloodRequest.count({ where: { patientId: userId, status: 'FULFILLED' } }),
        this.prisma.bloodRequest.count({ where: { patientId: userId, status: 'CANCELLED' } }),
        this.prisma.bloodRequest.findMany({
          where: { patientId: userId },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            donations: {
              where: { status: { in: ['ACCEPTED', 'COMPLETED'] } },
              include: {
                donor: {
                  select: { id: true, firstName: true, lastName: true, bloodGroup: true, phone: true },
                },
              },
            },
          },
        }),
      ]);

      return {
        role: 'PATIENT',
        myTotal,
        myPending,
        myMatched,
        myFulfilled,
        myCancelled,
        myRequests,
      };
    }

    // DONOR: historique de ses donations
    if (role === 'DONOR') {
      const donor = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          totalDonations: true,
          lastDonationAt: true,
          isAvailable: true,
          bloodGroup: true,
        },
      });

      const [
        totalAccepted,
        totalCompleted,
        recentDonations,
        activeRequests,
      ] = await Promise.all([
        this.prisma.donation.count({ where: { donorId: userId, status: 'ACCEPTED' } }),
        this.prisma.donation.count({ where: { donorId: userId, status: 'COMPLETED' } }),
        this.prisma.donation.findMany({
          where: { donorId: userId },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            request: {
              select: {
                id: true, bloodGroup: true, hospital: true,
                urgencyLevel: true, status: true,
              },
            },
          },
        }),
        this.prisma.bloodRequest.findMany({
          where: {
            status: { in: ['PENDING', 'SEARCHING', 'MATCHED'] },
          },
          take: 5,
          orderBy: [{ urgencyLevel: 'asc' }, { createdAt: 'desc' }],
          include: {
            patient: {
              select: { firstName: true, lastName: true },
            },
          },
        }),
      ]);

      // حساب الأيام حتى التبرع التالي
      let daysUntilNextDonation = 0;
      if (donor?.lastDonationAt) {
        const daysSince = Math.floor(
          (Date.now() - new Date(donor.lastDonationAt).getTime()) / (1000 * 60 * 60 * 24),
        );
        daysUntilNextDonation = Math.max(0, 56 - daysSince);
      }

      return {
        role: 'DONOR',
        totalDonations: donor?.totalDonations || 0,
        totalAccepted,
        totalCompleted,
        isAvailable: donor?.isAvailable,
        daysUntilNextDonation,
        lastDonationAt: donor?.lastDonationAt,
        recentDonations,
        activeRequests,
      };
    }

    return this.getStatistics();
  }
}