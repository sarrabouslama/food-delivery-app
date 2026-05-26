import { Resolver, Query, Args, ResolveField, Parent } from '@nestjs/graphql';
import { RestaurantsService } from '../../restaurants/restaurants.service';
import { RestaurantGql } from '../types/restaurant.type';
import { CategoryGql, MenuItemGql } from '../types/menu.type';

@Resolver(() => RestaurantGql)
export class RestaurantsResolver {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Query(() => [RestaurantGql], { name: 'restaurants' })
  async getRestaurants() {
    return this.restaurantsService.findAllRestaurants();
  }

  @Query(() => RestaurantGql, { name: 'restaurant' })
  async getRestaurant(@Args('id') id: string) {
    return this.restaurantsService.findRestaurantById(id);
  }

  @ResolveField(() => [CategoryGql])
  async categories(@Parent() restaurant: RestaurantGql) {
    return this.restaurantsService.findAllCategories(restaurant.id);
  }

  @ResolveField(() => [MenuItemGql])
  async menuItems(@Parent() restaurant: RestaurantGql) {
    return this.restaurantsService.findAllMenuItems(restaurant.id);
  }
}
