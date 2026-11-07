import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../users/user.entity';
import type { AuthUser } from './auth.constants';

/** Administrators may manage anything; everyone else only what they own. */
export function canManage(
  ownerId: number | null,
  user: AuthUser | undefined,
): boolean {
  if (!user) return false;
  return (
    user.role === UserRole.ADMIN || (ownerId !== null && ownerId === user.id)
  );
}

/** 401 when nobody is logged in, 403 when someone else's resource is requested. */
export function assertCanManage(
  ownerId: number | null,
  user: AuthUser | undefined,
): void {
  if (!user) throw new UnauthorizedException('Please log in to continue.');
  if (!canManage(ownerId, user)) {
    throw new ForbiddenException('You can only manage your own surveys.');
  }
}
