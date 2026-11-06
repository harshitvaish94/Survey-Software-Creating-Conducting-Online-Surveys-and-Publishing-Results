import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import type { AnswerValue } from './answer-validation';
import { Question } from './question.entity';
import { SurveyResponse } from './response.entity';

/** One respondent's answer to one question. Unanswered optional questions have no row. */
@Entity('answers')
@Index(['responseId', 'questionId'], { unique: true })
export class Answer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  responseId: number;

  @ManyToOne(() => SurveyResponse, (response) => response.answers, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'responseId' })
  response: Relation<SurveyResponse>;

  @Index()
  @Column({ type: 'int' })
  questionId: number;

  @ManyToOne(() => Question, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'questionId' })
  question: Relation<Question>;

  /** Text, chosen option, list of options, or a rating number, depending on question type. */
  @Column({ type: 'jsonb' })
  value: AnswerValue;
}
