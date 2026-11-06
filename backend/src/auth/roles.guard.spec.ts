import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { assertCanManage, canManage } from './ownership';
import { UserRole } from '../users/user.entity';
import { Public, Roles } from './access.decorators';
import { RolesGuard } from './roles.guard';

@Roles(UserRole.CREATOR, UserRole.ADMIN)
@Controller()
class CreatorsOnly {
  @Get() manage() {}
  @Public() @Get('open') open() {}
  @Roles(UserRole.ADMIN) @Get('admin') adminOnly() {}
}

@Controller()
class NoRoles {
  @Get() any() {}
}

function ctx(cls: any, handler: string, user?: { id: number; role: UserRole }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: user && { ...user, email: 'u@x.com' } }),
    }),
    getHandler: () => cls.prototype[handler],
    getClass: () => cls,
  } as any;
}

const creator = { id: 1, role: UserRole.CREATOR };
const respondent = { id: 2, role: UserRole.RESPONDENT };
const admin = { id: 3, role: UserRole.ADMIN };

// TC-Auth-02 / TC-Sec-03: an unauthorised role gets 403.
describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('lets an allowed role through', () => {
    expect(guard.canActivate(ctx(CreatorsOnly, 'manage', creator))).toBe(true);
    expect(guard.canActivate(ctx(CreatorsOnly, 'manage', admin))).toBe(true);
  });

  it('refuses a Respondent on a creator route (403)', () => {
    expect(() =>
      guard.canActivate(ctx(CreatorsOnly, 'manage', respondent)),
    ).toThrow(ForbiddenException);
  });

  it('refuses when there is no user (403)', () => {
    expect(() => guard.canActivate(ctx(CreatorsOnly, 'manage'))).toThrow(
      ForbiddenException,
    );
  });

  it('lets a method narrow the class roles', () => {
    expect(() =>
      guard.canActivate(ctx(CreatorsOnly, 'adminOnly', creator)),
    ).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx(CreatorsOnly, 'adminOnly', admin))).toBe(true);
  });

  it('skips role checks on public routes and routes without @Roles', () => {
    expect(guard.canActivate(ctx(CreatorsOnly, 'open'))).toBe(true);
    expect(guard.canActivate(ctx(NoRoles, 'any', respondent))).toBe(true);
  });
});

describe('ownership', () => {
  it('owners and administrators may manage; others may not', () => {
    const owner = { id: 1, email: 'o@x.com', role: UserRole.CREATOR };
    const other = { id: 2, email: 'x@x.com', role: UserRole.CREATOR };
    const boss = { id: 3, email: 'a@x.com', role: UserRole.ADMIN };
    expect(canManage(1, owner)).toBe(true);
    expect(canManage(1, boss)).toBe(true);
    expect(canManage(null, boss)).toBe(true);
    expect(canManage(1, other)).toBe(false);
    expect(canManage(null, owner)).toBe(false);
    expect(canManage(1, undefined)).toBe(false);
  });

  it('throws 401 without a user and 403 for a non-owner', () => {
    expect(() => assertCanManage(1, undefined)).toThrow(
      'Please log in to continue.',
    );
    expect(() =>
      assertCanManage(1, { id: 2, email: 'x@x.com', role: UserRole.CREATOR }),
    ).toThrow('You can only manage your own surveys.');
    expect(() =>
      assertCanManage(1, { id: 1, email: 'o@x.com', role: UserRole.CREATOR }),
    ).not.toThrow();
  });
});
