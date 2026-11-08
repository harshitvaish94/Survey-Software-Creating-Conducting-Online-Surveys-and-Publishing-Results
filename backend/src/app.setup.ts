import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { applyRateLimits } from './security/rate-limit';
import { SanitizePipe } from './security/sanitize';

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
  // SMS-33: security headers. The API returns JSON only, so the CSP can be strict;
  // Swagger UI (/api/docs) needs its own scripts, styles and data: images.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
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
