import {
  Controller, Get, Post, Body, Param, UseGuards, Request, RawBodyRequest, Req, Headers,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private stripeService: StripeService,
    private configService: ConfigService,
  ) {}

  // ─── Professional: Connect Stripe account ───────

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect Stripe account (professional)' })
  connectStripe(@Request() req: any, @Body() body: { returnUrl: string }) {
    return this.paymentsService.connectStripeAccount(req.user.sub, body.returnUrl);
  }

  @Get('connect/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check Stripe connection status (professional)' })
  getStripeStatus(@Request() req: any) {
    return this.paymentsService.getStripeStatus(req.user.sub);
  }

  // ─── Client: Pay for a booking ──────────────────

  @Post('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create escrow payment for a booking (client)' })
  createPayment(@Request() req: any, @Param('bookingId') bookingId: string) {
    return this.paymentsService.createBookingPayment(req.user.sub, bookingId);
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status for a booking' })
  getPayment(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getBookingPayment(bookingId);
  }

  // ─── Release / Refund ──────────────────────────

  @Post('release/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Release escrow payment to professional (after service completed)' })
  releasePayment(@Param('bookingId') bookingId: string) {
    return this.paymentsService.releasePayment(bookingId);
  }

  @Post('refund/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund payment to client (cancelled/disputed)' })
  refundPayment(@Param('bookingId') bookingId: string) {
    return this.paymentsService.refundPayment(bookingId);
  }

  // ─── Earnings ──────────────────────────────────

  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get earnings summary (professional)' })
  getEarnings(@Request() req: any) {
    return this.paymentsService.getEarnings(req.user.sub);
  }

  // ─── Stripe Webhook ────────────────────────────

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret || !this.stripeService.isConfigured()) {
      return { received: true, demo: true };
    }

    const event = this.stripeService.constructWebhookEvent(
      req.rawBody as Buffer,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        // Payment confirmed — update status to HELD
        const piSuccess = event.data.object as any;
        if (piSuccess.metadata?.bookingId) {
          await this.paymentsService.getBookingPayment(piSuccess.metadata.bookingId);
          // Payment is now authorized and held
        }
        break;

      case 'payment_intent.payment_failed':
        // Handle failed payment
        const piFailed = event.data.object as any;
        console.log(`Payment failed for booking: ${piFailed.metadata?.bookingId}`);
        break;
    }

    return { received: true };
  }
}
