import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { applyRateLimits } from './security/rate-limit';
import { SanitizePipe } from './security/sanitize';

/** Content security policy for JSON responses: nothing may load or frame them. */
export const API_CSP = {
  defaultSrc: ["'none'"],
  frameAncestors: ["'none'"],
  baseUri: ["'none'"],
  formAction: ["'none'"],
};

/** Swagger UI needs its own scripts, its inline styles and data: images. */
export const DOCS_CSP = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:'],
  fontSrc: ["'self'"],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
};

/** The Swagger UI page and its assets, but not the /api/docs-json document. */
export const isSwaggerUi = (path: string) =>
  path === '/api/docs' || path.startsWith('/api/docs/');

/** FRONTEND_ORIGIN (comma-separated for several) plus the local development origins. */
export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = (env.FRONTEND_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const local = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://10.249.140.189:5173',
  ];
  return [...new Set([...configured, ...local])];
}

/**
 * HTTP-level setup shared by main.ts and the security tests, so the tests run
 * against exactly what production runs.
 */
export function configureApp(app: INestApplication): INestApplication {
  // SMS-33 / SMS-39: security headers. The API only returns JSON, so its content
  // security policy allows nothing at all. Only the Swagger UI page (/api/docs)
  // gets a policy that lets it load its own scripts and inline styles.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  const apiCsp = helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: API_CSP,
  });
  const docsCsp = helmet.contentSecurityPolicy({
    useDefaults: false,
    directives: DOCS_CSP,
  });
  app.use((req: Request, res: Response, next: NextFunction) =>
    isSwaggerUi(req.path) ? docsCsp(req, res, next) : apiCsp(req, res, next),
  );

  // SMS-34: per-IP rate limits on login, register, password reset and submissions
  applyRateLimits(app);

  // Parse the HTTP-only session cookie (SMS-14)
  app.use(cookieParser());

  // CORS for the frontend; credentials so the browser sends the session cookie.
  // The extra origins let the app be opened from 127.0.0.1 and from a phone on the
  // local network (SMS-24 QR codes).
  app.enableCors({
    origin: allowedOrigins(),
    credentials: true,
  });

  // Clean input first (SMS-33), then validate: unknown fields are stripped.
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  return app;
}
