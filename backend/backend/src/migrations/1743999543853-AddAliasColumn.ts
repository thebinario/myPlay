import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAliasColumn1743999543853 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" ADD "alias" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "video" DROP COLUMN "alias"`);
    }

}
