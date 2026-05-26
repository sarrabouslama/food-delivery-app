import { Field, ID, Float, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RestaurantGql {
  @Field(() => ID)
  id: string;

  @Field()
  ownerId: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  category: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field()
  address: string;

  @Field({ nullable: true })
  phone?: string;

  @Field()
  isOpen: boolean;

  @Field(() => Float)
  rating: number;

  @Field()
  createdAt: Date;
}
