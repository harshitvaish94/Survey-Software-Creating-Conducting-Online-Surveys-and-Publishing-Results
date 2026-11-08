import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from '../auth/auth.controller';
import { ResponsesController } from '../surveys/responses.controller';
import {
  CAPTCHA_FAILED,
  CAPTCHA_REQUIRED,
  CaptchaGuard,
  verifyWithHCaptcha,
} from './captcha';

function ctx(body: unknown, ip = '203.0.113.9') {
  return { switchToHttp: () => ({ getRequest: () => ({ body, ip }) }) } as any;
}

function guard(
  env: Record<string, string>,
  verify = vi.fn().mockResolvedValue(true),
) {
  const g = new CaptchaGuard();
  g.env = env;
  g.verify = verify;
  return { g, verify };
}

describe('CaptchaGuard (SMS-34)', () => {
  it('is off until HCAPTCHA_SECRET is set', async () => {
    const { g, verify } = guard({});
    await expect(g.canActivate(ctx({}))).resolves.toBe(true);
    expect(verify).not.toHaveBeenCalled();
  });

  it('asks for the CAPTCHA when the token is missing or blank (400)', async () => {
    const { g } = guard({ HCAPTCHA_SECRET: 's' });
    for (const body of [
      undefined,
      {},
      { captchaToken: '' },
      { captchaToken: '  ' },
      { captchaToken: 42 },
    ]) {
      await expect(g.canActivate(ctx(body))).rejects.toThrow(CAPTCHA_REQUIRED);
    }
  });

  it('lets a request through when hCaptcha confirms the token', async () => {
    const { g, verify } = guard({ HCAPTCHA_SECRET: 'secret' });
    await expect(g.canActivate(ctx({ captchaToken: 'tok' }))).resolves.toBe(
      true,
    );
    expect(verify).toHaveBeenCalledWith('tok', 'secret', '203.0.113.9');
  });

  it('refuses a rejected token, and fails closed if hCaptcha is unreachable (400)', async () => {
    await expect(
      guard(
        { HCAPTCHA_SECRET: 's' },
        vi.fn().mockResolvedValue(false),
      ).g.canActivate(ctx({ captchaToken: 't' })),
    ).rejects.toThrow(CAPTCHA_FAILED);
    await expect(
      guard(
        { HCAPTCHA_SECRET: 's' },
        vi.fn().mockRejectedValue(new Error('timeout')),
      ).g.canActivate(ctx({ captchaToken: 't' })),
    ).rejects.toThrow(BadRequestException);
  });

  it('protects login and survey submission', () => {
    const reflector = new Reflector();
    expect(
      reflector.get(GUARDS_METADATA, AuthController.prototype.login),
    ).toContain(CaptchaGuard);
    expect(
      reflector.get(GUARDS_METADATA, ResponsesController.prototype.submit),
    ).toContain(CaptchaGuard);
  });
});

describe('verifyWithHCaptcha', () => {
  afterEach(() => vi.restoreAllMocks());

  const reply = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

  it('posts the secret, token and client IP to hCaptcha', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => reply(200, { success: true }));
    await expect(verifyWithHCaptcha('tok', 'sec', '1.2.3.4')).resolves.toBe(
      true,
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.hcaptcha.com/siteverify');
    expect(init?.method).toBe('POST');
    expect(String(init?.body)).toBe('secret=sec&response=tok&remoteip=1.2.3.4');
  });

  it('returns false for an unsuccessful check or an error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() =>
      reply(200, { success: false }),
    );
    await expect(verifyWithHCaptcha('t', 's')).resolves.toBe(false);
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => reply(500, {}));
    await expect(verifyWithHCaptcha('t', 's')).resolves.toBe(false);
  });
});
