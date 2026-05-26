import { Body, Controller, NotFoundException, Param, Patch } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderStatus } from '../contracts/models.types';

interface UpdateStatusDto {
  status: OrderStatus;
  triggeredBy?: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateStatusDto) {
    const { status, triggeredBy } = body;
    if (!status) throw new NotFoundException('Missing status');
    const payload = this.ordersService.updateStatus(id, status, triggeredBy ?? 'unknown');
    return { ok: true, event: payload };
  }
}
