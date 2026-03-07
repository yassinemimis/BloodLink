import { Injectable, Logger } from '@nestjs/common';
import { BloodGroup } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger('MatchingService');

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,  // ✅ inject
    private notificationsGateway: NotificationsGateway,  // ✅ inject
  ) {}

  // ==================== COMPATIBILITÉ ====================
  private readonly compatibilityMap: Record<BloodGroup, BloodGroup[]> = {
    [BloodGroup.O_NEGATIVE]: [BloodGroup.O_NEGATIVE],
    [BloodGroup.O_POSITIVE]: [BloodGroup.O_NEGATIVE, BloodGroup.O_POSITIVE],
    [BloodGroup.A_NEGATIVE]: [BloodGroup.O_NEGATIVE, BloodGroup.A_NEGATIVE],
    [BloodGroup.A_POSITIVE]: [BloodGroup.O_NEGATIVE, BloodGroup.O_POSITIVE, BloodGroup.A_NEGATIVE, BloodGroup.A_POSITIVE],
    [BloodGroup.B_NEGATIVE]: [BloodGroup.O_NEGATIVE, BloodGroup.B_NEGATIVE],
    [BloodGroup.B_POSITIVE]: [BloodGroup.O_NEGATIVE, BloodGroup.O_POSITIVE, BloodGroup.B_NEGATIVE, BloodGroup.B_POSITIVE],
    [BloodGroup.AB_NEGATIVE]: [BloodGroup.O_NEGATIVE, BloodGroup.A_NEGATIVE, BloodGroup.B_NEGATIVE, BloodGroup.AB_NEGATIVE],
    [BloodGroup.AB_POSITIVE]: [BloodGroup.O_NEGATIVE, BloodGroup.O_POSITIVE, BloodGroup.A_NEGATIVE, BloodGroup.A_POSITIVE, BloodGroup.B_NEGATIVE, BloodGroup.B_POSITIVE, BloodGroup.AB_NEGATIVE, BloodGroup.AB_POSITIVE],
  };

  getCompatibleBloodGroups(recipientBloodGroup: BloodGroup): BloodGroup[] {
    return this.compatibilityMap[recipientBloodGroup] || [];
  }

  // ==================== RECHERCHE DONNEURS ====================
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
        first_name  AS "firstName",
        last_name   AS "lastName",
        blood_group AS "bloodGroup",
        phone, latitude, longitude, city,
        total_donations  AS "totalDonations",
        last_donation_at AS "lastDonationAt",
        (6371 * acos(
          cos(radians(${latitude})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${longitude})) +
          sin(radians(${latitude})) * sin(radians(latitude))
        )) AS distance
      FROM users
      WHERE role = 'DONOR'
        AND is_available = true
        AND is_active = true
        AND is_verified = true
        AND blood_group::text = ANY(${compatibleGroupsText})
        AND latitude  IS NOT NULL
        AND longitude IS NOT NULL
        AND (last_donation_at IS NULL OR last_donation_at < ${minDonationInterval})
        AND (6371 * acos(
          cos(radians(${latitude})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${longitude})) +
          sin(radians(${latitude})) * sin(radians(latitude))
        )) <= ${radiusKm}
      ORDER BY distance ASC
      LIMIT ${limit}
    `;

    return donors;
  }

  // ==================== SCORING ====================
  calculateDonorScore(distance: number, totalDonations: number, isExactMatch: boolean): number {
    const compatibilityScore = isExactMatch ? 100 : 70;
    const proximityScore = Math.max(0, 100 - (distance / 50) * 100);
    const reliabilityScore = Math.min(100, totalDonations * 10);
    return compatibilityScore * 0.4 + proximityScore * 0.35 + reliabilityScore * 0.25;
  }

  // ==================== MATCHING + NOTIFICATIONS ====================
  async matchDonorsToRequest(requestId: string) {
    // 1. جلب الطلب مع بيانات المريض
    const request = await this.prisma.bloodRequest.findUnique({
      where: { id: requestId },
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    if (!request) throw new Error('Demande non trouvée');

    // 2. إيجاد المتبرعين المتوافقين
    const donors = await this.findCompatibleDonors(
      request.bloodGroup,
      request.latitude,
      request.longitude,
      request.searchRadius,
    );

    // 3. تسجيل عدد المتبرعين للديباغ
    this.logger.log(`Found ${(donors as any[]).length} compatible donors for request ${requestId}`);

    // 4. تصحيح وترتيب المتبرعين
    const scoredDonors = (donors as any[]).map((donor) => ({
      ...donor,
      score: this.calculateDonorScore(
        donor.distance,
        donor.totalDonations,
        donor.bloodGroup === request.bloodGroup,
      ),
    }));
    scoredDonors.sort((a, b) => b.score - a.score);

    // 5. تحديث حالة الطلب
    await this.prisma.bloodRequest.update({
      where: { id: requestId },
      data: { status: 'SEARCHING' },
    });

    // 6. ✅ إرسال الإشعارات إذا وجد متبرعون
    if (scoredDonors.length > 0) {
      const donorIds: string[] = scoredDonors.map((d) => d.id);
      const isUrgent = request.urgencyLevel === 'CRITICAL' || request.urgencyLevel === 'HIGH';

      // تنسيق اسم فصيلة الدم
      const bgLabel = request.bloodGroup
        .replace('_POSITIVE', '+')
        .replace('_NEGATIVE', '-');

      const title = isUrgent
        ? `🚨 URGENT: Besoin de sang ${bgLabel}`
        : `🩸 Demande de sang ${bgLabel}`;

      const body = `${request.hospital} a besoin de ${request.unitsNeeded} unité(s). Pouvez-vous aider ?`;

      const notifData = {
        requestId: request.id,
        bloodGroup: request.bloodGroup,
        hospital: request.hospital,
        urgencyLevel: request.urgencyLevel,
      };

      // 6a. ✅ حفظ الإشعارات في DB
      try {
        await this.notificationsService.notifyDonors(
          donorIds,
          title,
          body,
          isUrgent ? 'URGENT' : 'REQUEST',
          notifData,
        );
        this.logger.log(`Saved ${donorIds.length} notifications to DB`);
      } catch (err) {
        this.logger.error('Failed to save notifications to DB:', err);
      }

      // 6b. ✅ إرسال فوري عبر WebSocket
      try {
        if (isUrgent) {
          this.notificationsGateway.sendUrgentAlert(donorIds, { title, body, ...notifData });
        } else {
          donorIds.forEach((donorId) => {
            this.notificationsGateway.sendNotificationToUser(donorId, {
              title, body, type: 'REQUEST', ...notifData,
            });
          });
        }
        this.logger.log(`Sent real-time notifications to ${donorIds.length} donors`);
      } catch (err) {
        this.logger.error('Failed to send WebSocket notifications:', err);
      }
    } else {
      this.logger.warn(`No compatible donors found for request ${requestId}`);
      // ✅ إذا لم يوجد متبرعون — يمكن إشعار المريض
      await this.notificationsService.create(
        request.patientId,
        '😔 Aucun donneur disponible',
        `Aucun donneur compatible trouvé près de ${request.hospital}. Nous continuons la recherche.`,
        'SYSTEM',
        { requestId: request.id },
      );
    }

    return {
      request,
      compatibleDonors: scoredDonors,
      totalFound: scoredDonors.length,
    };
  }
}