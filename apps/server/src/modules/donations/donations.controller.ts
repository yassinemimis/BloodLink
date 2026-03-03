import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { DonationStatus } from '@prisma/client';

@ApiTags('donations')
@Controller('donations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post('accept')
  @ApiOperation({ summary: 'Accepter une demande de don de sang' })
  acceptRequest(@Req() req: any, @Body() dto: CreateDonationDto) {
    return this.donationsService.acceptRequest(req.user.sub, dto);
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Marquer une donation comme complétée' })
  completeDonation(@Param('id') id: string, @Req() req: any) {
    return this.donationsService.completeDonation(id, req.user.sub);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Rejeter une donation' })
  rejectDonation(@Param('id') id: string, @Req() req: any) {
    return this.donationsService.rejectDonation(id, req.user.sub);
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Historique des donations du donneur connecté' })
  getMyHistory(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.donationsService.getDonorHistory(req.user.sub, page, limit);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'DOCTOR')
  @ApiOperation({ summary: 'Lister toutes les donations (Admin)' })
  @ApiQuery({ name: 'status', enum: DonationStatus, required: false })
  findAll(
    @Query('status') status?: DonationStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.donationsService.findAll({ status, page, limit });
  }
}