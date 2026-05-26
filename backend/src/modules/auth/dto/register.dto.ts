import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../../../contracts/auth.types';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsEnum(Role)
  role: Role;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;
}
