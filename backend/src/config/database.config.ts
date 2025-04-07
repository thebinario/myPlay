import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Client } from 'pg';
import { Video } from '../modules/video/entities/video.entity';

export const createDatabaseConfig = async (): Promise<TypeOrmModuleOptions> => {
  // Primeiro, conecta como superusuário para criar role e banco se necessário
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    console.log('Conectado ao PostgreSQL como superusuário');

    // 1. Verifica se o banco de dados existe
    const dbExists = await adminClient.query(`
      SELECT 1 FROM pg_database WHERE datname = 'video_server'
    `);

    if (dbExists.rows.length === 0) {
      // Cria o banco de dados se não existir
      await adminClient.query('CREATE DATABASE video_server');
      console.log('Banco de dados video_server criado com sucesso!');
    }

    // 2. Fecha a conexão com o banco postgres
    await adminClient.end();

    // 3. Conecta ao banco video_server para configurar as permissões
    const dbClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'video_server'
    });

    await dbClient.connect();
    console.log('Conectado ao banco video_server');

    try {
      // 4. Cria o usuário se não existir ou atualiza se existir
      await dbClient.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'myplay') THEN
            CREATE ROLE myplay WITH LOGIN PASSWORD 'myPlay';
          ELSE
            ALTER ROLE myplay WITH PASSWORD 'myPlay';
          END IF;
        END
        $$;
      `);

      // 5. Garante que o usuário tem as permissões necessárias
      await dbClient.query(`
        ALTER ROLE myplay WITH LOGIN CREATEDB;
        GRANT ALL PRIVILEGES ON DATABASE video_server TO myplay;
        GRANT ALL PRIVILEGES ON SCHEMA public TO myplay;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO myplay;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO myplay;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO myplay;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO myplay;
      `);

      console.log('Usuário myplay configurado com sucesso!');
    } catch (error) {
      console.error('Erro ao configurar usuário:', error);
      throw error;
    } finally {
      await dbClient.end();
    }

    // Aguarda um momento para garantir que todas as conexões foram encerradas
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Configuração do banco de dados concluída com sucesso!');

    // Retorna a configuração do TypeORM
    return {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'myplay',
      password: 'myPlay',
      database: 'video_server',
      entities: [Video],
      synchronize: true,
      logging: true,
    };

  } catch (error) {
    console.error('Erro fatal na configuração do banco de dados:', error);
    throw error;
  }
}; 