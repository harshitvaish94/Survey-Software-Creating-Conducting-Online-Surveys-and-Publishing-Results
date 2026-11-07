import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from '../testing/fake-db';
import { UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

// TC-Auth-01: registration creates an account, login starts a session, bad input is rejected.
describe('AuthService', () => {
  let db: FakeDb;
  let users: UsersService;
  let jwt: JwtService;
  let auth: AuthService;

  beforeEach(() => {
    db = new FakeDb();
    users = new UsersService(db.users as any);
    jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: 60 } });
    auth = new AuthService(users, jwt);
  });

  describe('register', () => {
    it('creates a Creator by default and stores an Argon2id hash, not the password', async () => {
      const user = await auth.register({ email: '  New@Example.COM ', password: 'longenough1' });
      expect(user).toEqual({ id: 1, email: 'new@example.com', role: UserRole.CREATOR });
      const stored = db.users.rows[0];
      expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
      expect(stored.passwordHash).not.toContain('longenough1');
      expect(await argon2.verify(stored.passwordHash, 'longenough1')).toBe(true);
    });

    it('lets a person register as a Respondent', async () => {
      const user = await auth.register({
        email: 'r@example.com',
        password: 'longenough1',
        role: UserRole.RESPONDENT,
      });
      expect(user.role).toBe(UserRole.RESPONDENT);
    });

    it('never returns the password hash', async () => {
      const user = await auth.register({ email: 'a@example.com', password: 'longenough1' });
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('rejects a second account for the same email, ignoring case (409)', async () => {
      await auth.register({ email: 'dup@example.com', password: 'longenough1' });
      await expect(
        auth.register({ email: 'DUP@example.com', password: 'otherpass1' }),
      ).rejects.toThrow(ConflictException);
      expect(db.users.rows).toHaveLength(1);
    });

    it('turns a database unique violation from a race into 409', async () => {
      vi.spyOn(users, 'create').mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505' }));
      await expect(
        auth.register({ email: 'race@example.com', password: 'longenough1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows other database errors', async () => {
      vi.spyOn(users, 'create').mockRejectedValueOnce(new Error('db down'));
      await expect(
        auth.register({ email: 'x@example.com', password: 'longenough1' }),
      ).rejects.toThrow('db down');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await auth.register({ email: 'me@example.com', password: 'correct-horse' });
    });

    it('returns the user and a signed JWT for valid credentials', async () => {
      const { user, token } = await auth.login({ email: 'ME@example.com', password: 'correct-horse' });
      expect(user).toEqual({ id: 1, email: 'me@example.com', role: UserRole.CREATOR });
      const payload = await jwt.verifyAsync(token);
      expect(payload).toMatchObject({ sub: 1, email: 'me@example.com', role: UserRole.CREATOR });
    });

    it('rejects a wrong password with a generic message (401)', async () => {
      await expect(auth.login({ email: 'me@example.com', password: 'wrong-pass' })).rejects.toMatchObject({
        status: 401,
        message: 'Invalid email or password.',
      });
    });

    it('rejects an unknown email with the same generic message (401)', async () => {
      await expect(
        auth.login({ email: 'nobody@example.com', password: 'whatever1' }),
      ).rejects.toMatchObject({ status: 401, message: 'Invalid email or password.' });
    });
  });

  describe('me', () => {
    it('returns the current user from the database', async () => {
      await auth.register({ email: 'me@example.com', password: 'correct-horse' });
      await expect(auth.me(1)).resolves.toEqual({
        id: 1,
        email: 'me@example.com',
        role: UserRole.CREATOR,
      });
    });

    it('rejects a session whose user no longer exists', async () => {
      await expect(auth.me(99)).rejects.toThrow(UnauthorizedException);
    });
  });
});
