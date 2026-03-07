import {
  Controller, Get, Post, Patch,
  Param, Body, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BloodRequestsService } from './blood-requests.service';
import { CreateBloodRequestDto } from './dto/create-blood-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { RequestStatus, UrgencyLevel } from '@prisma/client';

@ApiTags('blood-requests')
@Controller('blood-requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BloodRequestsController {
  constructor(private readonly service: BloodRequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle demande de sang' })
  create(@Req() req: any, @Body() dto: CreateBloodRequestDto) {
    return this.service.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les demandes (filtrées selon le rôle)' })
  @ApiQuery({ name: 'status',       enum: RequestStatus, required: false })
  @ApiQuery({ name: 'urgencyLevel', enum: UrgencyLevel,  required: false })
  @ApiQuery({ name: 'page',  type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  findAll(
    @Req() req: any,
    @Query('status')       status?: RequestStatus,
    @Query('urgencyLevel') urgencyLevel?: UrgencyLevel,
    @Query('page')         page?: number,
    @Query('limit')        limit?: number,
  ) {
    // ✅ تمرير userId و role → الـ service يُفلتر حسب الدور
    return this.service.findAll({
      status, urgencyLevel, page, limit,
      userId: req.user.sub,
      role:   req.user.role,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Statistiques des demandes (selon le rôle)' })
  getStatistics(@Req() req: any) {
    return this.service.getStatisticsByRole(req.user.sub, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détails d'une demande de sang" })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une demande de sang' })
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.service.cancel(id, req.user.sub);
  }
}