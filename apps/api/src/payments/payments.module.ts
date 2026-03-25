import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';

@Module({
  providers: [PaymentsService, StripeService],
  controllers: [PaymentsController],
  exports: [PaymentsService, StripeService],
})
export class PaymentsModule {}
