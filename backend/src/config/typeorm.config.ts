import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Video } from '../video/entities/video.entity';
import { CreateVideoTable1712443213828 } from '../migrations/1712443213828-CreateVideoTable';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'video_server',
  entities: [Video],
  migrations: [CreateVideoTable1712443213828],
  synchronize: false,
  migrationsRun: true,
}; 