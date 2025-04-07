import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCategoryColumn1712493789123 implements MigrationInterface {
    name = 'AddCategoryColumn1712493789123'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" ADD COLUMN "category" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" DROP COLUMN "category"`);
    }
} 