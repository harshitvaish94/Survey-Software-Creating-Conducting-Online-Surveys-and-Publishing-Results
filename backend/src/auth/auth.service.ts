import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import nodemailer from 'nodemailer';
import { User, UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import type { AuthUser, JwtPayload } from './auth.constants';
import { LoginDto, RegisterDto } from './auth.dto';

const INVALID_LOGIN = 'Invalid email or password.';
const RESET_MESSAGE =
  'If an account exists with this email, a password reset link has been sent.';

const isUniqueViolation = (err: unknown) =>
  typeof err === 'object' &&
  err !== null &&
  (err as { code?: string }).code === '23505';

export const toAuthUser = (
  user: Pick<User, 'id' | 'email' | 'role'>,
): AuthUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
});

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthUser> {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      const user = await this.users.create(
        dto.email,
        passwordHash,
        dto.role ?? UserRole.CREATOR,
      );
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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.users.findByEmail(email);

    if (!user) {
      return { message: RESET_MESSAGE };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.users.createResetToken(user.id, tokenHash, expiresAt);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT || 1025),
      secure: false,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || 'no-reply@survey.local',
        to: user.email,
        subject: 'Reset your Survey Software password',
        text: `Use this link to reset your password. It expires in 30 minutes:\n\n${resetUrl}`,
        html: `
          <h2>Password reset request</h2>
          <p>Click the link below to reset your password. It expires in 30 minutes.</p>
          <a href="${resetUrl}">Reset password</a>
        `,
      });
    } catch (error) {
      this.logger.error('Failed to send password reset email', error);
      throw new BadRequestException('Unable to send password reset email.');
    }

    return { message: RESET_MESSAGE };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const resetToken = await this.users.findValidResetToken(tokenHash);

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired password reset link.');
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });

    const consumed = await this.users.consumeResetToken(resetToken.id);

    if (!consumed) {
      throw new BadRequestException('This password reset link has already been used.');
    }

    await this.users.updatePasswordHash(resetToken.userId, passwordHash);
    await this.users.invalidateUserResetTokens(resetToken.userId);

    return { message: 'Password has been reset successfully.' };
  }

  async me(id: number): Promise<AuthUser> {
    const user = await this.users.findById(id);

    if (!user) {
      throw new UnauthorizedException('Your session has expired. Please log in again.');
    }

    return toAuthUser(user);
  }

  sign(user: AuthUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwt.signAsync(payload);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= argon2.hash('not-a-real-password', {
      type: argon2.argon2id,
    });

    return this.dummyHash;
  }
}