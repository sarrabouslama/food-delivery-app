import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../contracts/auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // No roles required, proceed
    }
    const { user } = context.switchToHttp().getRequest();

    // Safety check in case user is missing (e.g. forgot JwtAuthGuard)
    if (!user) {
      return false;
    }

    return requiredRoles.some((role) => user.role === role);
  }
}
