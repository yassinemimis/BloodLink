import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CampaignsService }                    from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard }                         from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles }                    from '../auth/guards/roles.guard';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private readonly svc: CampaignsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Créer une campagne (Admin)' })
  create(@Body() dto: CreateCampaignDto) {
    return this.svc.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les campagnes' })
  @ApiQuery({ name: 'isActive',  type: Boolean, required: false })
  @ApiQuery({ name: 'centerId',  type: String,  required: false })
  @ApiQuery({ name: 'page',      type: Number,  required: false })
  @ApiQuery({ name: 'limit',     type: Number,  required: false })
  findAll(
    @Query('isActive')  isActive?:  string,
    @Query('centerId')  centerId?:  string,
    @Query('page')      page?:      number,
    @Query('limit')     limit?:     number,
  ) {
    const isActiveBool = isActive === undefined ? undefined : isActive === 'true';
    return this.svc.findAll({ isActive: isActiveBool, centerId, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une campagne" })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Modifier une campagne (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Supprimer une campagne (Admin)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}