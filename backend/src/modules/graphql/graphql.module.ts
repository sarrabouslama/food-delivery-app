import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { OrdersModule } from '../orders/orders.module';
import { RestaurantsResolver } from './resolvers/restaurants.resolver';
import { OrdersResolver } from './resolvers/orders.resolver';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    RestaurantsModule,
    OrdersModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      path: '/api/graphql',
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
      context: ({ req }) => ({ req }),
    }),
  ],
  providers: [RestaurantsResolver, OrdersResolver],
})
export class AppGraphQLModule { }
