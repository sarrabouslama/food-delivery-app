import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class MarkNotificationsReadDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  notificationIds!: string[];
}
