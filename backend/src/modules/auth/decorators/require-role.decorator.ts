import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from '../../../contracts/auth.types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

export function RequireCustomer() {
  return applyDecorators(
    Roles(Role.CUSTOMER),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
}

export function RequireRestaurant() {
  return applyDecorators(
    Roles(Role.RESTAURANT),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
}
