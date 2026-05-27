import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuditResolver } from './audit.resolver';
import { AuditService } from './audit.service';

@Module({
  imports: [PrismaModule],
  providers: [AuditService, AuditResolver],
  exports: [AuditService],
})
export class AuditModule {}