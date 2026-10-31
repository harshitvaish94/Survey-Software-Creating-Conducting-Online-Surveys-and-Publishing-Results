import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Survey } from './survey.entity';

export enum QuestionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  TEXT = 'text',
  RATING = 'rating',
  DROPDOWN = 'dropdown',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  surveyId: number;

  @ManyToOne(() => Survey, (survey) => survey.questions, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'surveyId' })
  survey: Relation<Survey>;

  /** Zero-based display order inside the survey. */
  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 500 })
  text: string;

  @Column({ type: 'varchar', length: 20 })
  type: QuestionType;

  /** Answer options for single / multiple / dropdown questions, otherwise null. */
  @Column({ type: 'jsonb', nullable: true })
  options: string[] | null;

  /** Rating scale bounds, only set for rating questions. */
  @Column({ type: 'int', nullable: true })
  ratingMin: number | null;

  @Column({ type: 'int', nullable: true })
  ratingMax: number | null;
}
