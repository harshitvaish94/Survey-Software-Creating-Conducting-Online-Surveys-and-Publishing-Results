import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import { Answer } from '../surveys/answer.entity';
import { Question } from '../surveys/question.entity';
import { SurveyResponse } from '../surveys/response.entity';
import { SubmissionGuard } from '../surveys/submission-guard.entity';
import { Survey } from '../surveys/survey.entity';
import { ResetToken } from '../users/reset-token.entity';
import { User } from '../users/user.entity';

export const entities = [
  User,
  ResetToken,
  Survey,
  Question,
  SurveyResponse,
  Answer,
  SubmissionGuard,
];

/**
 * Single source of truth for the database connection, shared by the Nest app
 * and the TypeORM CLI (`npm run migration:*`). The schema is owned by migrations:
 * `synchronize` is off so the app never alters tables on its own.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'sms',
  password: process.env.DB_PASSWORD || 'sms_password',
  database: process.env.DB_NAME || 'sms_db',
  entities,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
};

export default new DataSource(dataSourceOptions);
