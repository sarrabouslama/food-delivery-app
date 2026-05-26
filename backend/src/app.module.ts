import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import jwtConfig from './config/jwt.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

import { OrdersModule } from './orders/orders.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { AppGraphQLModule } from './modules/graphql/graphql.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [jwtConfig],
    }),

    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    RestaurantsModule,
    OrdersModule, 
    WebhooksModule,
    AppGraphQLModule,
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
