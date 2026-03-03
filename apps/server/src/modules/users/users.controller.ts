import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BloodGroup } from '@prisma/client';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('donors')
  @ApiOperation({ summary: 'Lister tous les donneurs' })
  @ApiQuery({ name: 'bloodGroup', enum: BloodGroup, required: false })
  @ApiQuery({ name: 'city', type: String, required: false })
  @ApiQuery({ name: 'isAvailable', type: Boolean, required: false })
  findAllDonors(
    @Query('bloodGroup') bloodGroup?: BloodGroup,
    @Query('city') city?: string,
    @Query('isAvailable') isAvailable?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAllDonors({
      bloodGroup,
      city,
      isAvailable,
      page,
      limit,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales des utilisateurs' })
  getStats() {
    return this.usersService.getGlobalStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d\'un utilisateur' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('toggle-availability')
  @ApiOperation({ summary: 'Basculer la disponibilité du donneur' })
  toggleAvailability(@Req() req: any) {
    return this.usersService.toggleAvailability(req.user.sub);
  }

  @Patch('location')
  @ApiOperation({ summary: 'Mettre à jour la localisation' })
  updateLocation(
    @Req() req: any,
    @Body() body: { latitude: number; longitude: number; address?: string; city?: string },
  ) {
    return this.usersService.updateLocation(
      req.user.sub,
      body.latitude,
      body.longitude,
      body.address,
      body.city,
    );
  }
}