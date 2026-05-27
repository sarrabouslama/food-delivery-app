import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Patch,
  Post,
  Get,
  UseGuards,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { RequireCustomer } from '../auth/decorators/require-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface StripeCheckoutDto {
  successUrl: string;
  cancelUrl: string;
}

interface UpdateStatusDto {
  status: OrderStatus;
  triggeredBy?: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @RequireCustomer()
  async create(@CurrentUser() user: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.createOrder(user.sub, createOrderDto);
  }

  @Post(':id/stripe-checkout')
  @RequireCustomer()
  async createStripeCheckout(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: StripeCheckoutDto,
  ) {
    return this.ordersService.createStripeCheckoutSession(id, user.sub, body.successUrl, body.cancelUrl);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: any) {
    return this.ordersService.findOrders(user.sub, user.role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.findOrderById(id, user.sub, user.role);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    const { status, triggeredBy } = body;
    if (!status) throw new NotFoundException('Missing status');

    const trigger = triggeredBy ?? user.email ?? 'unknown';
    const payload = await this.ordersService.updateStatus(id, status, trigger);
    return { ok: true, event: payload };
  }
}
