import type { CookieOptions } from 'express';
import { UserRole } from '../users/user.entity';

/** Name of the HTTP-only cookie that carries the session JWT. */
export const SESSION_COOKIE = 'sms_session';

export const SESSION_TTL_SECONDS = 8 * 60 * 60;

/** The user attached to an authenticated request. */
export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

/**
 * HTTP-only so page scripts can never read the token; SameSite=Lax blocks it on
 * cross-site form posts. Secure (HTTPS only) in production, or when COOKIE_SECURE=true.
 */
export function sessionCookieOptions(env: NodeJS.ProcessEnv = process.env): CookieOptions {
  const secure =
    env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE === 'true' : env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}

/** JWT signing secret. Required in production; a fixed dev value is used otherwise. */
export function jwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  if (env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  return 'dev-only-insecure-jwt-secret-change-me';
}
