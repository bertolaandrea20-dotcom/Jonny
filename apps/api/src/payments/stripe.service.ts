import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService implements OnModuleInit {
  public stripe: Stripe;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    }
  }

  isConfigured(): boolean {
    return !!this.stripe;
  }

  /**
   * Create a Stripe Connect account for a professional.
   * This allows us to hold funds and pay them out later (escrow).
   */
  async createConnectAccount(email: string, firstName: string, lastName: string): Promise<string> {
    const account = await this.stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      individual: {
        first_name: firstName,
        last_name: lastName,
      },
    });
    return account.id;
  }

  /**
   * Generate an onboarding link for the professional to complete
   * their Stripe account setup (identity verification, bank account, etc.)
   */
  async createOnboardingLink(accountId: string, returnUrl: string): Promise<string> {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${returnUrl}?refresh=true`,
      return_url: `${returnUrl}?success=true`,
      type: 'account_onboarding',
    });
    return link.url;
  }

  /**
   * Check if a Connect account has completed onboarding.
   */
  async isAccountReady(accountId: string): Promise<boolean> {
    const account = await this.stripe.accounts.retrieve(accountId);
    return account.charges_enabled && account.payouts_enabled;
  }

  /**
   * Create a PaymentIntent with manual capture (escrow).
   * Funds are authorized on the client's card but NOT captured yet.
   * We capture them only when the service is completed.
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    professionalStripeAccountId: string,
    metadata: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    // Platform fee = 15% commission
    const platformFee = Math.round(amount * 0.15);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount, // in cents
      currency,
      capture_method: 'manual', // escrow: authorize only, capture later
      transfer_data: {
        destination: professionalStripeAccountId,
      },
      application_fee_amount: platformFee,
      metadata,
    });

    return paymentIntent;
  }

  /**
   * Capture the payment (release escrow to the professional).
   * Called when the service is marked as completed.
   */
  async capturePayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.capture(paymentIntentId);
  }

  /**
   * Cancel the payment (refund the client).
   * Called when the booking is cancelled.
   */
  async cancelPayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  /**
   * Create a refund for a disputed service.
   */
  async refundPayment(paymentIntentId: string): Promise<Stripe.Refund> {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
  }

  /**
   * Verify webhook signature.
   */
  constructWebhookEvent(payload: Buffer, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
