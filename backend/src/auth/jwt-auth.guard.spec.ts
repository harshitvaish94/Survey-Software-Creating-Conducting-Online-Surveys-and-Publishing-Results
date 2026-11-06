import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import { UserRole } from '../users/user.entity';
import { jwtSecret, SESSION_COOKIE, sessionCookieOptions } from './auth.constants';
import { currentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: 60 } });

export function httpContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as any;
}

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard(jwt);

  it('accepts a valid session cookie and attaches the user', async () => {
    const token = await jwt.signAsync({ sub: 4, email: 'a@b.com', role: UserRole.RESPONDENT });
    const request: Record<string, unknown> = { cookies: { [SESSION_COOKIE]: token } };
    await expect(guard.canActivate(httpContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 4, email: 'a@b.com', role: UserRole.RESPONDENT });
    expect(currentUser(httpContext(request))).toEqual(request.user);
  });

  it('rejects a request with no cookie (401)', async () => {
    await expect(guard.canActivate(httpContext({}))).rejects.toThrow('Please log in to continue.');
  });

  it('rejects a tampered or foreign token (401)', async () => {
    const forged = await new JwtService({ secret: 'other' }).signAsync({ sub: 1 });
    await expect(
      guard.canActivate(httpContext({ cookies: { [SESSION_COOKIE]: forged } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an expired token (401)', async () => {
    const expired = await new JwtService({ secret: 'test-secret' }).signAsync({
      sub: 1,
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    await expect(
      guard.canActivate(httpContext({ cookies: { [SESSION_COOKIE]: expired } })),
    ).rejects.toThrow('Your session has expired. Please log in again.');
  });
});

describe('auth settings', () => {
  it('marks the cookie Secure in production or when COOKIE_SECURE=true', () => {
    expect(sessionCookieOptions({}).secure).toBe(false);
    expect(sessionCookieOptions({ NODE_ENV: 'production' }).secure).toBe(true);
    expect(sessionCookieOptions({ NODE_ENV: 'production', COOKIE_SECURE: 'false' }).secure).toBe(false);
    expect(sessionCookieOptions({ COOKIE_SECURE: 'true' }).secure).toBe(true);
  });

  it('requires JWT_SECRET in production and uses it when given', () => {
    expect(jwtSecret({ JWT_SECRET: 's3cret' })).toBe('s3cret');
    expect(jwtSecret({})).toMatch(/dev-only/);
    expect(() => jwtSecret({ NODE_ENV: 'production' })).toThrow('JWT_SECRET must be set');
  });
});
