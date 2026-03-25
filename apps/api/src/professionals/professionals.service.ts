import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfessionalProfileDto } from './dto/update-profile.dto';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@Injectable()
export class ProfessionalsService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            latitude: true,
            longitude: true,
          },
        },
        services: { include: { service: true } },
        availability: { orderBy: { dayOfWeek: 'asc' } },
      },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return profile;
  }

  async getPublicProfile(profileId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        services: { include: { service: true } },
        availability: { orderBy: { dayOfWeek: 'asc' } },
        reviewsReceived: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: { firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Professional not found');
    }

    // Calculate average rating
    const avgRating = profile.reviewsReceived.length > 0
      ? profile.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / profile.reviewsReceived.length
      : null;

    return { ...profile, averageRating: avgRating };
  }

  async updateProfile(userId: string, dto: UpdateProfessionalProfileDto) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return this.prisma.professionalProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async setAvailability(userId: string, dto: SetAvailabilityDto) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    // Replace all availability slots
    await this.prisma.availability.deleteMany({
      where: { professionalId: profile.id },
    });

    const slots = await this.prisma.availability.createMany({
      data: dto.slots.map((slot) => ({
        professionalId: profile.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })),
    });

    return { updated: slots.count };
  }

  async addService(userId: string, serviceId: string, customRate?: number) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return this.prisma.proService.create({
      data: {
        professionalId: profile.id,
        serviceId,
        customRate,
      },
      include: { service: true },
    });
  }

  async removeService(userId: string, serviceId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return this.prisma.proService.delete({
      where: {
        professionalId_serviceId: {
          professionalId: profile.id,
          serviceId,
        },
      },
    });
  }
}
