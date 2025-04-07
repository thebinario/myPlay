import { Controller, Get, Post, Body, Param, Res, UseInterceptors, UploadedFile, ParseUUIDPipe, Query, HttpException, HttpStatus, NotFoundException, Req, Patch } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { VideoService } from './video.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { ScanDirectoryDto } from './dto/scan-directory.dto';
import { Video } from './entities/video.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as ffmpeg from 'fluent-ffmpeg';
import { EventEmitter } from 'events';
import { APP_CONFIG } from '../config/app.config';

// EventEmitter para monitorar o progresso da transcodificação
const transcodingEvents = new EventEmitter();

// Guarda o status atual das transcodificações
const transcodingStatus = new Map<string, {
  isTranscoding: boolean;
  progress: number;
  isTranscoded: boolean;
  error?: string;
  initialSegmentReady: boolean;
  segmentsDir: string;
}>();

@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('scan-directory')
  async scanDirectory(@Body() scanDirectoryDto: ScanDirectoryDto) {
    try {
      // Log da requisição completa
      console.log('Recebida requisição de escaneamento. Corpo:', JSON.stringify(scanDirectoryDto));
      
      // Se não especificou path ou é vazio, usa o diretório padrão
      const directoryPath = !scanDirectoryDto.path || scanDirectoryDto.path.trim() === ''
        ? APP_CONFIG.VIDEO_DIRECTORY
        : scanDirectoryDto.path.trim();
      
      console.log(`Escaneando diretório: ${directoryPath}`);
      const { files } = await this.videoService.scanDirectory(directoryPath);
      
      // Formata a resposta para o formato esperado pelo frontend
      return {
        message: `Escaneamento concluído. Encontrados ${files.length} arquivos de vídeo.`,
        videos: files.map((file, index) => ({
          id: index + 1,
          title: path.parse(file.name).name,
          path: file.path,
          added: false // Por padrão, ainda não foram adicionados
        }))
      };
    } catch (error) {
      console.error('Erro ao processar requisição de escaneamento:', error);
      throw new HttpException(
        `Erro ao escanear diretório: ${error.message}`, 
        error instanceof NotFoundException ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('import-directory')
  async importDirectory(@Body() scanDirectoryDto: ScanDirectoryDto) {
    try {
      // Log da requisição completa
      console.log('Recebida requisição de importação. Corpo:', JSON.stringify(scanDirectoryDto));
      
      // Se não especificou path ou é vazio, usa o diretório padrão
      const directoryPath = !scanDirectoryDto.path || scanDirectoryDto.path.trim() === ''
        ? APP_CONFIG.VIDEO_DIRECTORY
        : scanDirectoryDto.path.trim();
      
      console.log(`Importando vídeos do diretório: ${directoryPath}`);
      const result = await this.videoService.importVideosFromDirectory(directoryPath);
      
      return {
        message: `Importação concluída. ${result.imported} vídeos importados, ${result.skipped} ignorados.`,
        imported: result.imported,
        skipped: result.skipped
      };
    } catch (error) {
      console.error('Erro ao processar requisição de importação:', error);
      throw new HttpException(
        `Erro ao importar vídeos: ${error.message}`, 
        error instanceof NotFoundException ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('import-from-directory')
  async importFromDirectory() {
    try {
      console.log('Iniciando importação automática de vídeos do diretório padrão');
      
      const directoryPath = APP_CONFIG.VIDEO_DIRECTORY;
      console.log(`Diretório: ${directoryPath}`);
      
      if (!fs.existsSync(directoryPath)) {
        throw new HttpException(`Diretório ${directoryPath} não existe`, HttpStatus.NOT_FOUND);
      }
      
      // Lê os arquivos do diretório
      const files = fs.readdirSync(directoryPath);
      console.log(`Encontrados ${files.length} arquivos no diretório`);
      
      // Filtra apenas arquivos de vídeo
      const videoFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return APP_CONFIG.VIDEO_EXTENSIONS.includes(ext);
      });
      console.log(`Encontrados ${videoFiles.length} arquivos de vídeo`);
      
      let imported = 0;
      let skipped = 0;
      
      // Importa cada vídeo
      for (const file of videoFiles) {
        try {
          const filePath = path.join(directoryPath, file);
          const stats = fs.statSync(filePath);
          const fileSize = stats.size;
          
          // Verifica se já existe no banco de dados
          const existingVideos = await this.videoService.findByPath(filePath);
          if (existingVideos.length > 0) {
            console.log(`Vídeo já existe no banco: ${file}`);
            skipped++;
            continue;
          }
          
          // Cria um novo registro para o vídeo
          const createDto = new CreateVideoDto();
          createDto.title = path.parse(file).name; // Nome do arquivo sem extensão
          
          // Cria um alias inicial mais amigável
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
          
          // Cria o vídeo no banco
          await this.videoService.createFromPath({
            ...createDto,
            filePath,
            fileSize,
            alias: friendlyName
          });
          
          console.log(`Vídeo importado: ${file}, alias: ${friendlyName}`);
          imported++;
        } catch (error) {
          console.error(`Erro ao importar vídeo ${file}:`, error);
          skipped++;
        }
      }
      
      return { 
        message: `Importação concluída: ${imported} vídeos importados, ${skipped} ignorados.`,
        imported,
        skipped
      };
    } catch (error) {
      console.error('Erro ao importar vídeos:', error);
      throw new HttpException(
        `Erro ao importar vídeos: ${error.message}`,
        error instanceof NotFoundException ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(@Body() createVideoDto: CreateVideoDto, @UploadedFile() file: Express.Multer.File) {
    return this.videoService.create(createVideoDto, file);
  }

  @Get()
  findAll() {
    return this.videoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.videoService.findOne(id);
  }

  @Get(':id/stream')
  async streamVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const range = res.req.headers.range;
    if (!range) {
      return this.videoService.streamVideo(id, 'bytes=0-', res);
    }
    return this.videoService.streamVideo(id, range, res);
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateVideoDto: UpdateVideoDto) {
    console.log(`Atualizando vídeo ${id} com dados:`, JSON.stringify(updateVideoDto));
    try {
      const result = await this.videoService.update(id, updateVideoDto);
      console.log(`Vídeo ${id} atualizado com sucesso:`, JSON.stringify(result));
      return result;
    } catch (error) {
      console.error(`Erro ao atualizar vídeo ${id}:`, error);
      throw new HttpException(
        `Erro ao atualizar vídeo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/remove')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.videoService.remove(id);
  }

  @Get(':id/transcode/status')
  async getTranscodingStatus(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const video = await this.videoService.findOne(id);
      if (!video) {
        throw new HttpException('Vídeo não encontrado', HttpStatus.NOT_FOUND);
      }

      // Verifica se já está em processo de transcodificação
      const status = transcodingStatus.get(id);
      
      // Define o caminho de saída
      const fileName = path.basename(video.filePath);
      const outputPath = path.join(APP_CONFIG.VIDEO_DIRECTORY, `transcoded_${fileName.replace(/\.[^/.]+$/, "")}.mp4`);
      
      // Verifica se o arquivo completo existe
      const isFullFileComplete = fs.existsSync(outputPath);
      
      if (isFullFileComplete) {
        // Se o arquivo completo já existe, retorna como transcodificado
        const tempDir = path.join(APP_CONFIG.VIDEO_DIRECTORY, `segments_${id}`);
        
        // Atualiza o banco de dados se necessário
        if (!video.isTranscoded) {
          await this.videoService.update(id, {
            isTranscoded: true,
            transcodedFilePath: `transcoded_${fileName.replace(/\.[^/.]+$/, "")}.mp4`,
            transcodingProgress: 100
          });
        }
        
        // Atualiza o status em memória
        transcodingStatus.set(id, {
          isTranscoding: false,
          progress: 100,
          isTranscoded: true,
          initialSegmentReady: true,
          segmentsDir: tempDir
        });
        
        return { 
          isTranscoding: false, 
          isTranscoded: true, 
          progress: 100,
          initialSegmentReady: true,
          fileComplete: true
        };
      }
      
      if (!status) {
        // Tenta verificar o status no banco de dados
        const videoData = await this.videoService.findOne(id);
        
        if (videoData?.isTranscoded) {
          // Se o vídeo já foi transcodificado, atualiza o cache em memória
          const tempDir = path.join(APP_CONFIG.VIDEO_DIRECTORY, `segments_${id}`);
          transcodingStatus.set(id, {
            isTranscoding: false,
            progress: 100,
            isTranscoded: true,
            initialSegmentReady: true,
            segmentsDir: tempDir
          });
          
          return { 
            isTranscoding: false, 
            isTranscoded: true, 
            progress: 100,
            initialSegmentReady: true,
            fileComplete: true
          };
        }
        
        // Se não há status em memória ou no banco, não está sendo transcodificado
        return { 
          isTranscoding: false, 
          isTranscoded: false, 
          progress: 0,
          initialSegmentReady: false,
          fileComplete: false
        };
      }
      
      // Retorna o status atual
      return { 
        isTranscoding: status.isTranscoding, 
        isTranscoded: status.isTranscoded, 
        progress: status.progress,
        initialSegmentReady: status.initialSegmentReady,
        fileComplete: isFullFileComplete
      };
    } catch (error) {
      console.error('Erro ao verificar status da transcodificação:', error);
      throw new HttpException(
        'Erro ao verificar status da transcodificação',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/transcode/start')
  async startTranscoding(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const video = await this.videoService.findOne(id);
      if (!video) {
        throw new HttpException('Vídeo não encontrado', HttpStatus.NOT_FOUND);
      }

      // Verifica se já está em processo de transcodificação
      const status = transcodingStatus.get(id);
      if (status && status.isTranscoding) {
        return { message: 'Transcodificação já em andamento', progress: status.progress };
      }

      const inputPath = video.filePath;
      
      // Verifica o tamanho do arquivo para ajustar configurações
      const fileStats = await fs.promises.stat(inputPath);
      const fileSize = fileStats.size;
      const isBigFile = fileSize > 5 * 1024 * 1024 * 1024; // 5GB
      console.log(`Iniciando transcodificação de arquivo de ${(fileSize / (1024 * 1024 * 1024)).toFixed(2)}GB`);
      
      // Define o caminho de saída com o nome do arquivo original
      const fileName = path.basename(inputPath);
      const outputPath = path.join(APP_CONFIG.VIDEO_DIRECTORY, `transcoded_${fileName.replace(/\.[^/.]+$/, "")}.mp4`);
      
      // Diretório para segmentos de transcodificação progressiva
      const segmentsDir = path.join(APP_CONFIG.VIDEO_DIRECTORY, `segments_${id}`);
      // Caminho para o segmento inicial (primeiros 20 segundos)
      const initialSegmentPath = path.join(segmentsDir, 'initial_segment.mp4');
      
      // Garante que os diretórios existem
      if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      }
      if (!fs.existsSync(segmentsDir)) {
        fs.mkdirSync(segmentsDir, { recursive: true });
      } else {
        // Limpa segmentos antigos se existirem
        fs.readdirSync(segmentsDir).forEach(file => {
          fs.unlinkSync(path.join(segmentsDir, file));
        });
      }

      // Atualiza o status em memória
      transcodingStatus.set(id, {
        isTranscoding: true,
        progress: 0,
        isTranscoded: false,
        initialSegmentReady: false,
        segmentsDir
      });

      // Atualiza o banco de dados
      await this.videoService.update(id, {
        isTranscoded: false,
        transcodingProgress: 0
      });

      // Configura opções de ffmpeg otimizadas para o tamanho do arquivo
      const ffmpegOptions: string[] = [];
      
      // Codec de vídeo básico (comum para todos os tamanhos)
      ffmpegOptions.push(`-c:v ${APP_CONFIG.TRANSCODING.VIDEO_CODEC}`);
      ffmpegOptions.push(`-c:a ${APP_CONFIG.TRANSCODING.AUDIO_CODEC}`);
      
      if (isBigFile) {
        // Configurações otimizadas para arquivos grandes
        console.log('Usando configurações otimizadas para arquivo grande');
        
        // Bitrate mais baixo para arquivos grandes para acelerar processamento
        const adaptiveBitrate = '1M';  // Bitrate mais baixo para arquivos grandes
        ffmpegOptions.push(`-b:v ${adaptiveBitrate}`);
        
        // Áudio com bitrate mais baixo
        ffmpegOptions.push(`-b:a 96k`);
        
        // Preset ultrafast para arquivos grandes
        ffmpegOptions.push(`-preset ultrafast`);
        
        // Escala menor para arquivos grandes (720p)
        ffmpegOptions.push('-vf scale=-2:720');
        
        // Keyframes mais frequentes para melhor seeking
        ffmpegOptions.push('-g 48');
        
        // Threads máximos
        ffmpegOptions.push('-threads 0');
        
        // GOP fechado para melhor seeking
        ffmpegOptions.push('-flags +cgop');
      } else {
        // Configurações padrão para arquivos normais
        ffmpegOptions.push(`-b:v ${APP_CONFIG.TRANSCODING.VIDEO_BITRATE}`);
        ffmpegOptions.push(`-b:a ${APP_CONFIG.TRANSCODING.AUDIO_BITRATE}`);
        ffmpegOptions.push(`-preset ${APP_CONFIG.TRANSCODING.PRESET}`);
      }
      
      // Opções comuns para todos os tamanhos
      ffmpegOptions.push('-movflags +faststart');

      console.log('Opções de transcodificação:', ffmpegOptions.join(' '));

      // Primeiro, transcodifica apenas os primeiros 20 segundos
      console.log('Iniciando transcodificação dos primeiros 20 segundos...');
      const initialSegmentOptions = [...ffmpegOptions];
      initialSegmentOptions.push('-ss 0'); // Começa do início
      initialSegmentOptions.push('-t 20'); // Duração de 20 segundos
      
      const initialTranscoder = ffmpeg(inputPath)
        .outputOptions(initialSegmentOptions)
        .output(initialSegmentPath)
        .on('start', (commandLine) => {
          console.log(`Comando ffmpeg para segmento inicial: ${commandLine}`);
        })
        .on('progress', (progress) => {
          const percent = Math.round((progress.percent || 0) * 100) / 100;
          console.log(`Progresso do segmento inicial: ${percent.toFixed(2)}%`);
        })
        .on('end', () => {
          console.log('Segmento inicial concluído');
          
          // Atualiza o status para indicar que o segmento inicial está pronto
          const currentStatus = transcodingStatus.get(id);
          if (currentStatus) {
            transcodingStatus.set(id, {
              ...currentStatus,
              initialSegmentReady: true
            });
          }
          
          // Emite evento para o cliente saber que pode começar a reproduzir
          transcodingEvents.emit(`transcode:${id}:initial`, { 
            ready: true, 
            path: initialSegmentPath 
          });
          
          // Começa a transcodificação completa em background
          this.startFullTranscoding(id, inputPath, outputPath, ffmpegOptions, isBigFile);
        })
        .on('error', (err) => {
          console.error(`Erro na transcodificação do segmento inicial: ${err.message}`);
          // Se falhar o segmento inicial, tenta fazer transcodificação completa diretamente
          this.startFullTranscoding(id, inputPath, outputPath, ffmpegOptions, isBigFile);
        });
      
      // Inicia a transcodificação do segmento inicial
      initialTranscoder.run();

      return { 
        message: `Transcodificação progressiva iniciada. Os primeiros 20 segundos estarão disponíveis em breve.`, 
        inputPath,
        outputPath,
        fileSize: `${(fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        initialSegment: initialSegmentPath
      };
    } catch (error) {
      console.error('Erro ao iniciar transcodificação:', error);
      throw new HttpException(
        `Erro ao iniciar transcodificação: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Método para iniciar transcodificação completa após o segmento inicial
  private async startFullTranscoding(
    id: string, 
    inputPath: string, 
    outputPath: string, 
    ffmpegOptions: string[],
    isBigFile: boolean
  ) {
    console.log(`Iniciando transcodificação completa para ${id}`);
    
    // Adiciona flags para permitir reprodução enquanto transcodifica
    const fullOptions = [...ffmpegOptions];
    
    // Adiciona flags cruciais para streaming durante a transcodificação
    if (!fullOptions.includes('-movflags')) {
      fullOptions.push('-movflags');
      fullOptions.push('+faststart+frag_keyframe+empty_moov+default_base_moof');
    }
    
    // Certifica-se que o GOP está configurado corretamente para fragmentação
    if (!fullOptions.some(opt => opt.startsWith('-g '))) {
      fullOptions.push('-g');
      fullOptions.push('48'); // keyframe a cada 48 frames (aproximadamente 2s em 24fps)
    }
    
    // Forçar o uso de formatos compatíveis com streaming
    if (!fullOptions.some(opt => opt.startsWith('-f '))) {
      fullOptions.push('-f');
      fullOptions.push('mp4');
    }
    
    console.log('Opções para transcodificação completa com streaming:', fullOptions.join(' '));
    
    // Inicia a transcodificação completa em background
    const transcoder = ffmpeg(inputPath)
      .outputOptions(fullOptions)
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log(`Comando ffmpeg completo iniciado: ${commandLine}`);
      })
      .on('codecData', (data) => {
        console.log('Dados de codec do input:', data);
      })
      .on('progress', (progress) => {
        const percent = Math.round((progress.percent || 0) * 100) / 100;
        
        // Para arquivos grandes, atualiza menos frequentemente para reduzir carga no banco
        const shouldUpdateDatabase = isBigFile 
          ? (percent % 10 < 0.5) // A cada 10% para arquivos grandes
          : (percent % 5 < 0.5); // A cada 5% para arquivos normais
        
        // Atualiza o status em memória
        const currentStatus = transcodingStatus.get(id);
        if (currentStatus) {
          transcodingStatus.set(id, {
            ...currentStatus,
            isTranscoding: true,
            progress: percent,
            isTranscoded: percent >= 100 // Considera como transcodificado quando atinge 100%
          });
        }
        
        // Emite o evento de progresso
        transcodingEvents.emit(`transcode:${id}`, { percent });
        
        // Atualiza o progresso no banco de dados (apenas periodicamente)
        if (shouldUpdateDatabase) {
          console.log(`Progresso de transcodificação completa: ${percent.toFixed(2)}%`);
          this.videoService.update(id, { 
            transcodingProgress: percent,
            // Atualiza o status de transcodificação à medida que avança
            isTranscoded: percent >= 100,
            transcodedFilePath: percent >= 100 ? 
              path.basename(outputPath) : 
              undefined
          })
            .catch(err => console.error('Erro ao atualizar progresso no banco:', err));
        }
      })
      .on('end', () => {
        console.log(`Transcodificação do vídeo ${id} concluída`);
        
        // Atualiza o status em memória
        const currentStatus = transcodingStatus.get(id);
        if (currentStatus) {
          transcodingStatus.set(id, {
            ...currentStatus,
            isTranscoding: false,
            progress: 100,
            isTranscoded: true
          });
        }
        
        // Emite o evento de conclusão
        transcodingEvents.emit(`transcode:${id}`, { percent: 100 });
        
        // Atualiza o banco de dados
        const fileName = path.basename(inputPath);
        const transcodedFileName = `transcoded_${fileName.replace(/\.[^/.]+$/, "")}.mp4`;
        this.videoService.update(id, {
          isTranscoded: true,
          transcodedFilePath: transcodedFileName,
          transcodingProgress: 100
        }).catch(err => console.error('Erro ao atualizar status no banco:', err));
        
        // Limpa os segmentos temporários após um tempo
        setTimeout(() => {
          try {
            const segmentsDir = currentStatus?.segmentsDir;
            if (segmentsDir && fs.existsSync(segmentsDir)) {
              fs.readdirSync(segmentsDir).forEach(file => {
                fs.unlinkSync(path.join(segmentsDir, file));
              });
              fs.rmdirSync(segmentsDir);
              console.log(`Diretório de segmentos removido: ${segmentsDir}`);
            }
          } catch (err) {
            console.error('Erro ao limpar diretório de segmentos:', err);
          }
        }, 60000); // Limpa após 1 minuto de transcodificação completa
      })
      .on('error', (err) => {
        console.error(`Erro na transcodificação completa do vídeo ${id}:`, err);
        
        // Atualiza o status em memória
        const currentStatus = transcodingStatus.get(id);
        if (currentStatus) {
          transcodingStatus.set(id, {
            ...currentStatus,
            isTranscoding: false,
            progress: 0,
            isTranscoded: false,
            error: err.message
          });
        }
        
        // Emite o evento de erro
        transcodingEvents.emit(`transcode:${id}:error`, err);
        
        // Atualiza o banco de dados
        this.videoService.update(id, {
          isTranscoded: false,
          transcodingProgress: 0
        }).catch(err => console.error('Erro ao atualizar status no banco:', err));
      });
    
    // Inicia a transcodificação completa
    transcoder.run();
  }

  @Get(':id/transcode')
  async transcodeVideo(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    try {
      const video = await this.videoService.findOne(id);
      if (!video) {
        throw new HttpException('Vídeo não encontrado', HttpStatus.NOT_FOUND);
      }

      // Define o caminho de saída padrão
      const fileName = path.basename(video.filePath);
      const outputPath = path.join(APP_CONFIG.VIDEO_DIRECTORY, `transcoded_${fileName.replace(/\.[^/.]+$/, "")}.mp4`);

      // Verifica se o arquivo já foi completamente transcodificado
      if (fs.existsSync(outputPath)) {
        const stat = fs.statSync(outputPath);
        const fileSize = stat.size;
        
        // Se o arquivo existe, verifica se está completo
        const status = transcodingStatus.get(id);
        const isCompletelyTranscoded = !status?.isTranscoding || status?.progress >= 100;
        
        // Se o arquivo não está completamente transcodificado mas já possui conteúdo
        // ainda assim podemos realizar o streaming do que já está disponível
        if (fileSize > 0) {
          console.log(`Streaming arquivo transcodificado ${isCompletelyTranscoded ? 'completo' : 'parcial'}: ${outputPath}, tamanho: ${fileSize}`);
          
          // Atualiza o banco para marcar como transcodificado se necessário
          if (!video.isTranscoded && isCompletelyTranscoded) {
            await this.videoService.update(id, {
              isTranscoded: true,
              transcodedFilePath: `transcoded_${fileName.replace(/\.[^/.]+$/, "")}.mp4`,
              transcodingProgress: 100
            });
          }
          
          return this.videoService.streamVideo(id, res.req.headers.range || 'bytes=0-', res, outputPath);
        }
      }

      // Verifica se o segmento inicial está disponível enquanto o completo é processado
      const status = transcodingStatus.get(id);
      if (status && status.initialSegmentReady) {
        const segmentsDir = status.segmentsDir;
        const initialSegmentPath = path.join(segmentsDir, 'initial_segment.mp4');
        
        if (fs.existsSync(initialSegmentPath)) {
          console.log(`Usando segmento inicial enquanto o arquivo completo é transcodificado: ${initialSegmentPath}`);
          return this.videoService.streamVideo(id, res.req.headers.range || 'bytes=0-', res, initialSegmentPath);
        }
      }

      // Se está em processo de transcodificação e não tem arquivo pronto
      if (status && status.isTranscoding) {
        return res.status(HttpStatus.PROCESSING).json({
          message: 'Vídeo em processo de transcodificação',
          progress: status.progress,
          initialSegmentReady: status.initialSegmentReady
        });
      }

      // Se não está em transcodificação, inicia o processo
      res.status(HttpStatus.ACCEPTED).json({
        message: 'Iniciando transcodificação',
        videoId: id
      });
      
      // Inicia a transcodificação em background
      this.startTranscoding(id).catch(err => {
        console.error('Erro ao iniciar transcodificação:', err);
      });
    } catch (error) {
      console.error('Erro ao transcodificar vídeo:', error);
      throw new HttpException(
        `Erro ao transcodificar vídeo: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id/transcode/progress')
  async getTranscodingProgress(@Param('id') id: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendProgress = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const progressHandler = (data: any) => {
      sendProgress(data);
      if (data.percent >= 100) {
        transcodingEvents.removeListener(`transcode:${id}`, progressHandler);
      }
    };

    const errorHandler = (error: any) => {
      sendProgress({ error: 'Erro na transcodificação' });
      transcodingEvents.removeListener(`transcode:${id}:error`, errorHandler);
    };

    transcodingEvents.on(`transcode:${id}`, progressHandler);
    transcodingEvents.on(`transcode:${id}:error`, errorHandler);

    res.on('close', () => {
      transcodingEvents.removeListener(`transcode:${id}`, progressHandler);
      transcodingEvents.removeListener(`transcode:${id}:error`, errorHandler);
    });
  }

  @Post(':id/position')
  async savePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: { position: number }
  ) {
    console.log(`Salvando posição do vídeo ${id}: ${data.position}`);
    await this.videoService.savePosition(id, data.position);
    return { success: true };
  }

  @Get(':id/position')
  async getPosition(@Param('id', ParseUUIDPipe) id: string) {
    try {
      // Primeiro verifica se o vídeo existe
      const video = await this.videoService.findOne(id);
      if (video && video.lastPosition !== null && video.lastPosition !== undefined) {
        console.log(`Retornando posição do banco de dados: ${video.lastPosition}`);
        return { position: video.lastPosition };
      }
      
      // Se não encontrar no banco, tenta obter do cache
      const cachedPosition = await this.videoService.getPositionFromCache(id);
      if (cachedPosition !== null) {
        console.log(`Retornando posição do cache: ${cachedPosition}`);
        return { position: cachedPosition };
      }
      
      // Se não encontrar, retorna 0
      return { position: 0 };
    } catch (error) {
      console.error('Erro ao buscar posição do vídeo:', error);
      return { position: 0, error: 'Não foi possível obter a posição do vídeo' };
    }
  }

  @Get(':id/transcode/initial-segment')
  async getInitialSegment(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request, @Res() res: Response) {
    try {
      const video = await this.videoService.findOne(id);
      if (!video) {
        throw new NotFoundException('Vídeo não encontrado');
      }
      
      // Verifica se o segmento inicial está pronto
      const status = transcodingStatus.get(id);
      
      if (!status || !status.initialSegmentReady) {
        return res.status(HttpStatus.ACCEPTED).json({ 
          message: 'Segmento inicial ainda não está pronto',
          ready: false
        });
      }
      
      // Caminho para o segmento inicial
      const segmentsDir = status.segmentsDir;
      const initialSegmentPath = path.join(segmentsDir, 'initial_segment.mp4');
      
      if (!fs.existsSync(initialSegmentPath)) {
        return res.status(HttpStatus.NOT_FOUND).json({ 
          message: 'Segmento inicial não encontrado',
          ready: false
        });
      }
      
      // Configuração para streaming do segmento inicial
      const stat = fs.statSync(initialSegmentPath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(initialSegmentPath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        });
        
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        });
        
        fs.createReadStream(initialSegmentPath).pipe(res);
      }
    } catch (error) {
      console.error('Erro ao obter segmento inicial:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: `Erro ao obter segmento inicial: ${error.message}`,
        ready: false
      });
    }
  }
  
  @Get(':id/transcode/initial-status')
  async checkInitialSegmentStatus(@Param('id', ParseUUIDPipe) id: string) {
    const status = transcodingStatus.get(id);
    
    if (!status) {
      return { ready: false, message: 'Transcodificação não iniciada' };
    }
    
    return { 
      ready: status.initialSegmentReady, 
      message: status.initialSegmentReady ? 
        'Segmento inicial pronto para reprodução' : 
        'Segmento inicial em processamento',
      path: status.initialSegmentReady ? 
        `/api/videos/${id}/transcode/initial-segment` : 
        null
    };
  }

  @Get(':id/transcode/progress/events')
  async getTranscodingProgressEvents(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    // ... existing code ...
  }

  @Get(':id/transcode/cancel')
  async cancelTranscoding(@Param('id', ParseUUIDPipe) id: string) {
    try {
      // Atualiza o status em memória
      transcodingStatus.set(id, {
        isTranscoding: false,
        progress: 0,
        isTranscoded: false,
        initialSegmentReady: false,
        segmentsDir: path.join(APP_CONFIG.VIDEO_DIRECTORY, `segments_${id}`)
      });
      
      // Emite o evento de cancelamento
      transcodingEvents.emit(`transcode:${id}:cancel`);
      
      // Atualiza o banco de dados
      await this.videoService.update(id, {
        isTranscoded: false,
        transcodingProgress: 0
      });
      
      return { 
        message: 'Transcodificação cancelada com sucesso'
      };
    } catch (error) {
      console.error('Erro ao cancelar transcodificação:', error);
      throw new HttpException(
        'Erro ao cancelar transcodificação',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}