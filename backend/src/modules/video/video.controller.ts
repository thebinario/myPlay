import { Controller, Get, Post, Body, Param, Res, HttpStatus, HttpException, NotFoundException, Headers, Query, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { VideoService } from './services/video.service';
import { ScanDirectoryResponse, VideoResponse } from './types/video.types';
import { Video } from './entities/video.entity';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createReadStream, existsSync, statSync } from 'fs';
import { spawn } from 'child_process';
import { APP_CONFIG } from '../../config/app.config';
import { FileInterceptor } from '@nestjs/platform-express';

const execAsync = promisify(exec);

@Controller('videos')
export class VideoController {
  private readonly mimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv'
  };

  // Lista de formatos que precisam de transcodificação para reprodução em navegadores
  private readonly formatsRequiringTranscoding = [
    '.mkv', '.avi', '.wmv', '.mov', '.flv', '.m4v', '.ts'
  ];

  // Tamanho padrão do chunk para streaming (5MB)
  private readonly CHUNK_SIZE = 5 * 1024 * 1024;

  constructor(private readonly videoService: VideoService) {}

  @Get()
  async findAll(): Promise<VideoResponse[]> {
    return this.videoService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<VideoResponse> {
    const video = await this.videoService.findOne(+id);
    if (!video) {
      throw new NotFoundException(`Vídeo com ID ${id} não encontrado`);
    }
    return video;
  }

  @Post()
  async create(@Body() videoData: Partial<Video>): Promise<Video> {
    return this.videoService.create(videoData);
  }

  @Post('scan-directory')
  async scanDirectory(@Body() body: { path?: string }): Promise<ScanDirectoryResponse> {
    console.log('Requisição para escanear diretório recebida:', body);
    console.log('Tipo do body:', typeof body);
    
    try {
      // Garantir que o path seja uma string ou undefined
      const directoryPath = body && body.path ? String(body.path).trim() : undefined;
      console.log('Caminho do diretório a ser escaneado:', directoryPath);
      
      return await this.videoService.scanDirectory(directoryPath);
    } catch (error) {
      console.error('Erro ao escanear diretório:', error);
      throw new BadRequestException(error.message || 'Erro ao escanear diretório');
    }
  }

  @Get(':id/stream')
  async streamVideo(
    @Param('id') id: string,
    @Headers('range') range: string,
    @Query('transcode') transcode: string,
    @Res() res: Response
  ) {
    // Busca o vídeo no banco de dados
    const video = await this.videoService.findOne(+id);
    if (!video) {
      throw new NotFoundException(`Vídeo com ID ${id} não encontrado`);
    }

    // Verifica se o arquivo existe
    const videoPath = video.path;
    if (!existsSync(videoPath)) {
      throw new NotFoundException(`Arquivo de vídeo não encontrado: ${videoPath}`);
    }

    // Obtém a extensão do arquivo para determinar se precisa de transcodificação
    const ext = path.extname(videoPath).toLowerCase();
    const requiresTranscoding = this.formatsRequiringTranscoding.includes(ext);

    // Se o formato requer transcodificação e o parâmetro transcode não foi explicitamente definido como 'false'
    if (requiresTranscoding && transcode !== 'false') {
      console.log(`Formato ${ext} requer transcodificação. Redirecionando para endpoint de transcodificação.`);
      return this.transcodeVideo(id, res, range);
    }

    // Determina o tipo MIME com base na extensão do arquivo
    const contentType = this.mimeTypes[ext] || 'video/mp4';

    // Obtém o tamanho do arquivo
    const { size: fileSize } = statSync(videoPath);

    // Se não houver range header, envia o arquivo inteiro
    if (!range) {
      console.log(`Requisição sem range para vídeo ${id}. Enviando arquivo completo.`);
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      };
      res.writeHead(200, head);
      createReadStream(videoPath).pipe(res);
      return;
    }

    console.log(`Requisição com range para vídeo ${id}: ${range}`);

    // Parse do range header
    // Exemplo: "bytes=32324-" ou "bytes=32324-55464"
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    // Tamanho máximo de chunk para evitar sobrecarga de memória e rede (5MB)
    const maxChunkSize = 5 * 1024 * 1024;
    const chunksize = (end - start) + 1;

    // Ajusta o tamanho do chunk se necessário
    let adjustedEnd = end;
    let adjustedChunksize = chunksize;

    if (chunksize > maxChunkSize) {
      adjustedEnd = start + maxChunkSize - 1;
      adjustedChunksize = maxChunkSize;
      console.log(`Ajustando tamanho do chunk de ${chunksize} para ${adjustedChunksize} bytes.`);
    }

    // Cria um stream de leitura para o intervalo especificado
    const file = createReadStream(videoPath, { start, end: adjustedEnd });

    const head = {
      'Content-Range': `bytes ${start}-${adjustedEnd}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': adjustedChunksize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600'
    };

    // Enviando o cabeçalho e o stream parcial
    res.writeHead(206, head);
    file.pipe(res);
  }

  @Get(':id/transcode')
  async transcodeVideo(
    @Param('id') id: string, 
    @Res() res: Response,
    @Headers('range') range?: string
  ) {
    console.log(`Iniciando transcodificação para vídeo ${id}`);
    
    // Busca o vídeo no banco de dados
    const video = await this.videoService.findOne(+id);
    if (!video) {
      throw new NotFoundException(`Vídeo com ID ${id} não encontrado`);
    }

    // Verifica se o arquivo existe
    const videoPath = video.path;
    if (!existsSync(videoPath)) {
      throw new NotFoundException(`Arquivo de vídeo não encontrado: ${videoPath}`);
    }

    // Define parâmetros para o ffmpeg
    const ffmpegArgs = [
      '-i', videoPath,
      '-c:v', 'libx264', // Codificador H.264 para vídeo (compatível com navegadores)
      '-c:a', 'aac',     // Codificador AAC para áudio (compatível com navegadores)
      '-movflags', 'frag_keyframe+empty_moov+faststart', // Otimiza para streaming
      '-f', 'mp4',       // Formato de saída MP4
      '-preset', 'ultrafast', // Prioriza velocidade de codificação
      '-tune', 'zerolatency', // Otimiza para baixa latência
      '-crf', '23',      // Qualidade razoável (valores menores = melhor qualidade)
      '-'                // Saída para stdout
    ];

    // Se houver um range header, adiciona parâmetros para o seek
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      
      // Converte bytes em segundos aproximados (assumindo 8 Mbps de bitrate)
      const seekSeconds = Math.max(0, Math.floor(start / (1024 * 1024)));
      
      if (seekSeconds > 0) {
        console.log(`Solicitação de range detectada. Iniciando em ~${seekSeconds} segundos`);
        ffmpegArgs.unshift('-ss', seekSeconds.toString());
      }
    }

    console.log('Comando ffmpeg:', ffmpegArgs.join(' '));

    try {
      // Verifica se o ffmpeg está instalado
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      // Configurar cabeçalhos para streaming de mídia
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache, no-store');
      
      // Retornar 200 OK (não 206 Partial Content, já que estamos transcodificando ao vivo)
      res.status(200);
      
      // Conectar a saída do ffmpeg diretamente à resposta HTTP
      ffmpeg.stdout.pipe(res);

      // Tratamento de erros
      ffmpeg.stderr.on('data', (data) => {
        console.log('ffmpeg stderr:', data.toString());
      });

      ffmpeg.on('error', (err) => {
        console.error('Erro ao iniciar ffmpeg:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro na transcodificação do vídeo' });
        } else {
          res.end();
        }
      });

      // Limpeza quando a conexão é fechada
      res.on('close', () => {
        console.log('Conexão fechada pelo cliente. Terminando processo ffmpeg.');
        ffmpeg.kill('SIGKILL');
      });
    } catch (error) {
      console.error('Erro durante a transcodificação:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro na transcodificação do vídeo' });
      } else {
        res.end();
      }
    }
  }

  @Get(':id/position')
  async getPosition(@Param('id') id: string) {
    const video = await this.videoService.findById(Number(id));
    if (!video) {
      throw new HttpException('Vídeo não encontrado', HttpStatus.NOT_FOUND);
    }
    return { position: video.last_position };
  }

  @Post(':id/position')
  async updatePosition(
    @Param('id') id: string,
    @Body() body: { position: number }
  ) {
    const video = await this.videoService.findById(Number(id));
    if (!video) {
      throw new HttpException('Vídeo não encontrado', HttpStatus.NOT_FOUND);
    }
    return this.videoService.updatePosition(Number(id), body.position);
  }

  @Post('save-position')
  async savePosition(@Body() data: { videoId: number, position: number }) {
    const { videoId, position } = data;
    return this.videoService.savePosition(videoId, position);
  }
}