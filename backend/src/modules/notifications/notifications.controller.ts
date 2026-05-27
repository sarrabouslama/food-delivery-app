import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtPayload } from 'src/contracts/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import { NotificationsService } from './notifications.service';

const DEFAULT_NOTIFICATION_LIMIT = 10;

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getRecentNotifications(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit === undefined ? NaN : Number(limit);
    const requestedLimit = Number.isFinite(parsedLimit)
      ? parsedLimit
      : DEFAULT_NOTIFICATION_LIMIT;

    return this.notificationsService.getRecentNotifications(user.sub, requestedLimit);
  }

  @Patch('read')
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MarkNotificationsReadDto,
  ) {
    await this.notificationsService.markAsRead(user.sub, dto.notificationIds);
    return { ok: true };
  }
}
