/**
 * TC-Sec-04 against the full app and a real Postgres database: SQL injection and
 * script payloads are rejected or stored as plain text, and the database is untouched.
 * Needs a database, so it only runs when SECURITY_DB_TEST=1 (uses the usual DB_* settings).
 *
 *   SECURITY_DB_TEST=1 npx vitest run src/security/security.db.spec.ts
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { configureApp } from '../app.setup';

const SQL = [
  "'; DROP TABLE surveys; --",
  "' OR '1'='1",
  '1); DELETE FROM users; --',
  '\' UNION SELECT "passwordHash" FROM users --',
];
const SCRIPT =
  '<img src=x onerror="alert(document.cookie)"><script>alert(1)</script>';

describe.skipIf(process.env.SECURITY_DB_TEST !== '1')(
  'TC-Sec-04 against Postgres',
  () => {
    let app: INestApplication;
    let ds: DataSource;
    let agent: ReturnType<typeof request.agent>;
    const email = `sec-${Date.now()}@x.com`;

    const tables = async () =>
      (
        await ds.query(
          `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`,
        )
      ).map((r: { tablename: string }) => r.tablename);

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = configureApp(moduleRef.createNestApplication());
      await app.init();
      ds = app.get(DataSource);
      agent = request.agent(app.getHttpServer());
      await agent
        .post('/auth/register')
        .send({ email, password: 'password123' })
        .expect(201);
      await agent
        .post('/auth/login')
        .send({ email, password: 'password123' })
        .expect(200);
    });

    afterAll(async () => {
      await ds?.query(`DELETE FROM users WHERE email = $1`, [email]);
      await app?.close();
    });

    it('stores SQL and script payloads as plain text and leaves the database intact', async () => {
      const before = await tables();
      const usersBefore = Number(
        (await ds.query(`SELECT COUNT(*) FROM users`))[0].count,
      );

      for (const payload of [...SQL, SCRIPT]) {
        const created = await agent
          .post('/surveys')
          .send({
            title: payload,
            description: payload,
            questions: [
              {
                text: payload,
                type: 'single',
                options: [payload, 'Safe'],
                mandatory: true,
              },
              { text: 'Comment', type: 'text' },
            ],
          })
          .expect(201);
        expect(created.body.title).toBe(payload);
        expect(created.body.questions[0].options[0]).toBe(payload);

        const id = created.body.id;
        const [q1, q2] = created.body.questions.map(
          (q: { id: number }) => q.id,
        );
        await agent.post(`/surveys/${id}/publish`).expect(200);
        await request(app.getHttpServer())
          .post(`/surveys/${id}/responses`)
          .send({ answers: { [q1]: payload, [q2]: payload } })
          .expect(201);

        const stored = await ds.query(
          `SELECT a.value #>> '{}' AS v FROM answers a JOIN responses r ON r.id = a."responseId"
         WHERE r."surveyId" = $1 ORDER BY a."questionId"`,
          [id],
        );
        expect(stored.map((r: { v: string }) => r.v)).toEqual([
          payload,
          payload,
        ]);

        const results = await agent.get(`/surveys/${id}/results`).expect(200);
        expect(results.headers['content-type']).toMatch(/^application\/json/);
        expect(results.body.title).toBe(payload);
        expect(results.body.questions[1].textAnswers).toEqual([payload]);
      }

      expect(await tables()).toEqual(before);
      expect(
        Number((await ds.query(`SELECT COUNT(*) FROM users`))[0].count),
      ).toBe(usersBefore);
    });

    it('does not log anyone in with SQL in the email or password', async () => {
      for (const payload of SQL) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: payload, password: payload });
        expect([400, 401]).toContain(res.status);
        expect(res.headers['set-cookie']).toBeUndefined();
      }
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: "' OR '1'='1" });
      expect(res.status).toBe(401);
    });

    it('rejects SQL in path parameters (400) and object operators in place of values', async () => {
      for (const id of ['1 OR 1=1', "1'; DROP TABLE surveys;--"]) {
        expect(
          (await agent.get(`/surveys/${encodeURIComponent(id)}`)).status,
        ).toBe(400);
        expect(
          (await agent.get(`/surveys/${encodeURIComponent(id)}/results`))
            .status,
        ).toBe(400);
      }
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: { $ne: null }, password: { $ne: null } });
      expect(res.status).toBe(400);
    });

    it('turns a NUL byte into clean text instead of a server error', async () => {
      const res = await agent
        .post('/surveys')
        .send({ title: 'Bad\u0000title' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Badtitle');
    });
  },
);
