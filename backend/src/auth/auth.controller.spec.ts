import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../users/user.entity';
import { SESSION_COOKIE } from './auth.constants';
import { AuthController } from './auth.controller';

const user = { id: 1, email: 'me@example.com', role: UserRole.CREATOR };

function setup() {
  const service = {
    register: vi.fn().mockResolvedValue(user),
    login: vi.fn().mockResolvedValue({ user, token: 'jwt-token' }),
    me: vi.fn().mockResolvedValue(user),
  };
  const res = { cookie: vi.fn(), clearCookie: vi.fn() };
  return { service, res, controller: new AuthController(service as any) };
}

describe('AuthController', () => {
  it('registers without starting a session', async () => {
    const { controller, service } = setup();
    const dto = { email: 'me@example.com', password: 'longenough1' };
    await expect(controller.register(dto)).resolves.toEqual(user);
    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('puts the JWT in an HTTP-only cookie on login and keeps it out of the body', async () => {
    const { controller, res } = setup();
    const body = await controller.login({ email: 'me@example.com', password: 'x' }, res as any);
    expect(body).toEqual(user);
    expect(body).not.toHaveProperty('token');
    expect(res.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      'jwt-token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
  });

  it('clears the cookie on logout', () => {
    const { controller, res } = setup();
    controller.logout(res as any);
    expect(res.clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
    expect(res.clearCookie.mock.calls[0][1]).not.toHaveProperty('maxAge');
  });

  it('returns the current user', async () => {
    const { controller, service } = setup();
    await expect(controller.me(user)).resolves.toEqual(user);
    expect(service.me).toHaveBeenCalledWith(1);
  });
});
