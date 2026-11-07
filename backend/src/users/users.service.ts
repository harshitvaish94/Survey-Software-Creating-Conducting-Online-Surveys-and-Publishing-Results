import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, IsNull, Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import { ResetToken } from './reset-token.entity';

export const normalizeEmail = (email: string) =>
  email.trim().toLowerCase();

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @Optional()
    @InjectRepository(ResetToken)
    private readonly resetTokenRepository?: Repository<ResetToken>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: normalizeEmail(email) },
    });
  }

  findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  create(
    email: string,
    passwordHash: string,
    role: UserRole,
  ): Promise<User> {
    return this.userRepository.save(
      this.userRepository.create({
        email: normalizeEmail(email),
        passwordHash,
        role,
      }),
    );
  }

  async updatePasswordHash(
    userId: number,
    passwordHash: string,
  ): Promise<void> {
    await this.userRepository.update(userId, { passwordHash });
  }

  async createResetToken(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    if (!this.resetTokenRepository) {
      throw new Error('Reset token repository is unavailable.');
    }

    // Invalidate previously issued, unused tokens.
    await this.resetTokenRepository.update(
      { userId, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const token = this.resetTokenRepository.create({
      userId,
      tokenHash,
      expiresAt,
      usedAt: null,
    });

    await this.resetTokenRepository.save(token);
  }

  async findValidResetToken(
    tokenHash: string,
  ): Promise<ResetToken | null> {
    if (!this.resetTokenRepository) {
      throw new Error('Reset token repository is unavailable.');
    }

    return this.resetTokenRepository.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });
  }

  async consumeResetToken(id: number): Promise<boolean> {
    if (!this.resetTokenRepository) {
      throw new Error('Reset token repository is unavailable.');
    }

    const result = await this.resetTokenRepository.update(
      {
        id,
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      { usedAt: new Date() },
    );

    return (result.affected ?? 0) === 1;
  }

  async invalidateUserResetTokens(userId: number): Promise<void> {
    if (!this.resetTokenRepository) {
      throw new Error('Reset token repository is unavailable.');
    }

    await this.resetTokenRepository.update(
      { userId, usedAt: IsNull() },
      { usedAt: new Date() },
    );
  }
}
