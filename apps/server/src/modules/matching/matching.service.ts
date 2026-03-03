import { Injectable } from '@nestjs/common';
import { BloodGroup } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService) {}

  // ==================== RÈGLES DE COMPATIBILITÉ ====================
  private readonly compatibilityMap: Record<BloodGroup, BloodGroup[]> = {
    [BloodGroup.O_NEGATIVE]: [BloodGroup.O_NEGATIVE],
    [BloodGroup.O_POSITIVE]: [BloodGroup.O_NEGATIVE, BloodGroup.O_POSITIVE],
    [BloodGroup.A_NEGATIVE]: [BloodGroup.O_NEGATIVE, BloodGroup.A_NEGATIVE],
    [BloodGroup.A_POSITIVE]: [
      BloodGroup.O_NEGATIVE,
      BloodGroup.O_POSITIVE,
      BloodGroup.A_NEGATIVE,
      BloodGroup.A_POSITIVE,
    ],
    [BloodGroup.B_NEGATIVE]: [BloodGroup.O_NEGATIVE, BloodGroup.B_NEGATIVE],
    [BloodGroup.B_POSITIVE]: [
      BloodGroup.O_NEGATIVE,
      BloodGroup.O_POSITIVE,
      BloodGroup.B_NEGATIVE,
      BloodGroup.B_POSITIVE,
    ],
    [BloodGroup.AB_NEGATIVE]: [
      BloodGroup.O_NEGATIVE,
      BloodGroup.A_NEGATIVE,
      BloodGroup.B_NEGATIVE,
      BloodGroup.AB_NEGATIVE,
    ],
    [BloodGroup.AB_POSITIVE]: [
      BloodGroup.O_NEGATIVE,
      BloodGroup.O_POSITIVE,
      BloodGroup.A_NEGATIVE,
      BloodGroup.A_POSITIVE,
      BloodGroup.B_NEGATIVE,
      BloodGroup.B_POSITIVE,
      BloodGroup.AB_NEGATIVE,
      BloodGroup.AB_POSITIVE,
    ],
  };

  // ==================== OBTENIR LES DONNEURS COMPATIBLES ====================
  getCompatibleBloodGroups(recipientBloodGroup: BloodGroup): BloodGroup[] {
    return this.compatibilityMap[recipientBloodGroup] || [];
  }

  // ==================== RECHERCHE DE DONNEURS ====================
  async findCompatibleDonors(
    bloodGroup: BloodGroup,
    latitude: number,
    longitude: number,
    radiusKm: number = 25,
    limit: number = 20,
  ) {
    const compatibleGroups = this.getCompatibleBloodGroups(bloodGroup);
    const compatibleGroupsText = compatibleGroups.map((g) => g.toString());

    const minDonationInterval = new Date();
    minDonationInterval.setDate(minDonationInterval.getDate() - 56);

    const donors = await this.prisma.$queryRaw`
      SELECT 
        id,
        first_name AS "firstName",
        last_name AS "lastName",
        blood_group AS "bloodGroup",
        phone,
        latitude,
        longitude,
        city,
        total_donations AS "totalDonations",
        last_donation_at AS "lastDonationAt",
        (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(latitude))
          )
        ) AS distance
      FROM users
      WHERE role = 'DONOR'
        AND is_available = true
        AND is_active = true
        AND is_verified = true
        AND blood_group::text = ANY(${compatibleGroupsText})
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND (last_donation_at IS NULL OR last_donation_at < ${minDonationInterval})
        AND (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(latitude))
          )
        ) <= ${radiusKm}
      ORDER BY distance ASC
      LIMIT ${limit}
    `;

    return donors;
  }

  // ==================== SCORING DES DONNEURS ====================
  calculateDonorScore(
    distance: number,
    totalDonations: number,
    isExactMatch: boolean,
  ): number {
    const compatibilityScore = isExactMatch ? 100 : 70;
    const proximityScore = Math.max(0, 100 - (distance / 50) * 100);
    const reliabilityScore = Math.min(100, totalDonations * 10);

    return (
      compatibilityScore * 0.4 +
      proximityScore * 0.35 +
      reliabilityScore * 0.25
    );
  }

  // ==================== MATCHING AUTOMATIQUE ====================
  async matchDonorsToRequest(requestId: string) {
    const request = await this.prisma.bloodRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error('Demande non trouvée');
    }

    const donors = await this.findCompatibleDonors(
      request.bloodGroup,
      request.latitude,
      request.longitude,
      request.searchRadius,
    );

    const scoredDonors = (donors as any[]).map((donor) => ({
      ...donor,
      score: this.calculateDonorScore(
        donor.distance,
        donor.totalDonations,
        donor.bloodGroup === request.bloodGroup,
      ),
    }));

    scoredDonors.sort((a, b) => b.score - a.score);

    await this.prisma.bloodRequest.update({
      where: { id: requestId },
      data: { status: 'SEARCHING' },
    });

    return {
      request,
      compatibleDonors: scoredDonors,
      totalFound: scoredDonors.length,
    };
  }
}