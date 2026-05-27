import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { OrdersModule } from '../orders/orders.module';
import { RestaurantsResolver } from './resolvers/restaurants.resolver';
import { OrdersResolver } from './resolvers/orders.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    RestaurantsModule,
    OrdersModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
      context: ({ req }) => ({ req }),
    }),
  ],
  providers: [RestaurantsResolver, OrdersResolver],
})
export class AppGraphQLModule { }
