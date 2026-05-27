import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersService } from './orders.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule { }
