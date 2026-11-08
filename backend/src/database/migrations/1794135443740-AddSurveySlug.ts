import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSurveySlug1794135443740 implements MigrationInterface {
  name = 'AddSurveySlug1794135443740';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "surveys"
            ADD "slug" character varying(32)
        `);
    await queryRunner.query(`
            ALTER TABLE "surveys"
            ADD CONSTRAINT "UQ_42b5dfa7d59712d8daff918f68a" UNIQUE ("slug")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "surveys" DROP CONSTRAINT "UQ_42b5dfa7d59712d8daff918f68a"
        `);
    await queryRunner.query(`
            ALTER TABLE "surveys" DROP COLUMN "slug"
        `);
  }
}
