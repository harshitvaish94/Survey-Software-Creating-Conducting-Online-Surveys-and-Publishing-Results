/**
 * SMS-34 / TC-Sec-05: requests beyond the limit receive HTTP 429.
 * Runs the real app setup (configureApp) with small limits in front of stub routes.
 */
import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { configureApp } from '../app.setup';
import { LIMITS, TOO_MANY, limiterFor, trustProxySetting } from './rate-limit';

@Controller()
class StubController {
  @Post('auth/login') @HttpCode(200) login() {
    return { ok: true };
  }
  @Get('auth/me') me() {
    return { ok: true };
  }
  @Post('auth/register') register() {
    return { ok: true };
  }
  @Post('surveys/:surveyId/responses') submit() {
    return { ok: true };
  }
  @Post('surveys') create() {
    return { ok: true };
  }
}

const saved = { ...process.env };
let app: INestApplication | undefined;

async function start(env: Record<string, string>) {
  Object.assign(process.env, env);
  const moduleRef = await Test.createTestingModule({
    controllers: [StubController],
  }).compile();
  app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return request(app.getHttpServer());
}

afterEach(async () => {
  await app?.close();
  app = undefined;
  process.env = { ...saved };
});

describe('rate limiting (SMS-34)', () => {
  it('answers 429 with a clear message once the login limit is used up', async () => {
    const http = await start({ RATE_LIMIT_LOGIN: '3' });
    for (let i = 0; i < 3; i++) {
      const ok = await http.post('/auth/login').send({});
      expect(ok.status).toBe(200);
      expect(ok.headers['ratelimit']).toMatch(/limit=3/);
    }
    const blocked = await http.post('/auth/login').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      statusCode: 429,
      message: TOO_MANY,
      error: 'Too Many Requests',
    });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('limits survey submissions per survey route', async () => {
    const http = await start({ RATE_LIMIT_SUBMIT: '2' });
    expect((await http.post('/surveys/7/responses').send({})).status).toBe(201);
    expect((await http.post('/surveys/7/responses').send({})).status).toBe(201);
    expect((await http.post('/surveys/7/responses').send({})).status).toBe(429);
  });

  it('keeps each endpoint separate and leaves reads and other routes alone', async () => {
    const http = await start({
      RATE_LIMIT_LOGIN: '1',
      RATE_LIMIT_REGISTER: '1',
    });
    expect((await http.post('/auth/login').send({})).status).toBe(200);
    expect((await http.post('/auth/login').send({})).status).toBe(429);
    expect((await http.post('/auth/register').send({})).status).toBe(201);
    for (let i = 0; i < 5; i++) {
      expect((await http.get('/auth/me')).status).toBe(200);
      expect((await http.post('/surveys').send({})).status).toBe(201);
    }
  });

  it('can be switched off with RATE_LIMIT_ENABLED=false', async () => {
    const http = await start({
      RATE_LIMIT_LOGIN: '1',
      RATE_LIMIT_ENABLED: 'false',
    });
    for (let i = 0; i < 5; i++)
      expect((await http.post('/auth/login').send({})).status).toBe(200);
  });

  it('ignores a forged X-Forwarded-For by default, so attackers cannot dodge the limit', async () => {
    const http = await start({ RATE_LIMIT_LOGIN: '1' });
    expect(
      (
        await http
          .post('/auth/login')
          .set('X-Forwarded-For', '1.1.1.1')
          .send({})
      ).status,
    ).toBe(200);
    expect(
      (
        await http
          .post('/auth/login')
          .set('X-Forwarded-For', '2.2.2.2')
          .send({})
      ).status,
    ).toBe(429);
  });

  it('counts each real client separately behind a trusted proxy (TRUST_PROXY=1)', async () => {
    const http = await start({ RATE_LIMIT_LOGIN: '1', TRUST_PROXY: '1' });
    expect(
      (
        await http
          .post('/auth/login')
          .set('X-Forwarded-For', '1.1.1.1')
          .send({})
      ).status,
    ).toBe(200);
    expect(
      (
        await http
          .post('/auth/login')
          .set('X-Forwarded-For', '2.2.2.2')
          .send({})
      ).status,
    ).toBe(200);
    expect(
      (
        await http
          .post('/auth/login')
          .set('X-Forwarded-For', '1.1.1.1')
          .send({})
      ).status,
    ).toBe(429);
  });
});

describe('rate limit settings', () => {
  it('uses the defaults unless a valid number is configured', () => {
    const login = LIMITS.find((l) => l.name === 'LOGIN')!;
    expect(login).toMatchObject({ path: '/auth/login', max: 30 });
    expect(limiterFor(login, { RATE_LIMIT_LOGIN: 'abc' })).toBeTypeOf(
      'function',
    );
    expect(limiterFor(login, { RATE_LIMIT_LOGIN: '-5' })).toBeTypeOf(
      'function',
    );
  });

  it('reads TRUST_PROXY', () => {
    expect(trustProxySetting({})).toBe(false);
    expect(trustProxySetting({ TRUST_PROXY: '1' })).toBe(1);
    expect(trustProxySetting({ TRUST_PROXY: 'true' })).toBe(true);
    expect(trustProxySetting({ TRUST_PROXY: 'false' })).toBe(false);
    expect(trustProxySetting({ TRUST_PROXY: '10.0.0.0/8' })).toBe('10.0.0.0/8');
  });
});
