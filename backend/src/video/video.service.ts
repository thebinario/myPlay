import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Video } from './entities/video.entity';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { VideoFile } from './interfaces/video-file.interface';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { createReadStream, statSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Response } from 'express';
import { LRUCache } from 'lru-cache';
import * as ffmpeg from 'fluent-ffmpeg';
import { APP_CONFIG } from '../config/app.config';

const stat = promisify(fs.stat);
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const MAX_CACHE_SIZE = 100; // Maximum number of cached videos

interface VideoInfo {
  filePath: string;
  fileSize: number;
}

@Injectable()
export class VideoService {
  private readonly videoCache: LRUCache<string, Video>;
  private readonly videoInfoCache: LRUCache<string, VideoInfo>;
  private readonly positionCache: LRUCache<string, number>;

  constructor(
    @InjectRepository(Video)
    private videoRepository: Repository<Video>,
  ) {
    // Cache para informações dos vídeos (1 hora de TTL, máximo 100 itens)
    this.videoCache = new LRUCache<string, Video>({
      max: 100,
      ttl: 1000 * 60 * 60, // 1 hora
      updateAgeOnGet: true,
      allowStale: false
    });

    // Cache para informações de arquivo dos vídeos
    this.videoInfoCache = new LRUCache<string, VideoInfo>({
      max: 100,
      ttl: 1000 * 60 * 60, // 1 hora
      updateAgeOnGet: true,
      allowStale: false
    });

    // Cache para posições dos vídeos (24 horas de TTL, máximo 1000 itens)
    this.positionCache = new LRUCache<string, number>({
      max: 1000,
      ttl: 1000 * 60 * 60 * 24, // 24 horas
      updateAgeOnGet: true,
      allowStale: false
    });
  }

  async create(createVideoDto: CreateVideoDto, file: Express.Multer.File): Promise<Video> {
    const video = this.videoRepository.create({
      ...createVideoDto,
      filePath: file.path,
      fileSize: file.size,
    });
    return this.videoRepository.save(video);
  }

  async findAll(): Promise<Video[]> {
    return this.videoRepository.find();
  }

  async findOne(id: string): Promise<Video> {
    // Tenta buscar do cache primeiro
    const cached = this.videoCache.get(id);
    if (cached) {
      return cached;
    }

    // Se não estiver no cache, busca do banco
    const video = await this.videoRepository.findOne({ where: { id } });
    if (!video) {
      throw new NotFoundException(`Vídeo com ID ${id} não encontrado`);
    }

    this.videoCache.set(id, video);
    return video;
  }

