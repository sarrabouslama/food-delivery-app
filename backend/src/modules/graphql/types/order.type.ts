import { Field, ID, Float, ObjectType } from '@nestjs/graphql';
import { MenuItemGql } from './menu.type';
import { RestaurantGql } from './restaurant.type';
import { UserGql } from './user.type';

@ObjectType()
export class OrderItemGql {
  @Field(() => ID)
  id: string;

  @Field()
  orderId: string;

  @Field()
  menuItemId: string;

  @Field(() => Float)
  unitPrice: number;

  @Field(() => Float)
  subtotal: number;

  @Field()
  quantity: number;

  @Field(() => MenuItemGql, { nullable: true })
  menuItem?: MenuItemGql;
}

@ObjectType()
export class PaymentGql {
  @Field(() => ID)
  id: string;

  @Field()
  orderId: string;

  @Field(() => Float)
  amount: number;

  @Field()
  status: string;

  @Field({ nullable: true })
  stripePaymentId?: string;

  @Field({ nullable: true })
  paidAt?: Date;
}

@ObjectType()
export class AuditLogGql {
  @Field(() => ID)
  id: string;

  @Field()
  orderId: string;

  @Field()
  eventType: string;

  @Field({ nullable: true })
  fromStatus?: string;

  @Field({ nullable: true })
  toStatus?: string;

  @Field()
  triggeredBy: string;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class OrderGql {
  @Field(() => ID)
  id: string;

  @Field()
  customerId: string;

  @Field()
  restaurantId: string;

  @Field()
  status: string;

  @Field(() => Float)
  totalPrice: number;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  address: string;

  @Field(() => [OrderItemGql])
  items: OrderItemGql[];

  @Field(() => PaymentGql, { nullable: true })
  payment?: PaymentGql;

  @Field(() => [AuditLogGql], { nullable: true })
  auditLogs?: AuditLogGql[];

  @Field(() => RestaurantGql, { nullable: true })
  restaurant?: RestaurantGql;

  @Field(() => UserGql, { nullable: true })
  customer?: UserGql;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
