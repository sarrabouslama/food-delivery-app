import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrdersModule } from './orders/orders.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [EventEmitterModule.forRoot(), OrdersModule, WebhooksModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
