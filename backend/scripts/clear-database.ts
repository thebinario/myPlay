import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function clearDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'video_server'
  });

  try {
    console.log('Conectando ao banco de dados...');
    await client.connect();
    console.log('Conectado com sucesso!');

    // Limpa a tabela de vídeos
    console.log('Limpando a tabela de vídeos...');
    await client.query('TRUNCATE TABLE video CASCADE');
    console.log('Tabela de vídeos limpa com sucesso!');

    // Limpa o diretório de vídeos
    const videosDir = path.join(process.cwd(), 'videos');
    if (fs.existsSync(videosDir)) {
      console.log('Limpando o diretório de vídeos...');
      const files = fs.readdirSync(videosDir);
      for (const file of files) {
        fs.unlinkSync(path.join(videosDir, file));
      }
      console.log('Diretório de vídeos limpo com sucesso!');
    }

    console.log('Banco de dados e diretório de vídeos limpos com sucesso!');
  } catch (error) {
    console.error('Erro ao limpar o banco de dados:', error);
  } finally {
    await client.end();
  }
}

clearDatabase(); 