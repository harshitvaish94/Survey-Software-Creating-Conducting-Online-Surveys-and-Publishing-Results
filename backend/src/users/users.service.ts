import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

/** Emails are compared trimmed and lower-cased everywhere. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email: normalizeEmail(email) } });
  }

  findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  create(email: string, passwordHash: string, role: UserRole): Promise<User> {
    return this.userRepository.save(
      this.userRepository.create({ email: normalizeEmail(email), passwordHash, role }),
    );
  }
}
