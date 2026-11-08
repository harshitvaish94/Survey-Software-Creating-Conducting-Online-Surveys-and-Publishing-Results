import type { INestApplication } from '@nestjs/common';
import type { Express, Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { Options, RateLimitRequestHandler } from 'express-rate-limit';

export const TOO_MANY =
  'Too many attempts. Please wait a few minutes and try again.';

const MINUTE = 60 * 1000;

/**
 * SMS-34: per-IP limits on the endpoints attackers hammer. Each can be tuned with
 * RATE_LIMIT_<NAME>=<max>, and RATE_LIMIT_ENABLED=false turns them all off
 * (for example on a staging server that runs the end-to-end tests).
 */
export const LIMITS = [
  { name: 'LOGIN', path: '/auth/login', max: 30, windowMs: 15 * MINUTE },
  { name: 'REGISTER', path: '/auth/register', max: 30, windowMs: 60 * MINUTE },
  {
    name: 'FORGOT_PASSWORD',
    path: '/auth/forgot-password',
    max: 10,
    windowMs: 15 * MINUTE,
  },
  {
    name: 'RESET_PASSWORD',
    path: '/auth/reset-password',
    max: 10,
    windowMs: 15 * MINUTE,
  },
  // A whole class may answer from one school network, so this one is generous.
  {
    name: 'SUBMIT',
    path: '/surveys/:surveyId/responses',
    max: 120,
    windowMs: 5 * MINUTE,
  },
] as const;

export function limiterFor(
  limit: { name: string; max: number; windowMs: number },
  env: NodeJS.ProcessEnv = process.env,
  extra: Partial<Options> = {},
): RateLimitRequestHandler {
  const configured = Number(env[`RATE_LIMIT_${limit.name}`]);
  return rateLimit({
    windowMs: limit.windowMs,
    limit:
      Number.isFinite(configured) && configured > 0 ? configured : limit.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Only the form posts are limited; reading pages is not.
    skip: (req: Request) => req.method !== 'POST',
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({
        statusCode: options.statusCode,
        message: TOO_MANY,
        error: 'Too Many Requests',
      });
    },
    ...extra,
  });
}

/**
 * Behind Nginx every request comes from the proxy, so the client IP has to be
 * read from X-Forwarded-For. Only trust that header from the proxy itself:
 * TRUST_PROXY=1 (one proxy hop) in production; nothing is trusted by default, so a
 * forged header can't be used to dodge the limits.
 */
export function trustProxySetting(
  env: NodeJS.ProcessEnv = process.env,
): boolean | number | string {
  const value = env.TRUST_PROXY;
  if (value === undefined || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return /^\d+$/.test(value) ? Number(value) : value;
}

export function applyRateLimits(
  app: INestApplication,
  env: NodeJS.ProcessEnv = process.env,
): void {
  (app.getHttpAdapter().getInstance() as Express).set(
    'trust proxy',
    trustProxySetting(env),
  );
  if (env.RATE_LIMIT_ENABLED === 'false') return;
  for (const limit of LIMITS) app.use(limit.path, limiterFor(limit, env));
}
