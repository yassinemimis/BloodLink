import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCenterDto, UpdateCenterDto } from './dto/create-center.dto';
import { BloodGroup } from '@prisma/client';

@Injectable()
export class CentersService {
  constructor(private prisma: PrismaService) {}

  // ==================== CRÉER UN CENTRE ====================
  async create(dto: CreateCenterDto) {
    const center = await this.prisma.center.create({
      data: dto,
    });

    // Initialiser les stocks de sang pour chaque groupe
    const bloodGroups = Object.values(BloodGroup);
    await this.prisma.bloodStock.createMany({
      data: bloodGroups.map((group) => ({
        centerId: center.id,
        bloodGroup: group,
        unitsAvailable: 0,
      })),
    });

    return {
      message: 'Centre de collecte créé avec succès',
      center,
    };
  }

  // ==================== LISTER LES CENTRES ====================
  async findAll(filters?: {
    city?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.city)
      where.city = { contains: filters.city, mode: 'insensitive' };
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    const [centers, total] = await Promise.all([
      this.prisma.center.findMany({
        where,
        skip,
        take: limit,
        include: {
          bloodStocks: {
            orderBy: { bloodGroup: 'asc' },
          },
          _count: {
            select: { campaigns: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.center.count({ where }),
    ]);

    return {
      data: centers,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ==================== DÉTAIL D'UN CENTRE ====================
  async findOne(id: string) {
    const center = await this.prisma.center.findUnique({
      where: { id },
      include: {
        bloodStocks: {
          orderBy: { bloodGroup: 'asc' },
        },
        campaigns: {
          where: { isActive: true },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!center) {
      throw new NotFoundException('Centre non trouvé');
    }

    return center;
  }

  // ==================== METTRE À JOUR UN CENTRE ====================
  async update(id: string, dto: UpdateCenterDto) {
    const center = await this.prisma.center.findUnique({ where: { id } });
    if (!center) {
      throw new NotFoundException('Centre non trouvé');
    }

    return this.prisma.center.update({
      where: { id },
      data: dto,
    });
  }

  // ==================== SUPPRIMER UN CENTRE ====================
  async remove(id: string) {
    const center = await this.prisma.center.findUnique({ where: { id } });
    if (!center) {
      throw new NotFoundException('Centre non trouvé');
    }

    // Soft delete
    return this.prisma.center.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==================== CENTRES À PROXIMITÉ ====================
  async findNearby(latitude: number, longitude: number, radiusKm: number = 25) {
    const centers = await this.prisma.$queryRaw`
      SELECT 
        id,
        name,
        address,
        city,
        phone,
        email,
        latitude,
        longitude,
        opening_hours as "openingHours",
        is_active as "isActive",
        (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(latitude))
          )
        ) AS distance
      FROM centers
      WHERE is_active = true
      HAVING distance <= ${radiusKm}
      ORDER BY distance ASC
    `;

    return centers;
  }

  // ==================== GESTION DES STOCKS ====================
  async updateStock(
    centerId: string,
    bloodGroup: BloodGroup,
    units: number,
  ) {
    const stock = await this.prisma.bloodStock.findUnique({
      where: {
        centerId_bloodGroup: { centerId, bloodGroup },
      },
    });

    if (!stock) {
      throw new NotFoundException('Stock non trouvé');
    }

    return this.prisma.bloodStock.update({
      where: {
        centerId_bloodGroup: { centerId, bloodGroup },
      },
      data: {
        unitsAvailable: units,
        lastUpdated: new Date(),
      },
    });
  }

  // ==================== STATISTIQUES DES STOCKS ====================
  async getStockStatistics() {
    const stocks = await this.prisma.bloodStock.groupBy({
      by: ['bloodGroup'],
      _sum: { unitsAvailable: true },
    });

    const totalUnits = stocks.reduce(
      (sum, s) => sum + (s._sum.unitsAvailable || 0),
      0,
    );

    const criticalStocks = stocks.filter(
      (s) => (s._sum.unitsAvailable || 0) < 10,
    );

    return {
      totalUnits,
      stocksByBloodGroup: stocks,
      criticalStocks,
      totalCenters: await this.prisma.center.count({
        where: { isActive: true },
      }),
    };
  }
}