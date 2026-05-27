/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../../contracts/auth.types';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  const mockUser = {
    id: 'user-id',
    email: 'isra@example.com',
    passwordHash: 'hashed-password',
    role: Role.CUSTOMER,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(() => 'signed-token'),
    verify: jest.fn(() => ({
      sub: 'user-id',
      email: 'isra@example.com',
      role: Role.CUSTOMER,
    })),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'jwt.secret') return 'test-secret';
      if (key === 'jwt.expiresIn') return '1h';
      if (key === 'jwt.refreshSecret') return 'test-refresh-secret';
      if (key === 'jwt.refreshExpiresIn') return '7d';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user and return auth tokens', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const dto = {
        email: 'isra@example.com',
        password: 'password123',
        role: Role.CUSTOMER,
        firstName: 'isra',
        lastName: 'zayeni',
      };

      const result = await service.register(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          passwordHash: 'hashed-password',
          role: dto.role,
          profile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
            },
          },
        },
      });
      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user.email).toBe(dto.email);
    });

    it('should throw ConflictException if email is already registered', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const dto = {
        email: 'isra@example.com',
        password: 'password123',
        role: Role.CUSTOMER,
        firstName: 'isra',
        lastName: 'zayeni',
      };

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully login user and return auth tokens', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const dto = {
        email: 'isra@example.com',
        password: 'password123',
      };

      const result = await service.login(dto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: dto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        dto.password,
        mockUser.passwordHash,
      );
      expect(result.accessToken).toBe('signed-token');
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const dto = {
        email: 'isra@example.com',
        password: 'password123',
      };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password match fails', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const dto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens when valid refresh token is passed', async () => {
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(mockUser);

      const result = await service.refresh('valid-refresh-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'test-refresh-secret',
      });
      expect(prisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(result.accessToken).toBe('signed-token');
    });

    it('should throw UnauthorizedException if jwt verify fails', async () => {
      mockJwtService.verify.mockImplementationOnce(() => {
        throw new Error('JWT verify failed');
      });

      await expect(service.refresh('invalid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
