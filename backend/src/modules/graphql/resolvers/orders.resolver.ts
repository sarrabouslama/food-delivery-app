import { Resolver, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { OrderGql } from '../types/order.type';
import { GqlJwtAuthGuard } from '../guards/gql-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { OrdersService } from 'src/modules/orders/orders.service';

@Resolver(() => OrderGql)
@UseGuards(GqlJwtAuthGuard)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Query(() => [OrderGql], { name: 'orders' })
  async getOrders(@CurrentUser() user: any) {
    return this.ordersService.findOrders(user.sub, user.role);
  }

  @Query(() => OrderGql, { name: 'order' })
  async getOrder(@Args('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.findOrderById(id, user.sub, user.role);
  }
}
