import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsUUID, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  restaurantId!: string;

  @IsString()
  @IsOptional()
  @IsIn(['CASH', 'STRIPE'])
  paymentMethod?: 'CASH' | 'STRIPE';

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
