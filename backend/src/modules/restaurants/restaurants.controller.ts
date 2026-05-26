import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireRestaurant } from '../auth/decorators/require-role.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  // ── Restaurant Endpoints ────────────────────────────────────

  @Post()
  @RequireRestaurant()
  create(@CurrentUser() user: any, @Body() createRestaurantDto: CreateRestaurantDto) {
    return this.restaurantsService.createRestaurant(user.sub, createRestaurantDto);
  }

  @Get()
  findAll() {
    return this.restaurantsService.findAllRestaurants();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findRestaurantById(id);
  }

  @Patch(':id')
  @RequireRestaurant()
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return this.restaurantsService.updateRestaurant(id, user.sub, updateRestaurantDto);
  }

  @Delete(':id')
  @RequireRestaurant()
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.restaurantsService.deleteRestaurant(id, user.sub);
  }

  // ── Category Endpoints ──────────────────────────────────────

  @Post(':restaurantId/categories')
  @RequireRestaurant()
  createCategory(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: any,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.restaurantsService.createCategory(restaurantId, user.sub, createCategoryDto);
  }

  @Get(':restaurantId/categories')
  findAllCategories(@Param('restaurantId') restaurantId: string) {
    return this.restaurantsService.findAllCategories(restaurantId);
  }

  @Patch('categories/:id')
  @RequireRestaurant()
  updateCategory(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() createCategoryDto: CreateCategoryDto,
  ) {
    return this.restaurantsService.updateCategory(id, user.sub, createCategoryDto);
  }

  @Delete('categories/:id')
  @RequireRestaurant()
  removeCategory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.restaurantsService.deleteCategory(id, user.sub);
  }

  // ── Menu Item Endpoints ────────────────────────────────────

  @Post(':restaurantId/menu-items')
  @RequireRestaurant()
  createMenuItem(
    @Param('restaurantId') restaurantId: string,
    @CurrentUser() user: any,
    @Body() createMenuItemDto: CreateMenuItemDto,
  ) {
    return this.restaurantsService.createMenuItem(restaurantId, user.sub, createMenuItemDto);
  }

  @Get(':restaurantId/menu-items')
  findAllMenuItems(@Param('restaurantId') restaurantId: string) {
    return this.restaurantsService.findAllMenuItems(restaurantId);
  }

  @Patch('menu-items/:id')
  @RequireRestaurant()
  updateMenuItem(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.restaurantsService.updateMenuItem(id, user.sub, updateMenuItemDto);
  }

  @Delete('menu-items/:id')
  @RequireRestaurant()
  removeMenuItem(@Param('id') id: string, @CurrentUser() user: any) {
    return this.restaurantsService.deleteMenuItem(id, user.sub);
  }
}
