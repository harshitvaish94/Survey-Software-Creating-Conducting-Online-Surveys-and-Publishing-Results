import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../users/user.entity';
import { Question } from './question.entity';

export enum SurveyStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
  CLOSED = 'Closed',
}

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'date', nullable: true })
  openDate: string | null;

  @Column({ type: 'date', nullable: true })
  closeDate: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: SurveyStatus.DRAFT,
  })
  status: SurveyStatus;

  /** Creator who owns the survey. Only the owner (or an administrator) may manage it. */
  @Index()
  @Column({ type: 'int', nullable: true })
  ownerId: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<User> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Question, (question) => question.survey)
  questions: Relation<Question[]>;
}
