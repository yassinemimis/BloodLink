import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BloodGroup, Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  // ==================== LISTER LES DONNEURS ====================
  async findAllDonors(filters?: {
    bloodGroup?: BloodGroup;
    city?: string;
    isAvailable?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { role: Role.DONOR, isActive: true };
    if (filters?.bloodGroup) where.bloodGroup = filters.bloodGroup;
    if (filters?.city) where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters?.isAvailable !== undefined) where.isAvailable = filters.isAvailable;

    const [donors, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          bloodGroup: true,
          city: true,
          isAvailable: true,
          totalDonations: true,
          lastDonationAt: true,
          createdAt: true,
          latitude: true,   // ✅ أضف هذا
          longitude: true,   // ✅ 
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: donors,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== DÉTAIL D'UN UTILISATEUR ====================
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        bloodGroup: true,
        role: true,
        avatar: true,
        isAvailable: true,
        isVerified: true,
        city: true,
        address: true,
        totalDonations: true,
        lastDonationAt: true,
        createdAt: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user;
  }

  // ==================== METTRE À JOUR LA DISPONIBILITÉ ====================
  async toggleAvailability(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { isAvailable: !user.isAvailable },
      select: {
        id: true,
        isAvailable: true,
      },
    });
  }

  // ==================== METTRE À JOUR LA LOCALISATION ====================
  async updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
    address?: string,
    city?: string,
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { latitude, longitude, address, city },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        address: true,
        city: true,
      },
    });
  }

  // ==================== STATISTIQUES GLOBALES ====================
  async getGlobalStats() {
    const [
      totalDonors,
      availableDonors,
      totalPatients,
      totalDonations,
      donorsByBloodGroup,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'DONOR' } }),
      this.prisma.user.count({ where: { role: 'DONOR', isAvailable: true } }),
      this.prisma.user.count({ where: { role: 'PATIENT' } }),
      this.prisma.donation.count({ where: { status: 'COMPLETED' } }),
      this.prisma.user.groupBy({
        by: ['bloodGroup'],
        where: { role: 'DONOR' },
        _count: { id: true },
      }),
    ]);

    return {
      totalDonors,
      availableDonors,
      totalPatients,
      totalDonations,
      donorsByBloodGroup,
    };
  }
  // ==================== LISTER TOUS LES UTILISATEURS (Admin) ====================
  async findAllUsers(filters?: {
    role?: string;
    isVerified?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.role) where.role = filters.role;
    if (filters?.isVerified !== undefined) where.isVerified = filters.isVerified;
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          phone: true, bloodGroup: true, role: true,
          isVerified: true, isAvailable: true, isActive: true,
          city: true, totalDonations: true, createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== VÉRIFIER / DÉVÉRIFIER UN UTILISATEUR (Admin) ====================
  async toggleVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: !user.isVerified },
      select: { id: true, isVerified: true },
    });
  }

  // أضف هذه الدالة بعد updateLocation

  // ==================== METTRE À JOUR LE PROFIL ====================
  async updateProfile(userId: string, data: {
    phone?: string;
    address?: string;
    city?: string;
    avatar?: string;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, bloodGroup: true, role: true, avatar: true,
        isAvailable: true, isVerified: true, latitude: true,
        longitude: true, address: true, city: true,
        lastDonationAt: true, totalDonations: true, createdAt: true,
      },
    });
  }
}