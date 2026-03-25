import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(clientId: string, dto: CreateBookingDto) {
    // Verify professional exists
    const professional = await this.prisma.professionalProfile.findUnique({
      where: { id: dto.professionalId },
      include: { user: true },
    });

    if (!professional) {
      throw new NotFoundException('Professional not found');
    }

    if (professional.userId === clientId) {
      throw new BadRequestException('Cannot book your own service');
    }

    // Calculate price
    const proService = await this.prisma.proService.findUnique({
      where: {
        professionalId_serviceId: {
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
        },
      },
    });

    const hourlyRate = proService?.customRate || professional.hourlyRate || 0;
    const duration = dto.duration || 60;
    const totalPrice = (hourlyRate / 60) * duration;

    return this.prisma.booking.create({
      data: {
        clientId,
        professionalId: dto.professionalId,
        serviceId: dto.serviceId,
        scheduledAt: new Date(dto.scheduledAt),
        duration,
        totalPrice,
        notes: dto.notes,
        address: dto.address,
      },
      include: {
        professional: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        service: true,
      },
    });
  }

  async findClientBookings(clientId: string) {
    return this.prisma.booking.findMany({
      where: { clientId },
      include: {
        professional: {
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
        service: true,
        payment: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async findProfessionalBookings(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return this.prisma.booking.findMany({
      where: { professionalId: profile.id },
      include: {
        client: { select: { firstName: true, lastName: true, avatarUrl: true, phone: true } },
        service: true,
        payment: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async updateStatus(bookingId: string, userId: string, status: BookingStatus) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { professional: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate permissions based on status transition
    const isClient = booking.clientId === userId;
    const isPro = booking.professional.userId === userId;

    if (!isClient && !isPro) {
      throw new ForbiddenException('Not authorized');
    }

    // Status transition rules
    const allowed = this.isTransitionAllowed(booking.status, status, isClient);
    if (!allowed) {
      throw new BadRequestException(
        `Cannot transition from ${booking.status} to ${status}`,
      );
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });
  }

  private isTransitionAllowed(
    current: BookingStatus,
    next: BookingStatus,
    isClient: boolean,
  ): boolean {
    const transitions: Record<string, { status: BookingStatus; byClient: boolean }[]> = {
      PENDING: [
        { status: BookingStatus.ACCEPTED, byClient: false },
        { status: BookingStatus.CANCELLED, byClient: true },
        { status: BookingStatus.CANCELLED, byClient: false },
      ],
      ACCEPTED: [
        { status: BookingStatus.IN_PROGRESS, byClient: false },
        { status: BookingStatus.CANCELLED, byClient: true },
        { status: BookingStatus.CANCELLED, byClient: false },
      ],
      IN_PROGRESS: [
        { status: BookingStatus.COMPLETED, byClient: false },
        { status: BookingStatus.DISPUTED, byClient: true },
      ],
    };

    const allowed = transitions[current] || [];
    return allowed.some((t) => t.status === next && t.byClient === isClient);
  }
}
