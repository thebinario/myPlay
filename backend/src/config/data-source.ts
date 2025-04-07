import { DataSource } from 'typeorm';
import { Video } from '../video/entities/video.entity';
import { CreateVideoTable1712443213828 } from '../migrations/1712443213828-CreateVideoTable';
import { AddCategoryColumn1712493789123 } from '../migrations/1712493789123-AddCategoryColumn';
import { AddAliasColumn1712494000000 } from '../migrations/1712494000000-AddAliasColumn';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'video_server',
  entities: [Video],
  migrations: [
    CreateVideoTable1712443213828, 
    AddCategoryColumn1712493789123,
    AddAliasColumn1712494000000
  ],
  synchronize: false,
}); 