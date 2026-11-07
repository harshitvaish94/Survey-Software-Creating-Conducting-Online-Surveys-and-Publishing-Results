import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { User, UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import type { AuthUser, JwtPayload } from './auth.constants';
import { LoginDto, RegisterDto } from './auth.dto';

const INVALID_LOGIN = 'Invalid email or password.';

/** Postgres unique_violation, raised if two registrations for one email race. */
const isUniqueViolation = (err: unknown) =>
  typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';

export const toAuthUser = (user: Pick<User, 'id' | 'email' | 'role'>): AuthUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

@Injectable()
export class AuthService {
  /** Verified against when the email is unknown, so both failure paths take the same time. */
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthUser> {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists.');
    }
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    try {
      const user = await this.users.create(dto.email, passwordHash, dto.role ?? UserRole.CREATOR);
      return toAuthUser(user);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('An account with this email already exists.');
      }
      throw err;
    }
  }

  async login(dto: LoginDto): Promise<{ user: AuthUser; token: string }> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      await argon2.verify(await this.getDummyHash(), dto.password);
      throw new UnauthorizedException(INVALID_LOGIN);
    }
    if (!(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException(INVALID_LOGIN);
    }
    const authUser = toAuthUser(user);
    return { user: authUser, token: await this.sign(authUser) };
  }

  /** Looks the user up again so a deleted account or changed role takes effect immediately. */
  async me(id: number): Promise<AuthUser> {
    const user = await this.users.findById(id);
    if (!user) throw new UnauthorizedException('Your session has expired. Please log in again.');
    return toAuthUser(user);
  }

  sign(user: AuthUser): Promise<string> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return this.jwt.signAsync(payload);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= argon2.hash('not-a-real-password', { type: argon2.argon2id });
    return this.dummyHash;
  }
}
