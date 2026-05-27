import { BadRequestException, Controller, Header, Req, Sse } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

import { SseMessageEvent, SseService } from './sse.service';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('orders/:orderId')
  @Header('Cache-Control', 'no-cache')
  @Header('X-Accel-Buffering', 'no')
  streamOrderUpdates(@Req() req: Request): Observable<SseMessageEvent> {
    const rawOrderId = req.params.orderId;
    const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

    if (!orderId) {
      throw new BadRequestException('orderId is required');
    }

    const stream = this.sseService.getStream(orderId);

    req.on('close', () => {
      this.sseService.close(orderId);
    });

    return stream;
  }
}