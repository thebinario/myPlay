import { DataSource } from 'typeorm';
import { Video } from './video/entities/video.entity';
import * as dotenv from 'dotenv';

dotenv.config();

async function runDiagnostic() {
  console.log('Iniciando diagnóstico do banco de dados...');
  
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'video_server',
    entities: [Video],
    synchronize: false,
  });

  try {
    // Conectar ao banco de dados
    await dataSource.initialize();
    console.log('Conexão com o banco de dados estabelecida');

    // Verificar a estrutura da tabela de vídeos
    const tableInfo = await dataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'video'
      ORDER BY ordinal_position
    `);
    
    console.log('Estrutura da tabela de vídeos:');
    console.table(tableInfo);

    // Listar alguns vídeos para verificar os dados
    const videos = await dataSource.manager.find(Video, { take: 5 });
    console.log('Amostra de vídeos no banco:');
    videos.forEach(video => {
      console.log(`ID: ${video.id}`);
      console.log(`Título: ${video.title}`);
      console.log(`Categoria: ${video.category}`);
      console.log(`Caminho: ${video.filePath}`);
      console.log('---');
    });

    // Verificar se há algum problema com a coluna de título
    const titleCheck = await dataSource.query(`
      SELECT COUNT(*) AS empty_titles
      FROM video
      WHERE title IS NULL OR title = ''
    `);
    
    console.log(`Vídeos com título vazio: ${titleCheck[0].empty_titles}`);
    
    // Testar uma atualização direta via SQL
    if (videos.length > 0) {
      const testId = videos[0].id;
      const testTitle = 'Título de teste ' + new Date().toISOString();
      
      console.log(`Tentando atualizar o título do vídeo ${testId} para "${testTitle}" diretamente via SQL...`);
      
      await dataSource.query(`
        UPDATE video
        SET title = $1
        WHERE id = $2
      `, [testTitle, testId]);
      
      // Verificar se a atualização funcionou
      const updatedVideo = await dataSource.manager.findOne(Video, { where: { id: testId } });
      
      console.log('Resultado após atualização via SQL:');
      console.log(`Título agora é: ${updatedVideo?.title}`);
      console.log(`A atualização ${updatedVideo?.title === testTitle ? 'FUNCIONOU' : 'FALHOU'}`);
    }

  } catch (error) {
    console.error('Erro durante o diagnóstico:', error);
  } finally {
    // Fechar a conexão
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('Conexão com o banco de dados fechada');
    }
  }
}

// Executar o diagnóstico
runDiagnostic()
  .then(() => console.log('Diagnóstico concluído'))
  .catch(error => console.error('Erro no diagnóstico:', error)); 