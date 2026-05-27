import { Resolver, Query, Args } from '@nestjs/graphql';

import { AuditLogGql } from '../graphql/types/order.type';
import { AuditService } from './audit.service';

@Resolver(() => AuditLogGql)
export class AuditResolver {
  constructor(private readonly auditService: AuditService) {}

  @Query(() => [AuditLogGql], { name: 'getOrderAuditLog' })
  async getOrderAuditLog(@Args('orderId') orderId: string) {
    return this.auditService.getOrderAuditLog(orderId);
  }
}