// ============================================================
// websocket/websocket.dev.ts
// Only used in development to simulate Member 3 events
// Inject this into app.module.ts only when NODE_ENV=development
// ============================================================

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderEventPayload } from 'src/contracts/events.types';
import { simulateOrderEvents } from 'src/contracts/mocks';

@Injectable()
export class WebsocketDevSimulator implements OnApplicationBootstrap {
  private readonly logger = new Logger(WebsocketDevSimulator.name);
  private cleanup: (() => void) | null = null;

  constructor(private readonly emitter: EventEmitter2) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV !== 'development') return;

    this.logger.warn('Dev mode: simulating order events every 5s (remove in production)');

    this.cleanup = simulateOrderEvents((event: OrderEventPayload) => {
      this.logger.debug(`Simulating event: ${event.eventType}`);
      this.emitter.emit(event.eventType, event);
    }, 5000);
  }

  onApplicationShutdown() {
    this.cleanup?.();
  }
}