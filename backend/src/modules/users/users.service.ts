import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove sensitive data before returning
    const safeUser = { ...user };
    delete (safeUser as any).passwordHash;
    return safeUser;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Upsert the user profile
    await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        firstName: dto.firstName ?? '',
        lastName: dto.lastName ?? '',
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
        address: dto.address,
      },
      update: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
        address: dto.address,
      },
    });

    return this.findById(userId);
  }
}
