import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // 1. If it's a GraphQL query, extract the user from GqlExecutionContext
    if (ctx.getType().toString() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(ctx);
      return gqlContext.getContext().req.user;
    }
    
    // 2. Otherwise, use standard REST HTTP extraction
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);