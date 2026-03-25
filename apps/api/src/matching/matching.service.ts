import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchProfessionalsDto } from './dto/search.dto';

export interface RankedProfessional {
  profileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  age: number | null;
  hourlyRate: number | null;
  distance: number;
  averageRating: number | null;
  reviewCount: number;
  score: number;
}

@Injectable()
export class MatchingService {
  constructor(private prisma: PrismaService) {}

  async searchProfessionals(dto: SearchProfessionalsDto): Promise<RankedProfessional[]> {
    const maxDistance = dto.maxDistance || 20;

    // Step 1: Find professionals offering this service
    const proServices = await this.prisma.proService.findMany({
      where: { serviceId: dto.serviceId },
      include: {
        professional: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                latitude: true,
                longitude: true,
              },
            },
            availability: true,
            reviewsReceived: { select: { rating: true } },
          },
        },
      },
    });

    // Step 2: Filter by distance and availability
    const results: RankedProfessional[] = [];

    for (const ps of proServices) {
      const pro = ps.professional;
      const user = pro.user;

      // Skip if no location set
      if (user.latitude == null || user.longitude == null) continue;

      // Calculate distance using Haversine formula
      const distance = this.haversineDistance(
        dto.latitude, dto.longitude,
        user.latitude, user.longitude,
      );

      // Filter by service radius AND max search distance
      if (distance > Math.min(pro.serviceRadius, maxDistance)) continue;

      // Filter by availability if day specified
      if (dto.dayOfWeek !== undefined) {
        const available = pro.availability.some((slot) => {
          if (slot.dayOfWeek !== dto.dayOfWeek) return false;
          if (dto.preferredTime) {
            return dto.preferredTime >= slot.startTime && dto.preferredTime <= slot.endTime;
          }
          return true;
        });
        if (!available) continue;
      }

      // Calculate average rating
      const ratings = pro.reviewsReceived.map((r) => r.rating);
      const avgRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;

      // Calculate matching score
      const score = this.calculateScore(distance, maxDistance, avgRating, ratings.length);

      results.push({
        profileId: pro.id,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        bio: pro.bio,
        age: pro.age,
        hourlyRate: ps.customRate || pro.hourlyRate,
        distance: Math.round(distance * 10) / 10,
        averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        reviewCount: ratings.length,
        score,
      });
    }

    // Step 3: Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  /**
   * Score formula:
   * - Distance: 40% weight (closer = better)
   * - Rating: 35% weight (higher = better)
   * - Review count: 25% weight (more reviews = more trusted)
   */
  private calculateScore(
    distance: number,
    maxDistance: number,
    avgRating: number | null,
    reviewCount: number,
  ): number {
    // Distance score: 1.0 (very close) to 0.0 (at max distance)
    const distanceScore = 1 - (distance / maxDistance);

    // Rating score: 0-1 range (default 0.5 if no reviews)
    const ratingScore = avgRating ? avgRating / 5 : 0.5;

    // Review count score: logarithmic, caps at ~20 reviews
    const reviewScore = Math.min(Math.log(reviewCount + 1) / Math.log(21), 1);

    return (distanceScore * 0.4) + (ratingScore * 0.35) + (reviewScore * 0.25);
  }

  /**
   * Haversine formula to calculate distance between two GPS coordinates.
   * Returns distance in kilometers.
   */
  private haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
