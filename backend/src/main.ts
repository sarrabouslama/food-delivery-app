import 'dotenv/config'; // Load .env file at startup
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, raw } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);


   // Configure raw body parser for Stripe webhook verification
  // Stripe signature verification requires the raw request body (bytes)
  app.use('/webhooks/payment', raw({ type: 'application/json' }));

  
  // Global validation pipe — activates class-validator decorators on all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields from requests
      forbidNonWhitelisted: true, // throw 400 if unknown fields are sent
      transform: true, // auto-transform payloads to DTO class instances
    }),
  );

  // CORS — allow requests from the frontend dev server
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  });
  

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
