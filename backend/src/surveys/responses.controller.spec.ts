import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { IS_PUBLIC_KEY } from '../auth/access.decorators';
import { UserRole } from '../users/user.entity';
import { ResponsesController } from './responses.controller';

describe('ResponsesController', () => {
  const setup = () => {
    const service = { submit: vi.fn().mockResolvedValue({ id: 1 }) };
    return { service, controller: new ResponsesController(service as any) };
  };
  const dto = { answers: { 1: 'A' } };

  it('is public so respondents can answer without an account', () => {
    expect(new Reflector().get(IS_PUBLIC_KEY, ResponsesController)).toBe(true);
  });

  it('submits anonymously when nobody is logged in', async () => {
    const { controller, service } = setup();
    await expect(controller.submit(7, dto)).resolves.toEqual({ id: 1 });
    expect(service.submit).toHaveBeenCalledWith(7, dto, null);
  });

  it('records the logged-in respondent', async () => {
    const { controller, service } = setup();
    await controller.submit(7, dto, {
      id: 5,
      email: 'r@x.com',
      role: UserRole.RESPONDENT,
    });
    expect(service.submit).toHaveBeenCalledWith(7, dto, 5);
  });
});
