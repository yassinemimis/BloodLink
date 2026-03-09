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

  // ==================== STATISTIQUES ADMIN (enrichies) ====================
  async getStatistics() {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Génère les 6 derniers mois
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleString('fr-FR', { month: 'short' }) };
    });

    const [
      totalRequests, pendingRequests, fulfilledRequests, criticalRequests,
      totalDonors, availableDonors, totalPatients, totalDonations,
      requestsByBloodGroup, requestsByUrgency, requestsByStatus,
      todayRequests, allRequests,
    ] = await Promise.all([
      this.prisma.bloodRequest.count(),
      this.prisma.bloodRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.bloodRequest.count({ where: { status: 'FULFILLED' } }),
      this.prisma.bloodRequest.count({ where: { urgencyLevel: 'CRITICAL', status: { in: ['PENDING', 'SEARCHING'] } } }),
      this.prisma.user.count({ where: { role: 'DONOR' } }),
      this.prisma.user.count({ where: { role: 'DONOR', isAvailable: true } }),
      this.prisma.user.count({ where: { role: 'PATIENT' } }),
      this.prisma.donation.count({ where: { status: 'COMPLETED' } }),
      this.prisma.bloodRequest.groupBy({ by: ['bloodGroup'], _count: { id: true } }),
      this.prisma.bloodRequest.groupBy({ by: ['urgencyLevel'], _count: { id: true } }),
      this.prisma.bloodRequest.groupBy({ by: ['status'],      _count: { id: true } }),
      this.prisma.bloodRequest.count({ where: { createdAt: { gte: today } } }),
      // جلب كل الطلبات للـ trend (آخر 6 أشهر)
      this.prisma.bloodRequest.findMany({
        where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
        select: { createdAt: true, status: true },
      }),
    ]);

    // ✅ Trend mensuel
    const monthlyTrend = last6Months.map(({ year, month, label }) => {
      const requests  = allRequests.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
      return {
        month: label,
        total:     requests.length,
        fulfilled: requests.filter((r) => r.status === 'FULFILLED').length,
      };
    });

    // ✅ Top villes donateurs
    const donorCities = await this.prisma.user.groupBy({
      by: ['city'],
      where: { role: 'DONOR', city: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    return {
      // KPIs principaux
      totalRequests, pendingRequests, fulfilledRequests, criticalRequests,
      totalDonors, availableDonors, totalPatients, totalDonations,
      todayRequests,
      fulfillmentRate: totalRequests > 0 ? +((fulfilledRequests / totalRequests) * 100).toFixed(1) : 0,
      donorAvailabilityRate: totalDonors > 0 ? +((availableDonors / totalDonors) * 100).toFixed(1) : 0,
      // Charts
      requestsByBloodGroup,
      requestsByUrgency,
      requestsByStatus,
      monthlyTrend,
      topCities: donorCities.map((c) => ({ city: c.city!, count: c._count.id })),
    };
  }

  // ==================== STATISTIQUES PAR RÔLE ====================
  async getStatisticsByRole(userId: string, role: string) {
    if (role === 'ADMIN' || role === 'DOCTOR') return this.getStatistics();

    if (role === 'PATIENT') {
      const [myTotal, myPending, myMatched, myFulfilled, myCancelled, myRequests] = await Promise.all([
        this.prisma.bloodRequest.count({ where: { patientId: userId } }),
        this.prisma.bloodRequest.count({ where: { patientId: userId, status: 'PENDING' } }),
        this.prisma.bloodRequest.count({ where: { patientId: userId, status: 'MATCHED' } }),
        this.prisma.bloodRequest.count({ where: { patientId: userId, status: 'FULFILLED' } }),
        this.prisma.bloodRequest.count({ where: { patientId: userId, status: 'CANCELLED' } }),
        this.prisma.bloodRequest.findMany({
          where: { patientId: userId }, take: 5, orderBy: { createdAt: 'desc' },
          include: {
            donations: {
              where: { status: { in: ['ACCEPTED', 'COMPLETED'] } },
              include: { donor: { select: { id: true, firstName: true, lastName: true, bloodGroup: true, phone: true } } },
            },
          },
        }),
      ]);
      return { role: 'PATIENT', myTotal, myPending, myMatched, myFulfilled, myCancelled, myRequests };
    }

    if (role === 'DONOR') {
      const donor = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { totalDonations: true, lastDonationAt: true, isAvailable: true, bloodGroup: true },
      });
      const [totalAccepted, totalCompleted, recentDonations, activeRequests] = await Promise.all([
        this.prisma.donation.count({ where: { donorId: userId, status: 'ACCEPTED' } }),
        this.prisma.donation.count({ where: { donorId: userId, status: 'COMPLETED' } }),
        this.prisma.donation.findMany({
          where: { donorId: userId }, take: 5, orderBy: { createdAt: 'desc' },
          include: { request: { select: { id: true, bloodGroup: true, hospital: true, urgencyLevel: true, status: true } } },
        }),
        this.prisma.bloodRequest.findMany({
          where: { status: { in: ['PENDING', 'SEARCHING', 'MATCHED'] } },
          take: 5, orderBy: [{ urgencyLevel: 'asc' }, { createdAt: 'desc' }],
          include: { patient: { select: { firstName: true, lastName: true } } },
        }),
      ]);
      let daysUntilNextDonation = 0;
      if (donor?.lastDonationAt) {
        const daysSince = Math.floor((Date.now() - new Date(donor.lastDonationAt).getTime()) / 86400000);
        daysUntilNextDonation = Math.max(0, 56 - daysSince);
      }
      return {
        role: 'DONOR', totalDonations: donor?.totalDonations || 0,
        totalAccepted, totalCompleted, isAvailable: donor?.isAvailable,
        daysUntilNextDonation, lastDonationAt: donor?.lastDonationAt,
        recentDonations, activeRequests,
      };
    }

    return this.getStatistics();
  }

  // ==================== HELPER ====================
  private calculateExpiration(urgencyLevel: UrgencyLevel): Date {
    const now = new Date();
    const map = { CRITICAL: 1, HIGH: 6, MEDIUM: 24, LOW: 168 };
    return new Date(now.getTime() + (map[urgencyLevel] || 24) * 3600000);
  }
}