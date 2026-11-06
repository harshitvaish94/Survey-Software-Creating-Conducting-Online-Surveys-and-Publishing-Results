import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { SESSION_COOKIE } from './auth.constants';
import type { AuthUser, JwtPayload } from './auth.constants';

export type AuthedRequest = Request & { user?: AuthUser };

/** Reads the session cookie, verifies the JWT and puts the user on `request.user`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    request.user = await this.authenticate(request);
    return true;
  }

  async authenticate(request: AuthedRequest): Promise<AuthUser> {
    const token = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    if (!token) throw new UnauthorizedException('Please log in to continue.');
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return { id: payload.sub, email: payload.email, role: payload.role };
    } catch {
      throw new UnauthorizedException('Your session has expired. Please log in again.');
    }
  }
}
