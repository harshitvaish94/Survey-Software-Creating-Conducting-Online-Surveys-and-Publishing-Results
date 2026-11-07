import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/user.entity';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/**
 * Every route needs a logged-in user unless it is marked @Public().
 * On a public route the user is still attached when a valid session cookie is sent.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Only users with one of these roles may call the route (otherwise 403). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
