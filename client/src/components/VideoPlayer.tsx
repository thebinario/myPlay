import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Slider,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
  Button,
  Alert,
  LinearProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SpeedIcon from '@mui/icons-material/Speed';
import ReplayIcon from '@mui/icons-material/Replay';
import SettingsIcon from '@mui/icons-material/Settings';
import axios from 'axios';
import { APP_CONFIG } from '../config/app.config';

// Cache para armazenar posições de vídeo
const videoCache = new Map<string, { position: number; timestamp: number }>();

// Função para limpar cache antigo (mais de 24 horas)
const cleanOldCache = () => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

  videoCache.forEach((value, key) => {
    if (now - value.timestamp > oneDay) {
      videoCache.delete(key);
    }
  });
};

// Formatos de vídeo que frequentemente precisam de transcodificação
const FORMATS_NEEDING_TRANSCODING = ['.mkv', '.avi', '.wmv', '.mov', '.flv'];

// Indicadores no nome de arquivo que sugerem arquivos grandes que precisarão de transcodificação
const LARGE_FILE_INDICATORS = [
  '1080p',
  '4k',
  '2160p',
  '10bit',
  'bluray',
  'x264',
  'remux',
  'remastered',
];

// Limpa cache antigo a cada 12 horas
setInterval(cleanOldCache, 12 * 60 * 60 * 1000);

