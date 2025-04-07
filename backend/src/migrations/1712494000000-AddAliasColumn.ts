import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAliasColumn1712494000000 implements MigrationInterface {
    name = 'AddAliasColumn1712494000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" ADD COLUMN IF NOT EXISTS "alias" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" DROP COLUMN "alias"`);
    }
} 