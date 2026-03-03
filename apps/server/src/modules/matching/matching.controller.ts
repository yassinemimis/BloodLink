import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BloodGroup } from '@prisma/client';

@ApiTags('matching')
@Controller('matching')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('compatible-groups/:bloodGroup')
  @ApiOperation({
    summary: 'Obtenir les groupes sanguins compatibles pour un receveur',
  })
  getCompatibleGroups(@Param('bloodGroup') bloodGroup: BloodGroup) {
    return {
      recipientBloodGroup: bloodGroup,
      compatibleDonorGroups:
        this.matchingService.getCompatibleBloodGroups(bloodGroup),
    };
  }

  @Get('donors')
  @ApiOperation({ summary: 'Rechercher des donneurs compatibles à proximité' })
  @ApiQuery({ name: 'bloodGroup', enum: BloodGroup })
  @ApiQuery({ name: 'latitude', type: Number })
  @ApiQuery({ name: 'longitude', type: Number })
  @ApiQuery({ name: 'radius', type: Number, required: false })
  findDonors(
    @Query('bloodGroup') bloodGroup: BloodGroup,
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius?: number,
  ) {
    return this.matchingService.findCompatibleDonors(
      bloodGroup,
      latitude,
      longitude,
      radius || 25,
    );
  }

  @Post('request/:requestId')
  @ApiOperation({
    summary: 'Lancer le matching automatique pour une demande de sang',
  })
  matchRequest(@Param('requestId') requestId: string) {
    return this.matchingService.matchDonorsToRequest(requestId);
  }
}