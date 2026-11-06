import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './auth.constants';
import type { AuthedRequest } from './jwt-auth.guard';

/** The logged-in user, as set by JwtAuthGuard. */
export const currentUser = (context: ExecutionContext): AuthUser | undefined =>
  context.switchToHttp().getRequest<AuthedRequest>().user;

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  currentUser(context),
);
