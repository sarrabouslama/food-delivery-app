import { IsUUID } from 'class-validator';

export class OrderRoomDto {
  @IsUUID()
  orderId!: string;
}
