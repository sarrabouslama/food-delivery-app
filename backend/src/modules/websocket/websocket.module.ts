import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [NotificationsModule, JwtModule, ConfigModule, PrismaModule],
  providers: [WebsocketGateway, WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketModule { }