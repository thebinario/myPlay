const https = require('https');
const fs = require('fs');
const path = require('path');

// URL de um vídeo de teste de domínio público
const sampleVideoUrl = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4';
const videosDir = path.join(process.cwd(), 'videos');
const outputPath = path.join(videosDir, 'sample-video.mp4');

// Garante que o diretório existe
if (!fs.existsSync(videosDir)) {
  console.log(`Criando diretório de vídeos em: ${videosDir}`);
  fs.mkdirSync(videosDir, { recursive: true });
}

console.log('Baixando vídeo de exemplo...');
console.log(`De: ${sampleVideoUrl}`);
console.log(`Para: ${outputPath}`);

const file = fs.createWriteStream(outputPath);

https.get(sampleVideoUrl, (response) => {
  // Verificar se a resposta foi bem-sucedida
  if (response.statusCode !== 200) {
    console.error(`Falha ao baixar o vídeo. Código de status: ${response.statusCode}`);
    file.close();
    fs.unlinkSync(outputPath); // Remove o arquivo parcial
    return;
  }

  // Pipe da resposta para o arquivo
  response.pipe(file);

  // Eventos de controle
  file.on('finish', () => {
    file.close();
    console.log('Download concluído com sucesso.');
    console.log('Vídeo de exemplo pronto para testes.');
  });
}).on('error', (err) => {
  console.error('Erro durante o download:', err.message);
  file.close();
  fs.unlinkSync(outputPath); // Remove o arquivo parcial
}); 