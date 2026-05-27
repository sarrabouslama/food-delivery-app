import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// ── Shared modules ──────────────────────────────────────────
import { PrismaModule } from './modules/prisma/prisma.module';

// ── Feature modules (each member fills their own) ──────────
import { WebsocketModule } from './modules/websocket/websocket.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

// TODO (M1): import AuthModule     from './modules/auth/auth.module'
// TODO (M2): import RestaurantsModule, MenusModule, OrdersModule
// TODO (M3): import EventsModule
// TODO (M4B): import SseModule, AuditModule

// ── Dev only ────────────────────────────────────────────────
import { WebsocketDevSimulator } from './modules/websocket/websocket.dev';

const isDev = process.env.NODE_ENV === 'development';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

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
  ],

  // Dev simulator — fires mock events for testing
  providers: isDev ? [WebsocketDevSimulator] : [],
})
export class AppModule { }