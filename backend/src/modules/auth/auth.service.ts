import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, JwtPayload } from '../../contracts/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Register ────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        },
      },
    });

    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  // ── Login ────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user.id, user.email, user.role);
  }

  // ── Refresh ──────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: payload.sub },
      });

      return this.buildAuthResponse(user.id, user.email, user.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  private buildAuthResponse(
    id: string,
    email: string,
    role: string,
  ): AuthResponse {
    const payload = { sub: id, email, role: role as any };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: this.config.get<string>('jwt.expiresIn') as any,
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn') as any,
    });

    return {
      accessToken,
      refreshToken,
      user: { id, email, role: role as any },
    };
  }
}
