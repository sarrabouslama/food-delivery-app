import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './modules/audit/audit.module';
import { SseModule } from './modules/sse/sse.module';
import { OrderEventsListener } from './modules/events/order-events.listener';
// ── Shared modules ──────────────────────────────────────────
import { PrismaModule } from './modules/prisma/prisma.module';

// ── Feature modules (each member fills their own) ──────────
import { WebsocketModule } from './modules/websocket/websocket.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

import jwtConfig from './config/jwt.config';
import { AuthModule } from './modules/auth/auth.module';

import { OrdersModule } from './modules/orders/orders.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { AppGraphQLModule } from './modules/graphql/graphql.module';

// ── Dev only ────────────────────────────────────────────────
import { WebsocketDevSimulator } from './modules/websocket/websocket.dev';
import { UsersModule } from './modules/users/users.module';

const isDev = process.env.NODE_ENV === 'development';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig],
    }),

    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),

    PrismaModule,
    WebsocketModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    AuditModule,
    SseModule,
    RestaurantsModule,
    OrdersModule,
    WebhooksModule,
    AppGraphQLModule,
  ],

  controllers: [AppController],
  providers: [AppService, OrderEventsListener],
})
export class AppModule { }