  async update(id: string, updateVideoDto: UpdateVideoDto): Promise<Video> {
    console.log(`Service: Atualizando vídeo ${id} com DTO:`, JSON.stringify(updateVideoDto));
    
    try {
      // Verificar o vídeo antes da atualização
      const videoBefore = await this.findOne(id);
      console.log(`Video ANTES da atualização:`, JSON.stringify(videoBefore));
      
      // Tentar atualização com manager.findOne + save em vez de repository.update
      console.log("Tentando abordagem alternativa com manager.save...");
      
      // Obter EntityManager do repositório
      const manager = this.videoRepository.manager;
      
      // Buscar a entidade
      const videoEntity = await manager.findOne(Video, { where: { id } });
      
      if (!videoEntity) {
        throw new Error(`Vídeo com ID ${id} não encontrado`);
      }
      
      // Atualizar campos
      if (updateVideoDto.title !== undefined) {
        console.log(`Atualizando título: "${videoEntity.title}" -> "${updateVideoDto.title}"`);
        videoEntity.title = updateVideoDto.title;
      }
      
      if (updateVideoDto.category !== undefined) {
        console.log(`Atualizando categoria: "${videoEntity.category}" -> "${updateVideoDto.category}"`);
        videoEntity.category = updateVideoDto.category;
      }
      
      // Atualizar outros campos do DTO de forma segura em relação a tipos
      const typedDto = updateVideoDto as Record<string, unknown>;
      Object.keys(typedDto).forEach(key => {
        if (key !== 'title' && key !== 'category' && typedDto[key] !== undefined) {
          const valueToUpdate = typedDto[key];
          console.log(`Atualizando ${key}: "${videoEntity[key]}" -> "${valueToUpdate}"`);
          videoEntity[key] = valueToUpdate;
        }
      });
      
      // Salvar entidade
      const savedEntity = await manager.save(videoEntity);
      console.log(`Entidade salva via manager.save:`, JSON.stringify(savedEntity));
      
      // Limpar cache
      this.videoCache.delete(id);
      
      // Buscar vídeo atualizado
      const updatedVideo = await this.findOne(id);
      console.log(`Vídeo atualizado recuperado:`, JSON.stringify(updatedVideo));
      
      return updatedVideo;
    } catch (error) {
      console.error(`Erro ao atualizar vídeo ${id} no repositório:`, error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const video = await this.findOne(id);
    if (video.filePath) {
      try {
        await fs.promises.unlink(video.filePath);
      } catch (error) {
        console.error(`Error deleting file ${video.filePath}:`, error);
      }
    }
    await this.videoRepository.remove(video);
    this.videoCache.delete(id);
    this.positionCache.delete(id);
  }

  async streamVideo(id: string, range: string, res: Response, customFilePath?: string): Promise<void> {
    try {
      let filePath: string;
      let fileSize: number;
      
      if (customFilePath && fs.existsSync(customFilePath)) {
        // Use the provided custom file path
        filePath = customFilePath;
        fileSize = statSync(customFilePath).size;
        console.log(`Streaming transcodificado: ${filePath}, tamanho: ${fileSize}`);
      } else {
        // Try to get video info from cache
        let videoInfo = this.videoInfoCache.get(id);
        
        if (!videoInfo) {
          const video = await this.findOne(id);
          if (!video.filePath || !fs.existsSync(video.filePath)) {
            throw new NotFoundException('Video file not found');
          }
          
          videoInfo = {
            filePath: video.filePath,
            fileSize: video.fileSize || statSync(video.filePath).size
          };
          this.videoInfoCache.set(id, videoInfo);
        }

        filePath = videoInfo.filePath;
        fileSize = videoInfo.fileSize;
      }

      // Determina tamanho adaptativo do chunk baseado no tamanho do arquivo
      // Arquivos grandes (>5GB) usam chunks menores para evitar sobrecarga de memória
      let adaptiveChunkSize = CHUNK_SIZE; // Padrão é 1MB
      const FILE_SIZE_THRESHOLD = 5 * 1024 * 1024 * 1024; // 5GB em bytes
      
      if (fileSize > FILE_SIZE_THRESHOLD) {
        // Para arquivos grandes, usamos chunks menores (256KB)
        adaptiveChunkSize = 256 * 1024; 
        console.log(`Arquivo grande detectado (${(fileSize/1024/1024/1024).toFixed(2)}GB). Usando chunks menores: ${adaptiveChunkSize/1024}KB`);
      }

      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] 
        ? parseInt(parts[1], 10) 
        : Math.min(start + adaptiveChunkSize - 1, fileSize - 1);

      if (start >= fileSize || end >= fileSize || start > end) {
        throw new BadRequestException('Invalid range request');
      }

      const chunkSize = end - start + 1;
      
      // Configurar um timeout maior para arquivos grandes
      res.setTimeout(120000); // 2 minutos (aumentar conforme necessário)
      
      // Stream options com highWaterMark otimizado para arquivos grandes
      const streamOptions = { 
        start, 
        end,
        highWaterMark: fileSize > FILE_SIZE_THRESHOLD ? 64 * 1024 : 128 * 1024 // Buffer menor para arquivos grandes
      };
      
      const stream = createReadStream(filePath, streamOptions);

      // Detector de erro de stream
      stream.on('error', (err) => {
        console.error(`Erro no stream de arquivo ${filePath}:`, err);
        // Não propaga o erro para evitar crash do servidor
        if (!res.headersSent) {
          res.status(500).send('Erro ao acessar o arquivo de vídeo');
        }
      });

      // Set response headers
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=31536000',
      });

      // Stream the video chunk com tratamento de erro
      try {
        await pipeline(stream, res);
      } catch (pipelineError) {
        // Apenas loga o erro, pois normalmente é devido a fechamento de conexão pelo cliente
        console.log(`Stream pipeline finalizado: ${pipelineError.message}`);
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error streaming video:', error);
      if (!res.headersSent) {
        throw new BadRequestException('Error streaming video');
      }
    }
  }

