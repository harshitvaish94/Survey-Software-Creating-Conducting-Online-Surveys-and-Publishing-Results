import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllowMultipleResponses1793988011561 implements MigrationInterface {
  name = 'AddAllowMultipleResponses1793988011561';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "surveys"
            ADD "allowMultipleResponses" boolean NOT NULL DEFAULT false
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "surveys" DROP COLUMN "allowMultipleResponses"
        `);
  }
}
