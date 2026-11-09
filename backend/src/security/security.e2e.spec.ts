/**
 * SMS-33 / TC-Sec-04 at the HTTP level, without a database: the real app setup
 * (configureApp) in front of a small controller that echoes what it received.
 */
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsString, MaxLength } from 'class-validator';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configureApp } from '../app.setup';

class EchoDto {
  @IsString()
  @MaxLength(200)
  title: string;
}

@Controller('echo')
class EchoController {
  @Post()
  echo(@Body() dto: EchoDto) {
    return { received: dto };
  }

  @Get(':id')
  byId(@Param('id', ParseIntPipe) id: number) {
    return { id };
  }
}

describe('HTTP security (SMS-33)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EchoController],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(() => app.close());

  it('sends security headers and hides the framework', async () => {
    const res = await request(app.getHttpServer()).get('/echo/1');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    // JSON responses: nothing may be loaded, framed or submitted (SMS-39 ZAP findings)
    expect(res.headers['content-security-policy']).toBe(
      "default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'",
    );
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects SQL in a numeric path parameter (400), so it never reaches a query', async () => {
    for (const id of ['1 OR 1=1', "1'; DROP TABLE surveys;--", '1;SELECT 1']) {
      const res = await request(app.getHttpServer()).get(
        `/echo/${encodeURIComponent(id)}`,
      );
      expect(res.status).toBe(400);
    }
  });

  it('returns a script payload as plain JSON data, never as HTML', async () => {
    const title = '<script>alert(document.cookie)</script>';
    const res = await request(app.getHttpServer())
      .post('/echo')
      .send({ title });
    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.body.received.title).toBe(title);
  });

  it('strips control characters such as NUL before validation', async () => {
    const res = await request(app.getHttpServer())
      .post('/echo')
      .send({ title: 'Bad\u0000title' });
    expect(res.status).toBe(201);
    expect(res.body.received.title).toBe('Badtitle');
  });

  it('drops unknown fields and prototype-polluting keys', async () => {
    const res = await request(app.getHttpServer())
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send(
        '{"title":"t","role":"Administrator","__proto__":{"isAdmin":true}}',
      );
    expect(res.status).toBe(201);
    expect(res.body.received).toEqual({ title: 't' });
  });

  it('rejects wrong types and over-long values (400)', async () => {
    expect(
      (
        await request(app.getHttpServer())
          .post('/echo')
          .send({ title: { $ne: null } })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app.getHttpServer())
          .post('/echo')
          .send({ title: 'x'.repeat(201) })
      ).status,
    ).toBe(400);
  });

  it('gives only the Swagger UI page the policy it needs', async () => {
    const { isSwaggerUi } = await import('../app.setup');
    expect(isSwaggerUi('/api/docs')).toBe(true);
    expect(isSwaggerUi('/api/docs/swagger-ui.css')).toBe(true);
    expect(isSwaggerUi('/api/docs-json')).toBe(false);
    expect(isSwaggerUi('/surveys')).toBe(false);
    const res = await request(app.getHttpServer()).get('/api/docs/anything');
    expect(res.headers['content-security-policy']).toContain(
      "style-src 'self' 'unsafe-inline'",
    );
    expect(res.headers['content-security-policy']).toContain(
      "frame-ancestors 'none'",
    );
  });
});
