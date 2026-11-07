import {
  CreateDateColumn,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../users/user.entity';
import { Answer } from './answer.entity';
import { Survey } from './survey.entity';

/** One submission of a survey. The individual answers live in the `answers` table. */
@Entity('responses')
export class SurveyResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  surveyId: number;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'surveyId' })
  survey: Relation<Survey>;

  /** Logged-in respondent, or null for anonymous responses. */
  @Column({ type: 'int', nullable: true })
  respondentId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'respondentId' })
  respondent: Relation<User> | null;

  @OneToMany(() => Answer, (answer) => answer.response)
  answers: Relation<Answer[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  submittedAt: Date;
}
