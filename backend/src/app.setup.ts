import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { SanitizePipe } from './security/sanitize';

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

  // Parse the HTTP-only session cookie (SMS-14)
  app.use(cookieParser());

  // CORS for the frontend; credentials so the browser sends the session cookie
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Clean input first (SMS-33), then validate: unknown fields are stripped.
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  return app;
}
