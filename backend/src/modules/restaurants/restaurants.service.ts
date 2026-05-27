import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Restaurant Helpers ──────────────────────────────────────

  private async checkRestaurantOwnership(restaurantId: string, ownerId: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    if (restaurant.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this restaurant');
    }
  }

  // ── Restaurant CRUD ─────────────────────────────────────────

  async createRestaurant(ownerId: string, dto: CreateRestaurantDto) {
    // Check if the user already has a restaurant
    const existing = await this.prisma.restaurant.findUnique({
      where: { ownerId },
    });
    if (existing) {
      throw new ConflictException('A user can only own one restaurant');
    }

    return this.prisma.restaurant.create({
      data: {
        ownerId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        imageUrl: dto.imageUrl,
        address: dto.address,
        phone: dto.phone,
        isOpen: false,
      },
    });
  }

  async findAllRestaurants() {
    return this.prisma.restaurant.findMany({
      include: {
        categories: true,
      },
    });
  }

  async findRestaurantByOwner(ownerId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { ownerId },
      include: {
        categories: {
          include: { menuItems: true },
        },
        menuItems: {
          where: { categoryId: null },
        },
      },
    });
    if (!restaurant) {
      throw new NotFoundException('No restaurant found for this account');
    }
    return restaurant;
  }

  async findRestaurantById(id: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            menuItems: true,
          },
        },
        menuItems: {
          where: {
            categoryId: null, // also return items not in any category
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    return restaurant;
  }

  async updateRestaurant(id: string, ownerId: string, dto: UpdateRestaurantDto) {
    await this.checkRestaurantOwnership(id, ownerId);

    return this.prisma.restaurant.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        imageUrl: dto.imageUrl,
        address: dto.address,
        phone: dto.phone,
        isOpen: dto.isOpen,
      },
    });
  }

  async deleteRestaurant(id: string, ownerId: string) {
    await this.checkRestaurantOwnership(id, ownerId);

    return this.prisma.restaurant.delete({
      where: { id },
    });
  }

  // ── Category CRUD ───────────────────────────────────────────

  async createCategory(restaurantId: string, ownerId: string, dto: CreateCategoryDto) {
    await this.checkRestaurantOwnership(restaurantId, ownerId);

    return this.prisma.category.create({
      data: {
        restaurantId,
        name: dto.name,
      },
    });
  }

  async findAllCategories(restaurantId: string) {
    // Check if restaurant exists
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.category.findMany({
      where: { restaurantId },
      include: { menuItems: true },
    });
  }

  async updateCategory(id: string, ownerId: string, dto: CreateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.checkRestaurantOwnership(category.restaurantId, ownerId);

    return this.prisma.category.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async deleteCategory(id: string, ownerId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.checkRestaurantOwnership(category.restaurantId, ownerId);

    return this.prisma.category.delete({
      where: { id },
    });
  }

  // ── Menu Items CRUD ──────────────────────────────────────────

  async createMenuItem(restaurantId: string, ownerId: string, dto: CreateMenuItemDto) {
    await this.checkRestaurantOwnership(restaurantId, ownerId);

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category || category.restaurantId !== restaurantId) {
        throw new NotFoundException('Category not found in this restaurant');
      }
    }

    return this.prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
        isAvailable: dto.isAvailable ?? true,
      },
    });
  }

  async findAllMenuItems(restaurantId: string) {
    // Check if restaurant exists
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.menuItem.findMany({
      where: { restaurantId },
    });
  }

  async updateMenuItem(id: string, ownerId: string, dto: UpdateMenuItemDto) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id },
    });
    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    await this.checkRestaurantOwnership(menuItem.restaurantId, ownerId);

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category || category.restaurantId !== menuItem.restaurantId) {
        throw new NotFoundException('Category not found in this restaurant');
      }
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
        isAvailable: dto.isAvailable,
        categoryId: dto.categoryId,
      },
    });
  }

  async deleteMenuItem(id: string, ownerId: string) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id },
    });
    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    await this.checkRestaurantOwnership(menuItem.restaurantId, ownerId);

    return this.prisma.menuItem.delete({
      where: { id },
    });
  }
}