interface VideoPlayerProps {
  video: {
    id: string;
    title: string;
    filePath: string;
    alias?: string;
  };
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [speedAnchorEl, setSpeedAnchorEl] = useState<null | HTMLElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isTranscoding, setIsTranscoding] = useState(false);
  const [transcodingProgress, setTranscodingProgress] = useState(0);
  const [useTranscodedVersion, setUseTranscodedVersion] = useState(false);
  const [useInitialSegment, setUseInitialSegment] = useState(false);
  const [initialSegmentAvailable, setInitialSegmentAvailable] = useState(false);
  const [fullTranscodingProgress, setFullTranscodingProgress] = useState(0);
  const [checkIntervalRef, setCheckIntervalRef] = useState<NodeJS.Timeout | null>(null);
  const maxRetries = 3;
  const retryDelay = 2000;
  const transcodingEventSourceRef = useRef<EventSource | null>(null);
  const initialSegmentCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Referência para último timestamp de salvamento
  const lastSaveTimestamp = useRef<number>(0);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      console.log('Metadados do vídeo carregados:', {
        duration: videoRef.current.duration,
        videoWidth: videoRef.current.videoWidth,
        videoHeight: videoRef.current.videoHeight,
        readyState: videoRef.current.readyState,
      });
      setIsLoading(false);
    }
  };

  const checkBackendAvailability = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/health');
      return response.ok;
    } catch (error) {
      console.error('Error checking backend availability:', error);
      return false;
    }
  };

  // Verificar se o vídeo precisa ser transcodificado com base na extensão e no nome
  const checkIfNeedsTranscoding = (filePath: string): boolean => {
    if (!filePath) return false;

    // Verifica extensão do arquivo
    const fileExt = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    const isUnsupportedFormat = FORMATS_NEEDING_TRANSCODING.includes(fileExt);

    // Verifica se o nome contém indicadores de arquivo grande
    const fileName = filePath.toLowerCase();
    const isLikelyLarge = LARGE_FILE_INDICATORS.some((indicator) =>
      fileName.includes(indicator.toLowerCase()),
    );

    console.log(`Verificando se arquivo precisa de transcodificação: ${filePath}`);
    console.log(`- Formato não suportado nativo: ${isUnsupportedFormat}`);
    console.log(`- Provável arquivo grande: ${isLikelyLarge}`);

    return isUnsupportedFormat || isLikelyLarge;
  };

  // Verifica status atual da transcodificação
  const checkTranscodingStatus = async () => {
    try {
      const response = await axios.get(
        `${APP_CONFIG.API_BASE_URL}/videos/${video.id}/transcode/status`,
      );
      const { isTranscoded, progress, initialSegmentReady } = response.data;

      // Verifica se o segmento inicial está pronto
      if (initialSegmentReady && !initialSegmentAvailable) {
        setInitialSegmentAvailable(true);
        console.log('Segmento inicial disponível para reprodução');

        if (isTranscoding && progress < 100) {
          setUseInitialSegment(true);
          setError(null);
        }
      }

      if (isTranscoded) {
        setUseTranscodedVersion(true);
        setIsTranscoding(false);
        setTranscodingProgress(100);
        setUseInitialSegment(false);
        return true;
      } else if (progress > 0) {
        // Já está em processo de transcodificação
        setIsTranscoding(true);
        setTranscodingProgress(progress);
        startTranscodingProgressMonitor();
        return false;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar status da transcodificação:', error);
      return false;
    }
  };

  // Verifica status do segmento inicial
  const checkInitialSegmentStatus = async () => {
    try {
      const response = await axios.get(APP_CONFIG.VIDEO.TRANSCODE_INITIAL_STATUS_URL(video.id));
      const { ready } = response.data;

      if (ready && !initialSegmentAvailable) {
        setInitialSegmentAvailable(true);
        setUseInitialSegment(true);
        setError(null);

        if (videoRef.current) {
          videoRef.current.src = APP_CONFIG.VIDEO.TRANSCODE_INITIAL_SEGMENT_URL(video.id);
          videoRef.current.load();
          videoRef.current.play().catch(console.error);
        }

        // Limpa o intervalo de verificação quando o segmento estiver pronto
        if (initialSegmentCheckIntervalRef.current) {
          clearInterval(initialSegmentCheckIntervalRef.current);
          initialSegmentCheckIntervalRef.current = null;
        }
      }

      return ready;
    } catch (error) {
      console.error('Erro ao verificar status do segmento inicial:', error);
      return false;
    }
  };

  // Inicia monitoramento do segmento inicial
  const startInitialSegmentMonitor = () => {
    if (initialSegmentCheckIntervalRef.current) {
      clearInterval(initialSegmentCheckIntervalRef.current);
    }

    // Verifica a cada 2 segundos se o segmento inicial está pronto
    initialSegmentCheckIntervalRef.current = setInterval(async () => {
      const isReady = await checkInitialSegmentStatus();

      if (isReady) {
        if (initialSegmentCheckIntervalRef.current) {
          clearInterval(initialSegmentCheckIntervalRef.current);
          initialSegmentCheckIntervalRef.current = null;
        }
      }
    }, 2000);
  };

  // Inicia o processo de transcodificação
  const startTranscoding = () => {
    setIsTranscoding(true);
    setTranscodingProgress(0);

    // Define mensagem com base no tamanho do arquivo
    const isLikelyLarge = LARGE_FILE_INDICATORS.some((indicator) =>
      video.filePath.toLowerCase().includes(indicator.toLowerCase()),
    );

    if (isLikelyLarge) {
      setError(
        'Este é um arquivo grande. Preparando os primeiros 20 segundos para reprodução rápida...',
      );
    } else {
      setError('Formato de vídeo não suportado. Iniciando transcodificação...');
    }

    // Iniciar transcodificação via API
    axios
      .post(`${APP_CONFIG.API_BASE_URL}/videos/${video.id}/transcode/start`)
      .then(() => {
        startTranscodingProgressMonitor();
        startInitialSegmentMonitor(); // Inicia monitoramento do segmento inicial
      })
      .catch((error) => {
        console.error('Erro ao iniciar transcodificação:', error);
        setError('Erro ao iniciar transcodificação. Tentando reproduzir diretamente...');
        setIsTranscoding(false);
      });
  };

  // Monitora o progresso da transcodificação
  const startTranscodingProgressMonitor = () => {
    // Limpa event source anterior se existir
    if (transcodingEventSourceRef.current) {
      transcodingEventSourceRef.current.close();
    }

    // Cria nova conexão SSE
    const eventSource = new EventSource(APP_CONFIG.VIDEO.TRANSCODE_PROGRESS_URL(video.id));
    transcodingEventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const progress = JSON.parse(event.data);
        setTranscodingProgress(progress.percent);
        setFullTranscodingProgress(progress.percent);

        // Se temos segmento inicial, atualiza a mensagem com o progresso da versão completa
        if (useInitialSegment && progress.percent < 100) {
          setError(
            `Reproduzindo versão inicial. Transcodificação completa em progresso: ${Math.floor(progress.percent)}%`,
          );
        }

        if (progress.percent >= 100) {
          eventSource.close();
          transcodingEventSourceRef.current = null;
          setIsTranscoding(false);
          setUseTranscodedVersion(true);
          setUseInitialSegment(false);
          setError(null);

          // Atualiza a fonte de vídeo para usar a versão transcodificada completa
          if (videoRef.current) {
            // Salva a posição atual antes de trocar
            const currentPosition = videoRef.current.currentTime;
            videoRef.current.src = APP_CONFIG.VIDEO.TRANSCODE_URL(video.id);
            videoRef.current.load();
            videoRef.current.currentTime = currentPosition; // Restaura posição
            videoRef.current.play().catch(console.error);
          }
        }
      } catch (err) {
        console.error('Erro ao processar mensagem de progresso:', err);
      }
    };

    // Escuta por eventos do segmento inicial
    eventSource.addEventListener('initial', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.ready) {
          setInitialSegmentAvailable(true);
          setUseInitialSegment(true);

          if (videoRef.current) {
            videoRef.current.src = APP_CONFIG.VIDEO.TRANSCODE_INITIAL_SEGMENT_URL(video.id);
            videoRef.current.load();
            videoRef.current.play().catch(console.error);
          }
        }
      } catch (err) {
        console.error('Erro ao processar mensagem de segmento inicial:', err);
      }
    });

    eventSource.onerror = () => {
      console.error('Erro na conexão SSE de progresso de transcodificação');
      eventSource.close();
      transcodingEventSourceRef.current = null;
    };
  };

  // Salva posição com cache em memória além do localStorage
  const saveCurrentPosition = () => {
    if (videoRef.current) {
      const currentPosition = videoRef.current.currentTime;
      // Salva no localStorage
      localStorage.setItem(`video_position_${video.id}`, currentPosition.toString());

      // Salva no cache em memória
      videoCache.set(video.id, {
        position: currentPosition,
        timestamp: Date.now(),
      });

      // Envia para o backend a cada 10 segundos para salvar no banco
      if (Math.floor(Date.now() / 10000) !== Math.floor(lastSaveTimestamp.current / 10000)) {
        try {
          axios.post(`${APP_CONFIG.API_BASE_URL}/videos/${video.id}/position`, {
            position: currentPosition,
          });
          lastSaveTimestamp.current = Date.now();
        } catch (error) {
          console.error('Erro ao salvar posição no backend:', error);
        }
      }
    }
  };

  // Carrega a última posição salva
  const loadLastPosition = async () => {
    try {
      // Primeiro tenta do cache em memória
      const cachedPosition = videoCache.get(video.id);

      if (cachedPosition && videoRef.current) {
        console.log('Carregando posição do cache em memória:', cachedPosition.position);
        videoRef.current.currentTime = cachedPosition.position;
        return;
      }

      // Se não estiver no cache, tenta do localStorage
      const localPosition = localStorage.getItem(`video_position_${video.id}`);
      if (localPosition && videoRef.current) {
        console.log('Carregando posição do localStorage:', localPosition);
        videoRef.current.currentTime = parseFloat(localPosition);
        return;
      }

      // Se nem no localStorage tiver, tenta do backend
      try {
        const response = await axios.get(`${APP_CONFIG.API_BASE_URL}/videos/${video.id}/position`);
        if (response.data.position && videoRef.current) {
          console.log('Carregando posição do backend:', response.data.position);
          videoRef.current.currentTime = response.data.position;
        }
      } catch (error) {
        console.error('Erro ao carregar posição do backend:', error);
      }
    } catch (error) {
      console.error('Erro ao carregar última posição:', error);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((error) => {
          console.error('Error playing video:', error);
          setError('Erro ao reproduzir o vídeo. Tentando reconectar...');
          handleRetry();
        });
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      saveCurrentPosition();
    }
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handlePlaying = () => {
    setIsBuffering(false);
    setError(null);
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video error:', e);

    // Não continua se já estiver transcodificando
    if (isTranscoding) return;

    // Verificar se é um erro de formato
    const videoElement = e.currentTarget;

    // Verifica se o arquivo precisa ser transcodificado
    const needsTranscoding = checkIfNeedsTranscoding(video.filePath);
    console.log(`Arquivo ${video.filePath} precisa de transcodificação: ${needsTranscoding}`);

    if (
      videoElement.error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
      videoElement.error?.code === MediaError.MEDIA_ERR_DECODE ||
      needsTranscoding
    ) {
      // Verifica se já estamos usando a versão transcodificada
      if (useTranscodedVersion) {
        setError('Erro ao reproduzir o vídeo transcodificado. Tente novamente mais tarde.');
        return;
      }

      // Mensagens personalizadas com base no tipo de arquivo
      const isLikelyLarge = LARGE_FILE_INDICATORS.some((indicator) =>
        video.filePath.toLowerCase().includes(indicator.toLowerCase()),
      );

      if (isLikelyLarge) {
        setError(
          'Este parece ser um arquivo de vídeo grande. Preparando os primeiros 20 segundos para visualização rápida...',
        );
      } else if (
        FORMATS_NEEDING_TRANSCODING.some((ext) => video.filePath.toLowerCase().endsWith(ext))
      ) {
        setError(
          `Formato de vídeo ${video.filePath.substring(video.filePath.lastIndexOf('.'))} não suportado nativo. Iniciando transcodificação...`,
        );
      } else {
        setError(
          'O formato deste vídeo não é reproduzível diretamente. Iniciando transcodificação...',
        );
      }

      // Verifica status atual da transcodificação
      checkTranscodingStatus().then((isAlreadyTranscoded) => {
        if (!isAlreadyTranscoded) {
          // Verifica se o segmento inicial está disponível
          checkInitialSegmentStatus().then((initialReady) => {
            if (initialReady) {
              // Usa o segmento inicial
              setUseInitialSegment(true);
            } else {
              // Inicia a transcodificação se não houver segmento disponível
              startTranscoding();
            }
          });
        } else {
          // Já está transcodificado, usa a versão transcodificada
          videoElement.src = APP_CONFIG.VIDEO.TRANSCODE_URL(video.id);
          videoElement.load();
          videoElement.play().catch(console.error);
        }
      });
    } else {
      setError('Erro ao carregar o vídeo. Tentando reconectar...');
      handleRetry();
    }
  };

  const handleRetry = async () => {
    if (retryCount < maxRetries) {
      setRetryCount((prev) => prev + 1);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      const isBackendAvailable = await checkBackendAvailability();
      if (isBackendAvailable) {
        if (videoRef.current) {
          videoRef.current.load();
          videoRef.current.play().catch(console.error);
        }
        setError(null);
      } else {
        setError('Servidor indisponível. Tentando novamente...');
      }
    } else {
      setError('Não foi possível conectar ao servidor após várias tentativas.');
    }
  };

  // Evento quando vídeo inicial termina (após os primeiros 20 segundos)
  const handleInitialSegmentEnded = () => {
    if (useInitialSegment && !useTranscodedVersion) {
      // Verifica se a versão completa está pronta
      checkTranscodingStatus().then((isComplete) => {
        if (isComplete) {
          // Se a versão completa estiver pronta, troca para ela
          setUseTranscodedVersion(true);
          setUseInitialSegment(false);

          if (videoRef.current) {
            videoRef.current.src = APP_CONFIG.VIDEO.TRANSCODE_URL(video.id);
            videoRef.current.load();
            videoRef.current.play().catch(console.error);
          }
        } else {
          // Se não estiver pronta, exibe mensagem de que o preview terminou
          setError(
            `O preview de 20 segundos terminou. A transcodificação completa está em ${Math.floor(transcodingProgress)}% - aguarde para ver o vídeo completo.`,
          );

          // Configura um intervalo para verificar periodicamente se a transcodificação completa está pronta
          const checkInterval = setInterval(() => {
            checkTranscodingStatus().then((isReady) => {
              if (isReady) {
                clearInterval(checkInterval);

                setUseTranscodedVersion(true);
                setUseInitialSegment(false);
                setError(null);

                if (videoRef.current) {
                  // Começa do segundo 20, onde o segmento inicial terminou
                  videoRef.current.src = APP_CONFIG.VIDEO.TRANSCODE_URL(video.id);
                  videoRef.current.load();
                  videoRef.current.currentTime = 20; // Continua de onde parou
                  videoRef.current.play().catch(console.error);
                }
              } else {
                setError(
                  `O preview terminou. Transcodificação em ${Math.floor(transcodingProgress)}% - aguarde um momento.`,
                );
              }
            });
          }, 3000); // Verifica a cada 3 segundos

          // Salva a referência do intervalo para poder limpar depois
          setCheckIntervalRef(checkInterval);
        }
      });
    }
  };

  // Efeito para verificar se o arquivo precisa ser transcodificado
  useEffect(() => {
    console.log(`[VideoPlayer] Carregando novo vídeo: ID=${video.id}, Título=${video.title}`);

    // Resetar o estado do player para o novo vídeo
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setError(null);
    setIsTranscoding(false);
    setTranscodingProgress(0);
    setUseTranscodedVersion(false);
    setUseInitialSegment(false);
    setInitialSegmentAvailable(false);

    // Se houver um intervalo de checagem ativo, limpe-o
    if (checkIntervalRef) {
      clearInterval(checkIntervalRef);
      setCheckIntervalRef(null);
    }

    if (videoRef.current) {
      console.log(`[VideoPlayer] Forçando recarregamento do player para vídeo ID=${video.id}`);
      videoRef.current.load(); // Força o recarregamento do vídeo
    }

    const needsTranscoding = checkIfNeedsTranscoding(video.filePath);
    console.log(
      `Verificando na inicialização: ${video.filePath} precisa de transcodificação: ${needsTranscoding}`,
    );

    if (needsTranscoding) {
      checkTranscodingStatus().then((isTranscoded) => {
        if (isTranscoded) {
          setUseTranscodedVersion(true);
          console.log('Usando versão transcodificada do vídeo.');
        } else {
          // Verifica se o segmento inicial está disponível
          checkInitialSegmentStatus().then((initialReady) => {
            if (initialReady) {
              setUseInitialSegment(true);
              console.log('Usando segmento inicial do vídeo.');
            } else {
              console.log(
                'Arquivo ainda não foi transcodificado e não tem segmento inicial. Continuando com versão original.',
              );
            }
          });
        }
      });
    }

    return () => {
      // Limpa event source ao desmontar
      if (transcodingEventSourceRef.current) {
        transcodingEventSourceRef.current.close();
        transcodingEventSourceRef.current = null;
      }

      // Limpa o intervalo de verificação do segmento inicial
      if (initialSegmentCheckIntervalRef.current) {
        clearInterval(initialSegmentCheckIntervalRef.current);
        initialSegmentCheckIntervalRef.current = null;
      }
    };
  }, [video.id, video.filePath]);

  useEffect(() => {
    const checkBackend = async () => {
      const isAvailable = await checkBackendAvailability();
      if (!isAvailable) {
        setError('Servidor indisponível. Tentando reconectar...');
        handleRetry();
      }
    };

    checkBackend();
    loadLastPosition();

    const interval = setInterval(saveCurrentPosition, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [video.id]);

  // Gerenciar controles de tela cheia
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Gerenciar visibilidade dos controles
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = () => {
      setShowControls(true);

      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }

      const timeout = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);

      setControlsTimeout(timeout);
    };

    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [isPlaying, controlsTimeout]);

  const handleTimeChange = (_event: Event, value: number | number[]) => {
    if (videoRef.current) {
      const newTime = value as number;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (event: Event, newValue: number | number[]) => {
    const newVolume = newValue as number;
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setIsMuted(newVolume === 0);
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleSpeedClick = (event: React.MouseEvent<HTMLElement>) => {
    setSpeedAnchorEl(event.currentTarget);
  };

  const handleSpeedClose = () => {
    setSpeedAnchorEl(null);
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
    handleSpeedClose();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Limpar intervalos e event source ao desmontar o componente
  useEffect(() => {
    // Limpa event source ao desmontar
    if (transcodingEventSourceRef.current) {
      transcodingEventSourceRef.current.close();
      transcodingEventSourceRef.current = null;
    }

    // Limpa o intervalo de verificação do segmento inicial
    if (initialSegmentCheckIntervalRef.current) {
      clearInterval(initialSegmentCheckIntervalRef.current);
      initialSegmentCheckIntervalRef.current = null;
    }

    // Limpa o intervalo de verificação da transcodificação completa
    if (checkIntervalRef) {
      clearInterval(checkIntervalRef);
      setCheckIntervalRef(null);
    }
  }, [video.id, video.filePath, checkIntervalRef]);

  // Função para obter o melhor nome para exibição (alias ou título)
  const getDisplayName = (): string => {
    return video.alias || video.title;
  };

  return (
    <Paper
      ref={containerRef}
      elevation={3}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      {error && (
        <Alert
          severity="error"
          sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}
          action={
            <Button color="inherit" size="small" onClick={handleRetry}>
              <ReplayIcon />
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      )}

      {isBuffering && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '10px 20px',
            borderRadius: '4px',
          }}
        >
          <Typography variant="body2" color="white">
            Carregando...
          </Typography>
        </Box>
      )}

      {isTranscoding && (
        <Box
          sx={{
            position: 'absolute',
            top: useInitialSegment ? '10px' : '50%',
            left: '50%',
            transform: useInitialSegment ? 'translateX(-50%)' : 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '20px',
            borderRadius: '4px',
            width: useInitialSegment ? '80%' : '80%',
            maxWidth: '400px',
            zIndex: 5,
          }}
        >
          <Typography variant="body1" color="white" align="center" gutterBottom>
            {useInitialSegment
              ? 'Transcodificação completa em andamento'
              : 'Transcodificando vídeo...'}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={transcodingProgress}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
              },
            }}
          />
          <Typography variant="body2" color="white" align="center" sx={{ mt: 1 }}>
            {Math.round(transcodingProgress)}%
          </Typography>
          <Typography
            variant="caption"
            color="white"
            align="center"
            sx={{ mt: 1, display: 'block' }}
          >
            {useInitialSegment
              ? 'Você já pode assistir ao preview enquanto o resto é processado.'
              : video.filePath.toLowerCase().includes('mkv') ||
                  LARGE_FILE_INDICATORS.some((ind) => video.filePath.toLowerCase().includes(ind))
                ? 'Este é um arquivo grande. Preparando os primeiros 20 segundos para visualização rápida...'
                : 'Este processo pode levar alguns minutos para vídeos grandes.'}
          </Typography>
        </Box>
      )}

      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onError={handleError}
        onEnded={useInitialSegment ? handleInitialSegmentEnded : undefined}
        playsInline
      >
        {useTranscodedVersion ? (
          <source src={APP_CONFIG.VIDEO.TRANSCODE_URL(video.id)} type="video/mp4" />
        ) : useInitialSegment ? (
          <source src={APP_CONFIG.VIDEO.TRANSCODE_INITIAL_SEGMENT_URL(video.id)} type="video/mp4" />
        ) : (
          <>
            <source src={APP_CONFIG.VIDEO.STREAM_URL(video.id)} type="video/mp4" />
            <source src={APP_CONFIG.VIDEO.STREAM_URL(video.id)} type="video/webm" />
          </>
        )}
        Seu navegador não suporta o elemento de vídeo.
      </video>

      {/* Título do vídeo */}
      <Typography
        variant="h5"
        component="div"
        sx={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          color: 'white',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
          maxWidth: '80%',
          zIndex: 2,
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {getDisplayName()}
      </Typography>

      {/* Controles */}
      {showControls && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '10px',
            background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 4,
          }}
        >
          {/* Slider de progresso */}
          <Slider
            value={currentTime}
            min={0}
            max={duration || 100}
            onChange={handleTimeChange}
            sx={{
              color: 'primary.main',
              height: 4,
              '& .MuiSlider-thumb': {
                width: 8,
                height: 8,
                transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                '&:before': {
                  boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
                },
                '&:hover, &.Mui-focusVisible': {
                  boxShadow: '0px 0px 0px 8px rgba(25, 118, 210, 0.16)',
                },
                '&.Mui-active': {
                  width: 12,
                  height: 12,
                },
              },
              '& .MuiSlider-rail': {
                opacity: 0.28,
              },
            }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={handlePlayPause} sx={{ color: 'white' }}>
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
              </IconButton>

              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <IconButton onClick={handleMute} sx={{ color: 'white' }}>
                  {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                </IconButton>
                <Slider
                  value={isMuted ? 0 : volume}
                  min={0}
                  max={1}
                  step={0.1}
                  onChange={handleVolumeChange}
                  sx={{
                    color: 'white',
                    width: 100,
                    '& .MuiSlider-thumb': {
                      width: 8,
                      height: 8,
                    },
                  }}
                />
              </Box>

              <Typography variant="body2" sx={{ color: 'white', ml: 1 }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={handleSpeedClick} sx={{ color: 'white' }}>
                <SpeedIcon />
              </IconButton>
              <Menu
                anchorEl={speedAnchorEl}
                open={Boolean(speedAnchorEl)}
                onClose={handleSpeedClose}
              >
                <MenuItem onClick={() => handlePlaybackRateChange(0.5)}>0.5x</MenuItem>
                <MenuItem onClick={() => handlePlaybackRateChange(1)}>1x</MenuItem>
                <MenuItem onClick={() => handlePlaybackRateChange(1.5)}>1.5x</MenuItem>
                <MenuItem onClick={() => handlePlaybackRateChange(2)}>2x</MenuItem>
              </Menu>

              <IconButton onClick={handleFullscreen} sx={{ color: 'white' }}>
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
};
