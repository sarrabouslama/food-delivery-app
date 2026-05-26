import 'dotenv/config'; // Load .env file at startup
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, raw } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure raw body parser for Stripe webhook verification
  // Stripe signature verification requires the raw request body (bytes)
  app.use('/webhooks/payment', raw({ type: 'application/json' }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
