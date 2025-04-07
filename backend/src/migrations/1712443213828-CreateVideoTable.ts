import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVideoTable1712443213828 implements MigrationInterface {
    name = 'CreateVideoTable1712443213828'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "video" (
            "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "title" character varying NOT NULL,
            "filePath" character varying NOT NULL,
            "fileSize" bigint,
            "duration" integer,
            "lastPosition" integer,
            "isTranscoded" boolean NOT NULL DEFAULT false,
            "transcodedFilePath" character varying,
            "transcodingProgress" double precision NOT NULL DEFAULT '0',
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
        )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "video"`);
    }
} 