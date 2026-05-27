import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

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
    RestaurantsModule,
    OrdersModule,
    WebhooksModule,
    AppGraphQLModule,
  ],

  // Dev simulator disabled — use real order creation via API to test
  providers: [],
})
export class AppModule { }