import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { BookingStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  /**
   * Step 1: Professional connects their Stripe account.
   */
  async connectStripeAccount(userId: string, returnUrl: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    if (!this.stripeService.isConfigured()) {
      // Demo mode — simulate Stripe connection
      const demoAccountId = `acct_demo_${profile.id.slice(0, 8)}`;
      await this.prisma.professionalProfile.update({
        where: { id: profile.id },
        data: { stripeAccountId: demoAccountId },
      });
      return {
        url: `${returnUrl}?success=true`,
        accountId: demoAccountId,
        demo: true,
      };
    }

    // Real Stripe flow
    let stripeAccountId = profile.stripeAccountId;

    if (!stripeAccountId) {
      stripeAccountId = await this.stripeService.createConnectAccount(
        profile.user.email,
        profile.user.firstName,
        profile.user.lastName,
      );
      await this.prisma.professionalProfile.update({
        where: { id: profile.id },
        data: { stripeAccountId },
      });
    }

    const onboardingUrl = await this.stripeService.createOnboardingLink(
      stripeAccountId,
      returnUrl,
    );

    return { url: onboardingUrl, accountId: stripeAccountId };
  }

  /**
   * Check if professional's Stripe account is ready.
   */
  async getStripeStatus(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    if (!profile.stripeAccountId) {
      return { connected: false, ready: false };
    }

    if (profile.stripeAccountId.startsWith('acct_demo_')) {
      return { connected: true, ready: true, demo: true };
    }

    if (!this.stripeService.isConfigured()) {
      return { connected: !!profile.stripeAccountId, ready: true, demo: true };
    }

    const ready = await this.stripeService.isAccountReady(profile.stripeAccountId);
    return { connected: true, ready };
  }

  /**
   * Step 2: Client initiates payment for a booking (escrow).
   * Creates a PaymentIntent — funds are authorized but NOT captured.
   */
  async createBookingPayment(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        professional: true,
        payment: true,
        service: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.clientId !== userId) {
      throw new ForbiddenException('Not your booking');
    }

    if (booking.status !== BookingStatus.ACCEPTED) {
      throw new BadRequestException('Booking must be accepted before payment');
    }

    if (booking.payment) {
      throw new BadRequestException('Payment already exists for this booking');
    }

    if (!booking.professional.stripeAccountId) {
      throw new BadRequestException('Professional has not connected Stripe');
    }

    const amount = Math.round((booking.totalPrice || 0) * 100); // convert to cents

    if (amount <= 0) {
      throw new BadRequestException('Invalid booking amount');
    }

    // Demo mode
    if (!this.stripeService.isConfigured() || booking.professional.stripeAccountId.startsWith('acct_demo_')) {
      const payment = await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: booking.totalPrice || 0,
          currency: 'EUR',
          stripePaymentId: `pi_demo_${Date.now()}`,
          status: PaymentStatus.HELD,
        },
      });

      return {
        payment,
        clientSecret: null,
        demo: true,
        message: 'Demo mode: payment simulated as held in escrow',
      };
    }

    // Real Stripe flow
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      'eur',
      booking.professional.stripeAccountId,
      {
        bookingId: booking.id,
        serviceId: booking.serviceId,
        serviceName: booking.service.name,
      },
    );

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: booking.totalPrice || 0,
        currency: 'EUR',
        stripePaymentId: paymentIntent.id,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      payment,
      clientSecret: paymentIntent.client_secret,
    };
  }

  /**
   * Step 3: Release escrow — capture payment when service is completed.
   */
  async releasePayment(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking || !booking.payment) {
      throw new NotFoundException('Booking or payment not found');
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('Service must be completed to release payment');
    }

    if (booking.payment.status !== PaymentStatus.HELD) {
      throw new BadRequestException(`Cannot release payment in status: ${booking.payment.status}`);
    }

    // Demo mode
    if (booking.payment.stripePaymentId?.startsWith('pi_demo_')) {
      return this.prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: PaymentStatus.RELEASED },
      });
    }

    // Real Stripe capture
    if (this.stripeService.isConfigured() && booking.payment.stripePaymentId) {
      await this.stripeService.capturePayment(booking.payment.stripePaymentId);
    }

    return this.prisma.payment.update({
      where: { id: booking.payment.id },
      data: { status: PaymentStatus.RELEASED },
    });
  }

  /**
   * Refund payment when booking is cancelled or disputed.
   */
  async refundPayment(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking || !booking.payment) {
      throw new NotFoundException('Booking or payment not found');
    }

    if (booking.payment.status === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Payment already refunded');
    }

    // Demo mode
    if (booking.payment.stripePaymentId?.startsWith('pi_demo_')) {
      return this.prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: PaymentStatus.REFUNDED },
      });
    }

    // Real Stripe refund/cancel
    if (this.stripeService.isConfigured() && booking.payment.stripePaymentId) {
      if (booking.payment.status === PaymentStatus.HELD) {
        await this.stripeService.cancelPayment(booking.payment.stripePaymentId);
      } else {
        await this.stripeService.refundPayment(booking.payment.stripePaymentId);
      }
    }

    return this.prisma.payment.update({
      where: { id: booking.payment.id },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  /**
   * Get payment info for a booking.
   */
  async getBookingPayment(bookingId: string) {
    return this.prisma.payment.findUnique({
      where: { bookingId },
    });
  }

  /**
   * Get earnings summary for a professional.
   */
  async getEarnings(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    const bookings = await this.prisma.booking.findMany({
      where: { professionalId: profile.id },
      include: { payment: true, service: true },
      orderBy: { createdAt: 'desc' },
    });

    const released = bookings.filter(b => b.payment?.status === PaymentStatus.RELEASED);
    const held = bookings.filter(b => b.payment?.status === PaymentStatus.HELD);
    const platformFeeRate = 0.15;

    const totalEarned = released.reduce((sum, b) => {
      const gross = b.payment?.amount || 0;
      return sum + gross * (1 - platformFeeRate);
    }, 0);

    const pendingEarnings = held.reduce((sum, b) => {
      const gross = b.payment?.amount || 0;
      return sum + gross * (1 - platformFeeRate);
    }, 0);

    const totalTransactions = bookings.filter(b => b.payment).length;

    return {
      totalEarned: Math.round(totalEarned * 100) / 100,
      pendingEarnings: Math.round(pendingEarnings * 100) / 100,
      totalTransactions,
      completedServices: released.length,
      platformFeeRate: `${platformFeeRate * 100}%`,
      recentTransactions: bookings
        .filter(b => b.payment)
        .slice(0, 10)
        .map(b => ({
          bookingId: b.id,
          service: b.service.name,
          grossAmount: b.payment!.amount,
          netAmount: Math.round(b.payment!.amount * (1 - platformFeeRate) * 100) / 100,
          fee: Math.round(b.payment!.amount * platformFeeRate * 100) / 100,
          status: b.payment!.status,
          date: b.createdAt,
        })),
    };
  }
}
