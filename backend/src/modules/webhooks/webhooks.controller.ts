import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
} from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
const Stripe = require('stripe');

@Controller('webhooks')
export class WebhooksController {
  private stripe: any;

  constructor(private readonly ordersService: OrdersService) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    this.stripe = new Stripe(secretKey);
  }

  @Post('payment')
  @HttpCode(200)
  async paymentWebhook(
    @Body() body: Buffer | any,
    @Headers('stripe-signature') sig: string,
  ) {
    if (!sig) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    let event: any;
    const rawBody = Buffer.isBuffer(body)
      ? body.toString('utf8')
      : typeof body === 'string'
        ? body
        : JSON.stringify(body);

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        sig,
        webhookSecret,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(
        `Webhook signature verification failed: ${message}`,
      );
    }

    // Handle charge.succeeded events
    if (event.type === 'charge.succeeded') {
      const charge = event.data.object as any;

      const result = await this.ordersService.handlePaymentWebhook({
        stripePaymentId: charge.id,
        orderId: (charge.metadata?.orderId as string) || 'unknown',
        status: 'SUCCEEDED',
        amount: charge.amount / 100,
        timestamp: new Date(charge.created * 1000).toISOString(),
      });

      return { ok: true, eventId: event.id, result };
    }

    // Handle charge.failed events
    if (event.type === 'charge.failed') {
      const charge = event.data.object as any;

      const result = await this.ordersService.handlePaymentWebhook({
        stripePaymentId: charge.id,
        orderId: (charge.metadata?.orderId as string) || 'unknown',
        status: 'FAILED',
        amount: charge.amount / 100,
        timestamp: new Date(charge.created * 1000).toISOString(),
      });

      return { ok: true, eventId: event.id, result };
    }

    // Other event types are ignored (acknowledged)
    return { ok: true, eventId: event.id, message: 'Event received (not handled)' };
  }
}