import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
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

  /** Unguessable public identifier for the shareable link; set on publish. */
  @Column({ type: 'varchar', length: 32, unique: true, nullable: true })
  slug: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Question, (question) => question.survey)
  questions: Relation<Question[]>;
}
