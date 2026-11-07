import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1793935614172 implements MigrationInterface {
  name = 'InitialSchema1793935614172';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "email" character varying(254) NOT NULL,
                "passwordHash" character varying(255) NOT NULL,
                "role" character varying(20) NOT NULL DEFAULT 'Creator',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "surveys" (
                "id" SERIAL NOT NULL,
                "title" character varying(200) NOT NULL,
                "description" text,
                "openDate" date,
                "closeDate" date,
                "status" character varying(20) NOT NULL DEFAULT 'Draft',
                "ownerId" integer,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1b5e3d4aaeb2321ffa98498c971" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_5d114a85e19ca1819c2d09c77c" ON "surveys" ("ownerId")
        `);
    await queryRunner.query(`
            CREATE TABLE "questions" (
                "id" SERIAL NOT NULL,
                "surveyId" integer NOT NULL,
                "position" integer NOT NULL,
                "text" character varying(500) NOT NULL,
                "type" character varying(20) NOT NULL,
                "options" jsonb,
                "ratingMin" integer,
                "ratingMax" integer,
                "mandatory" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_08a6d4b0f49ff300bf3a0ca60ac" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_8eee23e5ccebd4025ecaccda1b" ON "questions" ("surveyId")
        `);
    await queryRunner.query(`
            CREATE TABLE "responses" (
                "id" SERIAL NOT NULL,
                "surveyId" integer NOT NULL,
                "respondentId" integer,
                "submittedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_be3bdac59bd243dff421ad7bf70" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_aa6060c97a299a9d07c658092d" ON "responses" ("surveyId")
        `);
    await queryRunner.query(`
            CREATE TABLE "answers" (
                "id" SERIAL NOT NULL,
                "responseId" integer NOT NULL,
                "questionId" integer NOT NULL,
                "value" jsonb NOT NULL,
                CONSTRAINT "PK_9c32cec6c71e06da0254f2226c6" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_c38697a57844f52584abdb878d" ON "answers" ("questionId")
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_cf94371955da424e7831c1cecd" ON "answers" ("responseId", "questionId")
        `);
    await queryRunner.query(`
            CREATE TABLE "submission_guard" (
                "id" SERIAL NOT NULL,
                "surveyId" integer NOT NULL,
                "fingerprint" character varying(128) NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_submission_guard_survey_fingerprint" UNIQUE ("surveyId", "fingerprint"),
                CONSTRAINT "PK_43a57764e11134beab8a7f2b1d1" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "reset_tokens" (
                "id" SERIAL NOT NULL,
                "userId" integer NOT NULL,
                "tokenHash" character varying(128) NOT NULL,
                "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "usedAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_9c768e2abf8c3abd589b1abc8ff" UNIQUE ("tokenHash"),
                CONSTRAINT "PK_acd6ec48b54150b1736d0b454b9" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_69015e2482e433b6d218ad0faf" ON "reset_tokens" ("userId")
        `);
    await queryRunner.query(`
            ALTER TABLE "surveys"
            ADD CONSTRAINT "FK_5d114a85e19ca1819c2d09c77c3" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "questions"
            ADD CONSTRAINT "FK_8eee23e5ccebd4025ecaccda1b2" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "responses"
            ADD CONSTRAINT "FK_aa6060c97a299a9d07c658092da" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "responses"
            ADD CONSTRAINT "FK_b262823529525d2e3d85438fe9f" FOREIGN KEY ("respondentId") REFERENCES "users"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "answers"
            ADD CONSTRAINT "FK_7740f7edbfa151044d12ee85862" FOREIGN KEY ("responseId") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "answers"
            ADD CONSTRAINT "FK_c38697a57844f52584abdb878d7" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "submission_guard"
            ADD CONSTRAINT "FK_b177b23f6d088f0ba19d9512265" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "reset_tokens"
            ADD CONSTRAINT "FK_69015e2482e433b6d218ad0faf6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "reset_tokens" DROP CONSTRAINT "FK_69015e2482e433b6d218ad0faf6"
        `);
    await queryRunner.query(`
            ALTER TABLE "submission_guard" DROP CONSTRAINT "FK_b177b23f6d088f0ba19d9512265"
        `);
    await queryRunner.query(`
            ALTER TABLE "answers" DROP CONSTRAINT "FK_c38697a57844f52584abdb878d7"
        `);
    await queryRunner.query(`
            ALTER TABLE "answers" DROP CONSTRAINT "FK_7740f7edbfa151044d12ee85862"
        `);
    await queryRunner.query(`
            ALTER TABLE "responses" DROP CONSTRAINT "FK_b262823529525d2e3d85438fe9f"
        `);
    await queryRunner.query(`
            ALTER TABLE "responses" DROP CONSTRAINT "FK_aa6060c97a299a9d07c658092da"
        `);
    await queryRunner.query(`
            ALTER TABLE "questions" DROP CONSTRAINT "FK_8eee23e5ccebd4025ecaccda1b2"
        `);
    await queryRunner.query(`
            ALTER TABLE "surveys" DROP CONSTRAINT "FK_5d114a85e19ca1819c2d09c77c3"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_69015e2482e433b6d218ad0faf"
        `);
    await queryRunner.query(`
            DROP TABLE "reset_tokens"
        `);
    await queryRunner.query(`
            DROP TABLE "submission_guard"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_cf94371955da424e7831c1cecd"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_c38697a57844f52584abdb878d"
        `);
    await queryRunner.query(`
            DROP TABLE "answers"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_aa6060c97a299a9d07c658092d"
        `);
    await queryRunner.query(`
            DROP TABLE "responses"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_8eee23e5ccebd4025ecaccda1b"
        `);
    await queryRunner.query(`
            DROP TABLE "questions"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_5d114a85e19ca1819c2d09c77c"
        `);
    await queryRunner.query(`
            DROP TABLE "surveys"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
  }
}
