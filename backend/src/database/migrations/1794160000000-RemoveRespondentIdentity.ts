import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRespondentIdentity1794160000000
  implements MigrationInterface
{
  name = 'RemoveRespondentIdentity1794160000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "responses"
      DROP CONSTRAINT IF EXISTS "FK_b262823529525d2e3d85438fe9f"
    `);

    await queryRunner.query(`
      ALTER TABLE "responses"
      DROP COLUMN IF EXISTS "respondentId"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "responses"
      ADD "respondentId" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "responses"
      ADD CONSTRAINT "FK_b262823529525d2e3d85438fe9f"
      FOREIGN KEY ("respondentId")
      REFERENCES "users"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION
    `);
  }
}