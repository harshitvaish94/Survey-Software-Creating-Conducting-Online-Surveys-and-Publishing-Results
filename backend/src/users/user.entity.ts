import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** SRS roles. Creators build surveys, respondents answer them, administrators manage everything. */
export enum UserRole {
  CREATOR = 'Creator',
  RESPONDENT = 'Respondent',
  ADMIN = 'Administrator',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  /** Stored lower-cased and trimmed so logins are case-insensitive. */
  @Column({ type: 'varchar', length: 254, unique: true })
  email: string;

  /** Argon2id hash. Never returned by the API. */
  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: UserRole.CREATOR })
  role: UserRole;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
