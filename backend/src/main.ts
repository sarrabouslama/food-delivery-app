import { NestFactory }                from '@nestjs/core';
import { ValidationPipe, Logger }    from '@nestjs/common';
import { IoAdapter }                 from '@nestjs/platform-socket.io';
import { AppModule }                 from './app.module';
import { json, raw, urlencoded } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app    = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // ── CORS ──────────────────────────────────────────────────
  app.enableCors({
    origin:      process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  });

  // Configure larger request parsers for base64 image payloads and forms.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Stripe signature verification requires the raw request body (bytes).
  app.use('/api/webhooks/payment', raw({ type: 'application/json', limit: '10mb' }));

  // ── Global validation pipe ────────────────────────────────
  // Strips unknown fields and validates all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:        true,   // strip fields not in DTO
      forbidNonWhitelisted: true,
      transform:        true,   // auto-transform payloads to DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Socket.io adapter ─────────────────────────────────────
  // Replaces the default adapter so WebSocket gateway works.
  // When you add Redis (for multi-instance support), swap this
  // with RedisIoAdapter — see comment below.
  app.useWebSocketAdapter(new IoAdapter(app));

  // ── Global prefix ─────────────────────────────────────────
  app.setGlobalPrefix('api');   // all REST routes → /api/...

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`WebSocket ready   on ws://localhost:${port}`);
  logger.log(`GraphQL playground on http://localhost:${port}/api/graphql`);
}

bootstrap();