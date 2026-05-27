import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserProfileGql {
  @Field(() => ID)
  id!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field({ nullable: true })
  address?: string;
}

@ObjectType()
export class UserGql {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field()
  role!: string;

  @Field(() => UserProfileGql, { nullable: true })
  profile?: UserProfileGql;

  @Field()
  createdAt!: Date;
}
