import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  CssBaseline, 
  ThemeProvider, 
  createTheme, 
  Typography, 
  Tabs, 
  Tab, 
  Button, 
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { VideoList } from './components/VideoList';
import { VideoPlayer } from './components/VideoPlayer';
import { AddVideo } from './components/AddVideo';
import { ScanDirectory } from './components/ScanDirectory';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import axios from 'axios';
import { APP_CONFIG } from './config/app.config';
import MovieIcon from '@mui/icons-material/Movie';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

interface Video {
  id: string;
  title: string;
  filePath: string;
  fileSize?: number;
  duration?: number;
  lastPosition?: number;
  createdAt?: Date;
  updatedAt?: Date;
  alias?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function App() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanningDirectory, setScanningDirectory] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const scanDirectory = async (path?: string) => {
    try {
      setScanningDirectory(true);
      console.log('Iniciando escaneamento do diretório:', path || 'diretório padrão...');
      
      const response = await axios.post(
        `${APP_CONFIG.API_BASE_URL}/videos/scan-directory`,
        { path },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Resposta do escaneamento:', response.data);
      await fetchVideos(); // Recarrega a lista de vídeos após o escaneamento
    } catch (error) {
      console.error('Erro ao escanear diretório:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
          setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
        } else if (error.response?.status === 404) {
          setError('Endpoint de escaneamento não encontrado. Verifique a configuração do backend.');
        } else if (error.response?.status === 500) {
          setError(`Erro no servidor: ${error.response.data?.error || 'Erro desconhecido'}`);
        } else {
          setError(`Erro ao escanear diretório: ${error.response?.data?.error || error.message}`);
        }
      } else {
        setError('Erro ao escanear diretório de vídeos. Verifique se o diretório existe e tem permissões corretas.');
      }
    } finally {
      setScanningDirectory(false);
    }
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${APP_CONFIG.API_BASE_URL}/videos`);
      setVideos(response.data);
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
      setError('Não foi possível carregar os vídeos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Escaneia o diretório automaticamente
        await scanDirectory();
        // Depois, carrega a lista de vídeos
        await fetchVideos();
      } catch (error) {
        console.error('Erro na inicialização:', error);
        setError('Erro ao inicializar o aplicativo. Por favor, recarregue a página.');
      }
    };

    initializeApp();
  }, []);

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
  };

  const handleNextVideo = () => {
    if (selectedVideo && videos.length > 0) {
      const currentIndex = videos.findIndex(v => v.id === selectedVideo.id);
      if (currentIndex < videos.length - 1) {
        setSelectedVideo(videos[currentIndex + 1]);
      }
    }
  };

  const handlePreviousVideo = () => {
    if (selectedVideo && videos.length > 0) {
      const currentIndex = videos.findIndex(v => v.id === selectedVideo.id);
      if (currentIndex > 0) {
        setSelectedVideo(videos[currentIndex - 1]);
      }
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
          Meu Player de Vídeo
        </Typography>
        
        {(loading || scanningDirectory) && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              {scanningDirectory ? 'Escaneando diretório de vídeos...' : 'Carregando vídeos...'}
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => {
                setError(null);
                fetchVideos();
              }}
              sx={{ ml: 2 }}
            >
              Tentar Novamente
            </Button>
          </Alert>
        )}

        {!loading && !scanningDirectory && !error && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 3,
            height: 'calc(100vh - 180px)'
          }}>
            {/* Painel esquerdo - Lista de vídeos */}
            <Box sx={{ 
              width: { xs: '100%', md: '300px' }, 
              flexShrink: 0,
              height: { xs: 'auto', md: '100%' },
              overflow: 'auto',
              borderRight: { xs: 'none', md: '1px solid rgba(255, 255, 255, 0.12)' },
              pr: { md: 2 }
            }}>
              <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                <Tab label="Vídeos" {...a11yProps(0)} />
                <Tab label="Adicionar" {...a11yProps(1)} />
                <Tab label="Escanear" {...a11yProps(2)} />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <VideoList onVideoSelect={handleVideoSelect} currentVideo={selectedVideo} />
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <AddVideo onVideoAdded={() => {
                  setTabValue(0);
                  fetchVideos();
                }} />
              </TabPanel>
              
              <TabPanel value={tabValue} index={2}>
                <ScanDirectory />
              </TabPanel>
            </Box>
            
            {/* Painel direito - Player de vídeo */}
            <Box sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: { xs: 'auto', md: '100%' },
              overflow: 'auto'
            }}>
              {selectedVideo ? (
                <>
                  <VideoPlayer video={selectedVideo} />
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <IconButton 
                        onClick={handlePreviousVideo} 
                        disabled={videos.length === 0 || videos.findIndex(v => v.id === selectedVideo.id) === 0}
                        color="primary"
                      >
                        <ArrowBackIcon />
                      </IconButton>
                      <Typography variant="h6" noWrap sx={{ maxWidth: { xs: '200px', sm: '400px', md: '600px' } }}>
                        {selectedVideo.title}
                      </Typography>
                      <IconButton 
                        onClick={handleNextVideo} 
                        disabled={videos.length === 0 || videos.findIndex(v => v.id === selectedVideo.id) === videos.length - 1}
                        color="primary"
                      >
                        <ArrowForwardIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  height: '100%',
                  flexDirection: 'column',
                  gap: 2
                }}>
                  <Typography variant="h6" color="text.secondary">
                    Selecione um vídeo para começar
                  </Typography>
                  <MovieIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
