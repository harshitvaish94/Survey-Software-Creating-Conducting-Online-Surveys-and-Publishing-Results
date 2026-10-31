import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { AnswerValue } from './answer-validation';
import { Survey } from './survey.entity';

@Entity('survey_responses')
export class SurveyResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  surveyId: number;

  @ManyToOne(() => Survey, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'surveyId' })
  survey: Relation<Survey>;

  /** Answers keyed by question id. Unanswered optional questions are omitted. */
  @Column({ type: 'jsonb' })
  answers: Record<string, AnswerValue>;

  @CreateDateColumn()
  submittedAt: Date;
}
