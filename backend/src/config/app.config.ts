import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

// Função para obter o diretório raiz do projeto
const getRootDirectory = () => {
  // Obtém o diretório atual do processo
  const currentDir = process.cwd();
  // Volta um nível para chegar na raiz do projeto
  return path.dirname(currentDir);
};

// Definir o diretório de vídeos
const videoDir = path.resolve(process.cwd(), 'videos');

// Criar o diretório de vídeos se não existir
if (!fs.existsSync(videoDir)) {
  console.log(`Criando diretório de vídeos em: ${videoDir}`);
  try {
    fs.mkdirSync(videoDir, { recursive: true });
    console.log(`Diretório de vídeos criado com sucesso: ${videoDir}`);
  } catch (error) {
    console.error(`Erro ao criar diretório de vídeos: ${error}`);
  }
} else {
  console.log(`Diretório de vídeos já existe em: ${videoDir}`);
}

export const APP_CONFIG = {
  PORT: process.env.PORT || 3000,
  VIDEO_DIRECTORY: videoDir,
  SUPPORTED_FORMATS: ['.mp4', '.webm', '.mkv', '.avi', '.mov'],
  VIDEO_EXTENSIONS: ['.mp4', '.webm', '.mkv', '.avi', '.mov'],
  TRANSCODING: {
    VIDEO_CODEC: process.env.FFMPEG_VIDEO_CODEC || 'libx264',
    AUDIO_CODEC: process.env.FFMPEG_AUDIO_CODEC || 'aac',
    VIDEO_BITRATE: process.env.FFMPEG_VIDEO_BITRATE || '2M',
    AUDIO_BITRATE: process.env.FFMPEG_AUDIO_BITRATE || '128k',
    PRESET: process.env.FFMPEG_PRESET || 'ultrafast',
  },
}; 