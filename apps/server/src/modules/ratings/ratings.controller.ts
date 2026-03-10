import { Controller, Post, Body, UseGuards, Req, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RatingsService } from './ratings.service';

@ApiTags('ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private ratingsService: RatingsService) {}

  // إنشاء تقييم — محمي بـ JWT
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une évaluation (patient seulement)' })
  async create(
    @Req() req: any,
    @Body() body: { donationId: string; rating: number; comment?: string },
  ) {
    return this.ratingsService.createRating(req.user.sub, body.donationId, body.rating, body.comment);
  }

  // GET /ratings?donorId=...&limit=5&page=1
  @Get()
  @ApiOperation({ summary: 'Lister les évaluations d’un donneur (public)' })
  async list(
    @Query('donorId') donorId?: string,
    @Query('limit') limit = '10',
    @Query('page') page = '1',
    @Query('donationId') donationId?: string,
  ) {
    // Si طلب بواسطة donationId → إرجاع تقييم واحد
    if (donationId) {
      const r = await this.ratingsService.findByDonation(donationId);
      return { data: r };
    }

    if (!donorId) return { data: [], meta: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 } };
    return this.ratingsService.listRatingsForDonor(donorId, Number(limit), Number(page));
  }

  // GET /ratings/stats/:userId
  @Get('stats/:userId')
  @ApiOperation({ summary: 'Statistiques de rating pour un utilisateur (moyenne, count)' })
  async stats(@Param('userId') userId: string) {
    return this.ratingsService.getUserRatingStats(userId);
  }
}