  async getVideoInfo(filePath: string): Promise<any> {
    const fullPath = path.join(APP_CONFIG.VIDEO_DIRECTORY, filePath);
    const stats = await stat(fullPath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  }

  async savePosition(id: string, position: number): Promise<void> {
    // Salva no cache com valor original
    this.positionCache.set(id, position);

    try {
      // Converte para inteiro para evitar o erro com o banco de dados
      const intPosition = Math.floor(position);
      console.log(`Salvando posição arredondada para inteiro: ${intPosition}`);

      // Usa update direto, sem carregar a entidade
      await this.videoRepository.update(id, { lastPosition: intPosition });
    } catch (error) {
      // Loga o erro mas não falha a operação, pois a posição já está no cache
      console.error('Erro ao salvar posição no banco de dados:', error);
    }
  }

  async getTranscodingStatus(id: string): Promise<{ isTranscoded: boolean; progress: number }> {
    const video = await this.findOne(id);
    if (!video) {
      return { isTranscoded: false, progress: 0 };
    }

    const outputPath = path.join(APP_CONFIG.VIDEO_DIRECTORY, `transcoded_${video.filePath}`);
    const isTranscoded = fs.existsSync(outputPath);

    return {
      isTranscoded,
      progress: isTranscoded ? 100 : video.transcodingProgress || 0,
    };
  }

  async deleteTranscodedVideo(id: string): Promise<void> {
    const video = await this.findOne(id);
    if (!video) {
      return;
    }

    const outputPath = path.join(APP_CONFIG.VIDEO_DIRECTORY, `transcoded_${video.filePath}`);
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  }

  async scanDirectory(directoryPath: string): Promise<{ files: VideoFile[] }> {
    try {
      console.log(`Escaneando diretório: ${directoryPath}`);
      
      // Validação adicional para caminhos vazios
      if (!directoryPath || directoryPath.trim() === '') {
        directoryPath = APP_CONFIG.VIDEO_DIRECTORY;
        console.log(`Usando diretório padrão: ${directoryPath}`);
      }
      
      // Verifica se o diretório existe
      try {
        const stats = await fs.promises.stat(directoryPath);
        if (!stats.isDirectory()) {
          console.error(`O caminho não é um diretório: ${directoryPath}`);
          throw new BadRequestException(`O caminho especificado não é um diretório: ${directoryPath}`);
        }
      } catch (err) {
        if (err instanceof BadRequestException) {
          throw err;
        }
        console.error(`Diretório não existe ou sem permissão: ${directoryPath}`);
        throw new NotFoundException(`O diretório ${directoryPath} não existe ou você não tem permissão para acessá-lo.`);
      }

      // Obtém a lista de arquivos no diretório
      let files: string[];
      try {
        files = await fs.promises.readdir(directoryPath);
        console.log(`Encontrados ${files.length} arquivos no diretório ${directoryPath}`);
      } catch (err) {
        console.error(`Erro ao ler diretório ${directoryPath}:`, err);
        throw new BadRequestException(`Erro ao ler diretório: ${err.message}`);
      }
      
      // Filtra apenas arquivos de vídeo baseado nas extensões suportadas
      const videoFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return APP_CONFIG.VIDEO_EXTENSIONS.includes(ext);
      });
      console.log(`Encontrados ${videoFiles.length} arquivos de vídeo em ${directoryPath}`);

      // Retorna informações detalhadas sobre cada arquivo
      const fileDetails: VideoFile[] = [];
      
      for (const file of videoFiles) {
        try {
          const filePath = path.join(directoryPath, file);
          const stats = await fs.promises.stat(filePath);
          
          fileDetails.push({
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            extension: path.extname(file).toLowerCase(),
          });
        } catch (err) {
          console.error(`Erro ao processar arquivo ${file}:`, err);
          // Continua para o próximo arquivo
        }
      }

      console.log(`Processados ${fileDetails.length} arquivos de vídeo com sucesso`);
      return { files: fileDetails };
    } catch (error) {
      console.error('Erro ao escanear diretório:', error);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Erro ao escanear diretório: ${error.message}`);
    }
  }

  async importVideosFromDirectory(directoryPath: string): Promise<{ imported: number; skipped: number }> {
    console.log(`Iniciando importação de vídeos do diretório: ${directoryPath}`);
    
    const { files } = await this.scanDirectory(directoryPath);
    console.log(`Encontrados ${files.length} arquivos para importar`);
    
    let imported = 0;
    let skipped = 0;

    for (const file of files) {
      try {
        console.log(`Processando arquivo: ${file.name}`);
        
        // Verifica se o vídeo já existe no banco
        const existingVideos = await this.videoRepository.find({ where: { filePath: file.path } });
        if (existingVideos.length > 0) {
          console.log(`Vídeo já existe no banco: ${file.name}`);
          skipped++;
          continue;
        }

        // Cria um novo registro para o vídeo
        const video = this.videoRepository.create({
          title: path.parse(file.name).name, // Usa o nome do arquivo sem extensão como título
          filePath: file.path,
          fileSize: file.size,
        });
        
        await this.videoRepository.save(video);
        console.log(`Vídeo importado com sucesso: ${file.name}`);
        imported++;
      } catch (error) {
        console.error(`Erro ao importar vídeo ${file.name}:`, error);
        skipped++;
      }
    }

    console.log(`Importação concluída: ${imported} importados, ${skipped} ignorados`);
    return { imported, skipped };
  }

  async findByPath(filePath: string): Promise<Video[]> {
    return this.videoRepository.find({ where: { filePath } });
  }

  async createFromPath(data: { title: string, filePath: string, fileSize: number, alias?: string }): Promise<Video> {
    const video = this.videoRepository.create({
      title: data.title,
      filePath: data.filePath,
      fileSize: data.fileSize,
      alias: data.alias,
    });
    return this.videoRepository.save(video);
  }

  async getPositionFromCache(id: string): Promise<number | null> {
    const position = this.positionCache.get(id);
    return position !== undefined ? position : null;
  }
} 