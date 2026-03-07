import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        centerId:    dto.centerId,
        title:       dto.title,
        description: dto.description,
        startDate:   new Date(dto.startDate),
        endDate:     new Date(dto.endDate),
        goalUnits:   dto.goalUnits,
      },
      include: { center: { select: { id: true, name: true, city: true } } },
    });
  }

  async findAll(filters?: { isActive?: boolean; centerId?: string; page?: number; limit?: number }) {
    const page  = Number(filters?.page)  || 1;
    const limit = Number(filters?.limit) || 20;
    const skip  = (page - 1) * limit;
    const where: any = {};
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.centerId)               where.centerId = filters.centerId;

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where, skip, take: limit,
        orderBy: { startDate: 'desc' },
        include: { center: { select: { id: true, name: true, city: true } } },
      }),
      this.prisma.campaign.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const c = await this.prisma.campaign.findUnique({
      where: { id },
      include: { center: true },
    });
    if (!c) throw new NotFoundException('Campagne non trouvée');
    return c;
  }

  async update(id: string, dto: UpdateCampaignDto) {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campagne non trouvée');
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.centerId        && { centerId:        dto.centerId }),
        ...(dto.title           && { title:           dto.title }),
        ...(dto.description     !== undefined && { description: dto.description }),
        ...(dto.startDate       && { startDate:       new Date(dto.startDate) }),
        ...(dto.endDate         && { endDate:         new Date(dto.endDate) }),
        ...(dto.goalUnits       && { goalUnits:       dto.goalUnits }),
        ...(dto.collectedUnits  !== undefined && { collectedUnits: dto.collectedUnits }),
        ...(dto.isActive        !== undefined && { isActive:       dto.isActive }),
      },
      include: { center: { select: { id: true, name: true, city: true } } },
    });
  }

  async remove(id: string) {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campagne non trouvée');
    return this.prisma.campaign.delete({ where: { id } });
  }
}