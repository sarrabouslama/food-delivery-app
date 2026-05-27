import { IsString, IsNotEmpty, IsOptional, IsPhoneNumber } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
