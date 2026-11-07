import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './access.decorators';
import { SESSION_COOKIE } from './auth.constants';
import type { AuthUser, JwtPayload } from './auth.constants';

export type AuthedRequest = Request & { user?: AuthUser };

/**
 * Global guard (SMS-15). Reads the session cookie, verifies the JWT and puts the
 * user on `request.user`. Routes need a valid session unless marked @Public().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // Optional login: attach the user if the cookie is valid, otherwise carry on anonymously.
      request.user = await this.authenticate(request).catch(() => undefined);
      return true;
    }
    request.user = await this.authenticate(request);
    return true;
  }

  async authenticate(request: AuthedRequest): Promise<AuthUser> {
    const token = (request.cookies as Record<string, string> | undefined)?.[
      SESSION_COOKIE
    ];
    if (!token) throw new UnauthorizedException('Please log in to continue.');
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      throw new UnauthorizedException(
        'Your session has expired. Please log in again.',
      );
    }
  }
}
