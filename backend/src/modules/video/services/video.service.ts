import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { Video } from '../entities/video.entity';
import { ScanDirectoryResponse, VideoResponse } from '../types/video.types';
import { APP_CONFIG } from '../../../config/app.config';

// Cache simples para armazenar informações de vídeo
class VideoCache {
  private cache: Map<number, { path: string; size: number }> = new Map();
  private maxSize: number = 100; // Tamanho máximo do cache

  set(id: number, data: { path: string; size: number }): void {
    // Se o cache estiver cheio, remova o item mais antigo
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(id, data);
  }

  get(id: number): { path: string; size: number } | undefined {
    return this.cache.get(id);
  }

  clear(): void {
    this.cache.clear();
  }
}

@Injectable()
export class VideoService {
  private videoCache: VideoCache = new VideoCache();

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>
  ) {}

  async findAll(): Promise<VideoResponse[]> {
    const videos = await this.videoRepository.find();
    return videos.map(video => ({
      id: video.id,
      title: video.title,
      path: video.path || video['filePath'],
      duration: video.duration,
      last_position: video.last_position || video['lastPosition'],
      added: false // Não é um vídeo novo
    }));
  }

  async findById(id: number): Promise<Video | null> {
    return this.videoRepository.findOne({ where: { id } });
  }

  async create(videoData: Partial<Video>): Promise<Video> {
    const video = this.videoRepository.create(videoData);
    return this.videoRepository.save(video);
  }

  async updatePosition(id: number, position: number): Promise<Video> {
    const video = await this.findById(id);
    if (!video) {
      throw new Error('Vídeo não encontrado');
    }
    video.last_position = position;
    return this.videoRepository.save(video);
  }

  private async scanDirectoryRecursively(directoryPath: string, existingPaths: Set<string>): Promise<VideoResponse[]> {
    const videoFiles: VideoResponse[] = [];
    
    try {
      const files = await fs.readdir(directoryPath);
      
      for (const file of files) {
        const filePath = path.join(directoryPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          // Se for um diretório, faz a busca recursiva
          const subDirFiles = await this.scanDirectoryRecursively(filePath, existingPaths);
          videoFiles.push(...subDirFiles);
        } else if (stats.isFile() && this.isVideoFile(file)) {
          const isNewVideo = !existingPaths.has(filePath);
          let videoId: number;
          
          if (isNewVideo) {
            // Adiciona o vídeo ao banco de dados com campos compatíveis
            try {
              // Cria um alias amigável para o nome do arquivo
              const fileNameWithoutExt = path.parse(file).name;
              // Substitui underscores e pontos por espaços
              let friendlyName = fileNameWithoutExt
                .replace(/[._-]/g, ' ')
                .replace(/\s+/g, ' ') // Remove espaços duplicados
                .trim();
              
              // Corrige a capitalização (primeira letra de cada palavra em maiúsculo)
              friendlyName = friendlyName.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
                
              // Remove informações técnicas comuns em nomes de arquivos
              friendlyName = friendlyName
                .replace(/\b(1080p|720p|2160p|480p|bluray|brrip|dvdrip|web\s*dl|webrip|x264|h264|aac|mp3)\b/gi, '')
                .replace(/\b(xvid|divx|hevc|10bit|8bit|uhd|hdr|sdr)\b/gi, '')
                .replace(/\b(season|s\d+|episode|e\d+|complete|repack)\b/gi, '')
                .replace(/\[\w+\]|\(\w+\)/g, '') // Remove texto entre colchetes ou parênteses
                .replace(/\s+/g, ' ') // Remove espaços duplicados novamente
                .trim();
              
              // Tentativa com os campos novos (filePath, lastPosition)
              const videoData: any = {
                title: file,
                filePath: filePath,
                duration: 0,
                lastPosition: 0,
                alias: friendlyName
              };
              
              // Adiciona também os campos antigos para compatibilidade
              videoData.path = filePath;
              videoData.last_position = 0;
              
              const video = await this.create(videoData);
              videoId = video.id;
              console.log(`Vídeo adicionado com sucesso: ${file}, alias: ${friendlyName}`);
            } catch (error) {
              console.error(`Erro ao adicionar vídeo ${file}:`, error);
              continue; // Pula este vídeo e continua com o próximo
            }
          } else {
            // Encontra o ID do vídeo existente usando filePath ou path
            const existingVideo = await this.videoRepository.findOne({ 
              where: [
                { path: filePath } as any,
                { filePath: filePath } as any
              ]
            });
            
            if (!existingVideo) {
              console.error(`Vídeo existente não encontrado: ${filePath}`);
              continue;
            }
            
            videoId = existingVideo.id;
          }

          videoFiles.push({
            id: videoId,
            title: file,
            path: filePath,
            added: isNewVideo
          });
        }
      }
    } catch (error) {
      console.error(`Erro ao escanear diretório ${directoryPath}:`, error);
    }

    return videoFiles;
  }

  async scanDirectory(directoryPath: string = APP_CONFIG.VIDEO_DIRECTORY): Promise<ScanDirectoryResponse> {
    try {
      // Se o diretório não for fornecido ou for vazio, usar o padrão
      const pathToScan = directoryPath && directoryPath.trim() !== ''
        ? directoryPath
        : APP_CONFIG.VIDEO_DIRECTORY;
      
      console.log('Tentando escanear diretório:', pathToScan);

      // Tratamento de segurança: Nunca permitir escanear a raiz completa
      if (pathToScan === '/') {
        console.warn('Tentativa de escanear o diretório raiz foi bloqueada por segurança');
        throw new Error('Por segurança, não é permitido escanear o diretório raiz completo');
      }

      // Validar que o diretório existe
      if (!fsSync.existsSync(pathToScan)) {
        console.error(`Diretório não encontrado: ${pathToScan}`);
        if (pathToScan === APP_CONFIG.VIDEO_DIRECTORY) {
          // Se for o diretório padrão que não existe, vamos criá-lo
          console.log(`Criando diretório padrão: ${pathToScan}`);
          try {
            fsSync.mkdirSync(pathToScan, { recursive: true });
            console.log(`Diretório padrão criado com sucesso: ${pathToScan}`);
          } catch (err) {
            console.error(`Não foi possível criar o diretório padrão: ${pathToScan}`, err);
            throw new Error(`Não foi possível criar o diretório padrão: ${pathToScan}`);
          }
        } else {
          throw new Error(`O diretório especificado não existe: ${pathToScan}`);
        }
      }

      console.log(`Escaneando diretório: ${pathToScan}`);
      
      // Verificar permissões do diretório
      try {
        await fs.access(pathToScan, fs.constants.R_OK);
      } catch (err) {
        console.error(`Sem permissão para ler o diretório: ${pathToScan}`, err);
        throw new Error(`Sem permissão para acessar o diretório: ${pathToScan}`);
      }

      const existingVideos = await this.videoRepository.find();
      const existingPaths = new Set(existingVideos.map(v => v.path));
      
      console.log(`Iniciando escaneamento recursivo de: ${pathToScan}`);
      const videoFiles = await this.scanDirectoryRecursively(pathToScan, existingPaths);
      console.log(`Escaneamento concluído. Encontrados ${videoFiles.length} vídeos.`);
      
      const newVideosCount = videoFiles.filter(v => v.added).length;

      const message = newVideosCount > 0
        ? `Encontrados ${videoFiles.length} vídeos no dispositivo. ${newVideosCount} novos vídeos adicionados.`
        : `Encontrados ${videoFiles.length} vídeos no dispositivo. Nenhum novo vídeo adicionado.`;

      return {
        message,
        videos: videoFiles
      };
    } catch (error) {
      console.error('Erro ao escanear diretório:', error);
      throw error; // Propagar o erro para ser tratado pelo controlador
    }
  }

  private isVideoFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return APP_CONFIG.VIDEO_EXTENSIONS.includes(ext);
  }

  async getVideoStream(id: number) {
    const video = await this.findById(id);
    if (!video) {
      throw new Error('Vídeo não encontrado');
    }
    return fsSync.createReadStream(video.path);
  }

  async getVideoInfo(id: number): Promise<{ path: string; size: number } | null> {
    // Verifica se existe no cache
    const cachedInfo = this.videoCache.get(id);
    if (cachedInfo) {
      console.log(`Utilizando informações de vídeo em cache para ID: ${id}`);
      return cachedInfo;
    }

    // Se não estiver no cache, busca do banco de dados
    const video = await this.findById(id);
    if (!video) return null;

    try {
      const stats = await fs.stat(video.path);
      const videoInfo = { path: video.path, size: stats.size };
      
      // Armazena no cache para futuras requisições
      this.videoCache.set(id, videoInfo);
      return videoInfo;
    } catch (error) {
      console.error(`Erro ao obter informações do vídeo ID ${id}:`, error);
      return null;
    }
  }

  async findOne(id: number): Promise<VideoResponse | null> {
    const video = await this.videoRepository.findOne({ where: { id } });
    if (!video) return null;
    
    return {
      id: video.id,
      title: video.title,
      path: video.path || video['filePath'],
      duration: video.duration,
      last_position: video.last_position || video['lastPosition'],
      alias: video['alias'],
      added: false // Não é um vídeo novo
    };
  }

  async savePosition(videoId: number, position: number): Promise<Video> {
    const video = await this.videoRepository.findOne({ where: { id: videoId } });
    if (!video) {
      throw new Error(`Vídeo com ID ${videoId} não encontrado`);
    }

    // Atualiza tanto o campo antigo quanto o novo
    if ('lastPosition' in video) {
      (video as any).lastPosition = position;
    }
    if ('last_position' in video) {
      video.last_position = position;
    }
    
    return this.videoRepository.save(video);
  }
} 