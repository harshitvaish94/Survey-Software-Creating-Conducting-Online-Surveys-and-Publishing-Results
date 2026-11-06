import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Survey } from './survey.entity';

/**
 * Records who has already submitted a survey so duplicates can be refused (used by SMS-27).
 * `fingerprint` is a hash of the respondent's user id, or of a browser token for anonymous surveys.
 */
@Entity('submission_guard')
@Unique('UQ_submission_guard_survey_fingerprint', ['surveyId', 'fingerprint'])
export class SubmissionGuard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  surveyId: number;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'surveyId' })
  survey: Relation<Survey>;

  @Column({ type: 'varchar', length: 128 })
  fingerprint: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
