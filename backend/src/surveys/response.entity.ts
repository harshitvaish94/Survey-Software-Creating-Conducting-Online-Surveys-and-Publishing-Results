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
import { Answer } from './answer.entity';
import { Survey } from './survey.entity';

/** One anonymous submission of a survey. Individual answers live in the answers table. */
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

  @OneToMany(() => Answer, (answer) => answer.response)
  answers: Relation<Answer[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  submittedAt: Date;
}