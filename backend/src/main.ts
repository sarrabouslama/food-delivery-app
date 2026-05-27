import { NestFactory }                from '@nestjs/core';
import { ValidationPipe, Logger }    from '@nestjs/common';
import { IoAdapter }                 from '@nestjs/platform-socket.io';
import { AppModule }                 from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app    = await NestFactory.create(AppModule);

  // ── CORS ──────────────────────────────────────────────────
  app.enableCors({
    origin:      process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  });

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


// ============================================================
// HOW TO UPGRADE TO REDIS ADAPTER (when you need it)
// Uncomment and use this instead of IoAdapter above.
//
// Step 1 — install:
//   pnpm add @socket.io/redis-adapter ioredis
//
// Step 2 — create src/adapters/redis-io.adapter.ts:
//
//   import { IoAdapter } from '@nestjs/platform-socket.io';
//   import { ServerOptions } from 'socket.io';
//   import { createAdapter } from '@socket.io/redis-adapter';
//   import { createClient } from 'ioredis';
//
//   export class RedisIoAdapter extends IoAdapter {
//     private adapterConstructor: ReturnType<typeof createAdapter>;
//
//     async connectToRedis(): Promise<void> {
//       const pub = createClient({ host: process.env.REDIS_HOST, port: +process.env.REDIS_PORT });
//       const sub = pub.duplicate();
//       await Promise.all([pub.connect(), sub.connect()]);
//       this.adapterConstructor = createAdapter(pub, sub);
//     }
//
//     createIOServer(port: number, options?: ServerOptions) {
//       const server = super.createIOServer(port, options);
//       server.adapter(this.adapterConstructor);
//       return server;
//     }
//   }
//
// Step 3 — in main.ts:
//   const redisAdapter = new RedisIoAdapter(app);
//   await redisAdapter.connectToRedis();
//   app.useWebSocketAdapter(redisAdapter);
// ============================================================