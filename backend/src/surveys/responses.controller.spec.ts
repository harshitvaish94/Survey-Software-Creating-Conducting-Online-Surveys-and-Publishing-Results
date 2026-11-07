import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from '../auth/access.decorators';
import { UserRole } from '../users/user.entity';
import {
  RESPONDENT_COOKIE,
  ResponsesController,
  respondentToken,
} from './responses.controller';

const TOKEN = '3f2b8c1e-9d4a-4b6f-8e2a-1c5d7f9a0b3e';

describe('ResponsesController', () => {
  const setup = () => {
    const service = { submit: vi.fn().mockResolvedValue({ id: 1 }) };
    const res = { cookie: vi.fn() };
    return {
      service,
      res,
      controller: new ResponsesController(service as any),
    };
  };
  const dto = { answers: { 1: 'A' } };

  it('is public so respondents can answer without an account', () => {
    expect(new Reflector().get(IS_PUBLIC_KEY, ResponsesController)).toBe(true);
  });

  it('submits anonymously with the browser token when nobody is logged in', async () => {
    const { controller, service, res } = setup();
    const req = { cookies: { [RESPONDENT_COOKIE]: TOKEN } };
    await expect(
      controller.submit(7, dto, req as any, res as any),
    ).resolves.toEqual({ id: 1 });
    expect(service.submit).toHaveBeenCalledWith(7, dto, null, TOKEN);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('records the logged-in respondent and needs no browser token', async () => {
    const { controller, service, res } = setup();
    const user = { id: 5, email: 'r@x.com', role: UserRole.RESPONDENT };
    await controller.submit(7, dto, { cookies: {} } as any, res as any, user);
    expect(service.submit).toHaveBeenCalledWith(7, dto, 5, null);
    expect(res.cookie).not.toHaveBeenCalled();
  });
});

describe('respondentToken (SMS-27)', () => {
  it('reuses a valid token from the cookie', () => {
    const res = { cookie: vi.fn() };
    expect(
      respondentToken(
        { cookies: { [RESPONDENT_COOKIE]: TOKEN } } as any,
        res as any,
      ),
    ).toBe(TOKEN);
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it.each([
    ['no cookies at all', undefined],
    ['no respondent cookie', {}],
    ['a tampered value', { [RESPONDENT_COOKIE]: 'not-a-uuid' }],
  ])('issues a new HTTP-only token when there is %s', (_label, cookies) => {
    const res = { cookie: vi.fn() };
    const token = respondentToken({ cookies } as any, res as any);
    expect(token).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.cookie).toHaveBeenCalledWith(
      RESPONDENT_COOKIE,
      token,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60 * 1000,
      }),
    );
  });
});
