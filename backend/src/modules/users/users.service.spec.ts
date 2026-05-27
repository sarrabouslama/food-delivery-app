/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Role } from '../../contracts/auth.types';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-id',
    email: 'isra@example.com',
    passwordHash: 'hashed-password',
    role: Role.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      id: 'profile-id',
      userId: 'user-id',
      firstName: 'isra',
      lastName: 'zayeni',
      phone: null,
      avatarUrl: null,
      address: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return a user without passwordHash if found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-id');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        include: { profile: true },
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should upsert profile and return updated user info', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.userProfile.upsert.mockResolvedValue({
        id: 'profile-id',
        userId: 'user-id',
        firstName: 'eya',
        lastName: 'zayeni',
      });

      const updateDto = {
        firstName: 'eya',
        lastName: 'zayeni',
        phone: '12345678',
      };

      const result = await service.updateProfile('user-id', updateDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(prisma.userProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        create: {
          userId: 'user-id',
          firstName: 'eya',
          lastName: 'zayeni',
          phone: '12345678',
          avatarUrl: undefined,
          address: undefined,
        },
        update: {
          firstName: 'eya',
          lastName: 'zayeni',
          phone: '12345678',
          avatarUrl: undefined,
          address: undefined,
        },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if user to update does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('unknown-id', { firstName: 'eya' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
