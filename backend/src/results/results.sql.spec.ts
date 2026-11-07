/**
 * TC-Res-01 against a real Postgres database: the SQL aggregation must give the
 * hand-calculated reference results. Needs a database, so it only runs when
 * RESULTS_DB_TEST=1 (uses the usual DB_* settings; tables are created by the migrations).
 *
 *   RESULTS_DB_TEST=1 npx vitest run src/results/results.sql.spec.ts
 */
import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dataSourceOptions } from '../database/data-source';
import { ResponsesService } from '../surveys/responses.service';
import { Survey } from '../surveys/survey.entity';
import { SurveysService } from '../surveys/surveys.service';
import {
  expectedResults,
  referenceResponses,
  referenceSurvey,
} from '../testing/results-reference';
import { User, UserRole } from '../users/user.entity';
import { ResultsService } from './results.service';

describe.skipIf(process.env.RESULTS_DB_TEST !== '1')(
  'Results SQL against Postgres (TC-Res-01)',
  () => {
    let ds: DataSource;
    let results: ResultsService;
    let surveyId: number;
    let ids: number[];
    let owner: { id: number; email: string; role: UserRole };

    beforeAll(async () => {
      ds = await new DataSource(dataSourceOptions).initialize();
      await ds.runMigrations();
      const surveys = new SurveysService(ds.getRepository(Survey), ds);
      const responses = new ResponsesService(ds.getRepository(Survey), ds);
      results = new ResultsService(surveys, ds);

      const stamp = Date.now();
      const user = await ds
        .getRepository(User)
        .save({
          email: `results-${stamp}@x.com`,
          passwordHash: 'x',
          role: UserRole.CREATOR,
        });
      owner = { id: user.id, email: user.email, role: user.role };

      const make = async (title: string) => {
        const s = await surveys.create(
          { ...referenceSurvey, title } as any,
          user.id,
        );
        await surveys.publish(s.id);
        return surveys.findOne(s.id);
      };
      const reference = await make(referenceSurvey.title);
      surveyId = reference.id;
      ids = reference.questions.map((q) => q.id);

      for (const answers of referenceResponses) {
        const byId = Object.fromEntries(
          Object.entries(answers).map(([i, v]) => [ids[Number(i)], v]),
        );
        await responses.submit(surveyId, { answers: byId } as any);
      }

      // Noise: another survey's responses must not leak into these results.
      const other = await make('Other survey');
      const o = other.questions.map((q) => q.id);
      await responses.submit(other.id, {
        answers: { [o[0]]: 1, [o[1]]: 'Assignments' },
      } as any);
    });

    afterAll(async () => {
      if (ds?.isInitialized) {
        await ds.query(`DELETE FROM users WHERE id = $1`, [owner.id]);
        await ds.destroy();
      }
    });

    it('matches the hand-calculated reference results exactly', async () => {
      expect(await results.getResults(surveyId, owner)).toEqual(
        expectedResults(surveyId, ids),
      );
    });

    it('refuses another creator (403)', async () => {
      await expect(
        results.getResults(surveyId, {
          id: owner.id + 100000,
          email: 'x@x.com',
          role: UserRole.CREATOR,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  },
);
