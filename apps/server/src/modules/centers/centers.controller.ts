import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CentersService } from './centers.service';
import { CreateCenterDto, UpdateCenterDto } from './dto/create-center.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { BloodGroup } from '@prisma/client';

@ApiTags('centers')
@Controller('centers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CentersController {
  constructor(private readonly centersService: CentersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer un nouveau centre de collecte' })
  create(@Body() dto: CreateCenterDto) {
    return this.centersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les centres de collecte' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'page', required: false })
  findAll(
    @Query('city') city?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.centersService.findAll({ city, page, limit });
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Trouver les centres à proximité' })
  @ApiQuery({ name: 'latitude', type: Number })
  @ApiQuery({ name: 'longitude', type: Number })
  @ApiQuery({ name: 'radius', type: Number, required: false })
  findNearby(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius?: number,
  ) {
    return this.centersService.findNearby(latitude, longitude, radius || 25);
  }

  @Get('stocks')
  @ApiOperation({ summary: 'Statistiques globales des stocks de sang' })
  getStockStatistics() {
    return this.centersService.getStockStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un centre de collecte' })
  findOne(@Param('id') id: string) {
    return this.centersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Mettre à jour un centre' })
  update(@Param('id') id: string, @Body() dto: UpdateCenterDto) {
    return this.centersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer un centre (soft delete)' })
  remove(@Param('id') id: string) {
    return this.centersService.remove(id);
  }

  @Patch(':id/stock')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Mettre à jour le stock de sang d\'un centre' })
  updateStock(
    @Param('id') centerId: string,
    @Body() body: { bloodGroup: BloodGroup; units: number },
  ) {
    return this.centersService.updateStock(
      centerId,
      body.bloodGroup,
      body.units,
    );
  }
}