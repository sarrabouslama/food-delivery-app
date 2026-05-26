import { Field, ID, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class MenuItemGql {
  @Field(() => ID)
  id: string;

  @Field()
  restaurantId: string;

  @Field({ nullable: true })
  categoryId?: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float)
  price: number;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field()
  isAvailable: boolean;

  @Field()
  createdAt: Date;
}

@ObjectType()
export class CategoryGql {
  @Field(() => ID)
  id: string;

  @Field()
  restaurantId: string;

  @Field()
  name: string;

  @Field(() => [MenuItemGql], { nullable: true })
  menuItems?: MenuItemGql[];
}
