import React, { useEffect, useState } from 'react';
import { 
  Typography, 
  Paper,
  Box,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import axios from 'axios';
import { AddVideo } from './AddVideo';
import EditVideoDialog from './EditVideoDialog';
import { APP_CONFIG } from '../config/app.config';
import SearchIcon from '@mui/icons-material/Search';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import MovieIcon from '@mui/icons-material/Movie';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SortIcon from '@mui/icons-material/Sort';
import FilterListIcon from '@mui/icons-material/FilterList';
import EditIcon from '@mui/icons-material/Edit';

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

// Função para extrair a extensão do arquivo
const getFileExtension = (filePath: string): string => {
  const match = filePath.match(/\.([^.]+)$/);
  return match ? match[1].toUpperCase() : '';
};

// Função para gerar uma categoria baseada no nome do arquivo
const getCategoryFromFilename = (filename: string): string => {
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.includes('movie') || lowerFilename.includes('film')) return 'Filmes';
  if (lowerFilename.includes('episode') || lowerFilename.includes('season') || lowerFilename.includes('s01') || lowerFilename.includes('e01')) return 'Séries';
  if (lowerFilename.includes('tutorial') || lowerFilename.includes('course')) return 'Tutoriais';
  if (lowerFilename.includes('music') || lowerFilename.includes('concert')) return 'Música';
  if (lowerFilename.includes('documentary')) return 'Documentários';
  
  // Identifica se é filme baseado em padrões comuns de nomes de arquivos de filmes
  if (/\(\d{4}\)/.test(filename) || // Filme (2023)
      /\.\d{4}\./.test(filename) || // Filme.2023.
      /\d{4}\./.test(filename) ||   // 2023.Filme
      lowerFilename.includes('1080p') || 
      lowerFilename.includes('720p') ||
      lowerFilename.includes('2160p') ||
      lowerFilename.includes('bluray') ||
      lowerFilename.includes('brrip') ||
      lowerFilename.includes('dvdrip') ||
      lowerFilename.includes('webrip')) {
    return 'Filmes';
  }
  
  return 'Outros';
};

// Função para gerar cor aleatória porém consistente para o mesmo texto
const getColorForText = (text: string): string => {
  const colors = [
    '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800'
  ];
  
  // Soma simples de valores ASCII para obter índice consistente
  let sum = 0;
  for (let i = 0; i < text.length; i++) {
    sum += text.charCodeAt(i);
  }
  
  return colors[sum % colors.length];
};

// Gera uma cor para cada categoria
const getCategoryColor = (category: string): string => {
  return getColorForText(category);
};

interface VideoListProps {
  onVideoSelect: (video: Video) => void;
  currentVideo?: Video | null;
}

export const VideoList: React.FC<VideoListProps> = ({ onVideoSelect, currentVideo }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az' | 'za'>('newest');
  
  // Estado para controlar o diálogo de edição
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

  // Formatar duração de forma legível
  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Formatar última posição de reprodução
  const formatLastPosition = (seconds: number, duration: number = 0) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    // Calcula a porcentagem assistida
    let watchedPercent = 0;
    if (duration > 0) {
      watchedPercent = Math.round((seconds / duration) * 100);
    }
    
    return {
      time: `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`,
      percent: watchedPercent
    };
  };
  
  // Formatar tamanho do arquivo
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Desconhecido';
    
    const kb = bytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }
    
    const mb = kb / 1024;
    if (mb < 1024) {
      return `${mb.toFixed(2)} MB`;
    }
    
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  // Buscar vídeos da API
  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${APP_CONFIG.API_BASE_URL}/videos`);
      setVideos(response.data);
      setFilteredVideos(response.data);
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
      setError('Não foi possível carregar os vídeos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Importar vídeos do diretório
  const importVideosFromDirectory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(`${APP_CONFIG.API_BASE_URL}/videos/import-from-directory`);
      console.log('Importação concluída:', response.data);
      
      // Recarrega a lista de vídeos
      await fetchVideos();
    } catch (error) {
      console.error('Erro ao importar vídeos:', error);
      setError('Não foi possível importar os vídeos. Verifique se o diretório existe e tem permissões.');
    } finally {
      setLoading(false);
    }
  };
  
  // Menus para ordenação e filtros
  const handleSortMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget);
  };
  
  const handleSortMenuClose = () => {
    setSortAnchorEl(null);
  };
  
  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };
  
  const handleFilterMenuClose = () => {
    setFilterAnchorEl(null);
  };
  
  // Aplicar filtros e ordenação
  const applyFiltersAndSort = () => {
    let result = [...videos];
    
    // Aplicar busca por termo
    if (searchTerm) {
      result = result.filter(video => 
        (video.alias || video.title).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Aplicar filtro por categoria
    if (categoryFilter !== 'Todos') {
      result = result.filter(video => 
        getCategoryFromFilename(video.title) === categoryFilter
      );
    }
    
    // Aplicar ordenação
    switch (sortOrder) {
      case 'newest':
        result.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'oldest':
        result.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
        break;
      case 'az':
        result.sort((a, b) => (a.alias || a.title).localeCompare(b.alias || b.title));
        break;
      case 'za':
        result.sort((a, b) => (b.alias || b.title).localeCompare(a.alias || a.title));
        break;
    }
    
    setFilteredVideos(result);
  };
  
  // Efeito para aplicar filtros quando mudam
  useEffect(() => {
    applyFiltersAndSort();
  }, [videos, searchTerm, categoryFilter, sortOrder]);

  // Efeito para carregar vídeos inicialmente
  useEffect(() => {
    fetchVideos();
  }, []);
  
  // Extrair todas as categorias dos vídeos
  const getUniqueCategories = () => {
    const categories = videos.map(video => getCategoryFromFilename(video.title));
    return ['Todos', ...Array.from(new Set(categories))];
  };
  
  // Agrupar vídeos por categoria
  const groupVideosByCategory = () => {
    const groups: { [key: string]: Video[] } = {};
    
    filteredVideos.forEach(video => {
      const category = getCategoryFromFilename(video.title);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(video);
    });
    
    return groups;
  };

  // Função para obter o melhor nome para exibição (alias ou título)
  const getDisplayName = (video: Video): string => {
    return video.alias || video.title;
  };

  // Função para abrir o diálogo de edição
  const handleEditVideo = (video: Video, event: React.MouseEvent) => {
    event.stopPropagation(); // Impede que o clique seja propagado para o card
    setSelectedVideo(video);
    setEditDialogOpen(true);
  };
  
  // Função para atualizar vídeo na lista após edição
  const handleVideoUpdated = async (updatedVideo: Video) => {
    try {
      // Primeiro atualizamos a interface com a resposta imediata
      const updatedVideos = videos.map(video => 
        video.id === updatedVideo.id ? updatedVideo : video
      );
      setVideos(updatedVideos);
      
      // Se estiver vendo um vídeo que foi atualizado, atualiza a referência
      if (currentVideo && currentVideo.id === updatedVideo.id) {
        onVideoSelect(updatedVideo);
      }
      
      // Reaplica filtros e ordenação
      applyFiltersAndSort();
      
      // Depois fazemos uma nova requisição para garantir sincronização com o servidor
      console.log("Atualizando lista de vídeos após edição...");
      await fetchVideos();
      console.log("Lista de vídeos atualizada!");
    } catch (error) {
      console.error("Erro ao atualizar lista de vídeos após edição:", error);
    }
  };

  return (
    <Paper elevation={3} sx={{ height: '100%', overflow: 'auto', pb: 2 }}>
      <Box p={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ color: theme.palette.primary.main }}>
            Biblioteca
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="contained" 
              onClick={importVideosFromDirectory}
              disabled={loading}
              startIcon={<FolderOpenIcon />}
              size="small"
            >
              Importar
            </Button>
            <AddVideo onVideoAdded={fetchVideos} />
          </Box>
        </Box>
        
        {/* Pesquisa e Filtros */}
        <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField
            placeholder="Pesquisar vídeos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            variant="outlined"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
            <Tooltip title="Ordenar">
              <IconButton onClick={handleSortMenuOpen} size="small">
                <SortIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={sortAnchorEl}
              open={Boolean(sortAnchorEl)}
              onClose={handleSortMenuClose}
            >
              <MenuItem 
                onClick={() => { setSortOrder('newest'); handleSortMenuClose(); }}
                selected={sortOrder === 'newest'}
              >
                Mais recentes
              </MenuItem>
              <MenuItem 
                onClick={() => { setSortOrder('oldest'); handleSortMenuClose(); }}
                selected={sortOrder === 'oldest'}
              >
                Mais antigos
              </MenuItem>
              <MenuItem 
                onClick={() => { setSortOrder('az'); handleSortMenuClose(); }}
                selected={sortOrder === 'az'}
              >
                A-Z
              </MenuItem>
              <MenuItem 
                onClick={() => { setSortOrder('za'); handleSortMenuClose(); }}
                selected={sortOrder === 'za'}
              >
                Z-A
              </MenuItem>
            </Menu>
            
            <Tooltip title="Filtrar por categoria">
              <IconButton onClick={handleFilterMenuOpen} size="small">
                <FilterListIcon />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={filterAnchorEl}
              open={Boolean(filterAnchorEl)}
              onClose={handleFilterMenuClose}
            >
              {getUniqueCategories().map(category => (
                <MenuItem 
                  key={category}
                  onClick={() => { 
                    setCategoryFilter(category); 
                    handleFilterMenuClose(); 
                  }}
                  selected={categoryFilter === category}
                >
                  {category}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : filteredVideos.length === 0 ? (
          <Typography variant="body1" color="text.secondary" align="center" py={4}>
            Nenhum vídeo encontrado. Adicione um vídeo ou importe da pasta para começar.
          </Typography>
        ) : categoryFilter !== 'Todos' ? (
          // Visualização quando um filtro de categoria está ativo
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip 
                label={categoryFilter} 
                color="primary"
                onDelete={() => setCategoryFilter('Todos')}
                sx={{ mr: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                {filteredVideos.length} vídeos
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredVideos.map((video) => {
                const category = getCategoryFromFilename(video.title);
                const extension = getFileExtension(video.filePath);
                const watchedInfo = formatLastPosition(video.lastPosition || 0, video.duration);
                
                return (
                  <Card 
                    key={video.id}
                    elevation={currentVideo?.id === video.id ? 8 : 2}
                    sx={{
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 6
                      },
                      border: currentVideo?.id === video.id ? `2px solid ${theme.palette.primary.main}` : 'none',
                      position: 'relative'
                    }}
                  >
                    <CardActionArea onClick={() => onVideoSelect(video)}>
                      <Box sx={{ position: 'relative' }}>
                        <CardMedia
                          component="div"
                          sx={{
                            height: 140,
                            bgcolor: getColorForText(video.title),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff'
                          }}
                        >
                          <MovieIcon sx={{ fontSize: 40 }} />
                        </CardMedia>
                        <Box 
                          sx={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.3s',
                            '&:hover': {
                              opacity: 1,
                              backgroundColor: 'rgba(0, 0, 0, 0.5)'
                            }
                          }}
                        >
                          <PlayCircleOutlineIcon sx={{ fontSize: 60, color: '#fff' }} />
                        </Box>
                        
                        {/* Categoria */}
                        <Chip 
                          label={category}
                          size="small"
                          sx={{ 
                            position: 'absolute', 
                            top: 8, 
                            left: 8,
                            backgroundColor: getCategoryColor(category),
                            color: '#fff'
                          }}
                        />
                        
                        {/* Extensão do arquivo */}
                        <Chip 
                          label={extension}
                          size="small"
                          sx={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 8,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: '#fff'
                          }}
                        />
                        
                        {/* Progresso de visualização */}
                        {typeof watchedInfo !== 'string' && watchedInfo.percent > 0 && (
                          <Box sx={{ 
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            width: `${watchedInfo.percent}%`, 
                            height: 4,
                            bgcolor: theme.palette.primary.main
                          }} />
                        )}
                      </Box>
                      <CardContent>
                        <Typography gutterBottom variant="subtitle1" component="div" noWrap>
                          {getDisplayName(video)}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Typography variant="body2" color="text.secondary" display="flex" alignItems="center">
                            <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, fontSize: 16 }} />
                            {formatDuration(video.duration || 0)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatFileSize(video.fileSize)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                    
                    {/* Botão de edição */}
                    <Box sx={{ position: 'absolute', top: 40, right: 8, zIndex: 2 }}>
                      <Tooltip title="Editar">
                        <IconButton 
                          size="small"
                          onClick={(e) => handleEditVideo(video, e)}
                          sx={{ 
                            bgcolor: 'background.paper',
                            color: theme.palette.primary.main,
                            '&:hover': {
                              bgcolor: theme.palette.primary.light,
                              color: 'white'
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Card>
                );
              })}
            </Box>
          </Box>
        ) : (
          // Visualização agrupada por categoria
          <Box>
            {Object.entries(groupVideosByCategory()).map(([category, categoryVideos]) => (
              <Box key={category} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      color: getCategoryColor(category),
                      fontWeight: 'bold'
                    }}
                  >
                    {category}
                    <Chip 
                      label={categoryVideos.length}
                      size="small"
                      sx={{ ml: 1, height: 18, fontSize: '0.625rem', backgroundColor: getCategoryColor(category), color: '#fff' }}
                    />
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {categoryVideos.map((video) => {
                    const extension = getFileExtension(video.filePath);
                    const watchedInfo = formatLastPosition(video.lastPosition || 0, video.duration);
                    
                    return (
                      <Card 
                        key={video.id}
                        elevation={currentVideo?.id === video.id ? 8 : 2}
                        sx={{
                          width: isMobile ? 180 : 220,
                          flexShrink: 0,
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: 6
                          },
                          border: currentVideo?.id === video.id ? `2px solid ${theme.palette.primary.main}` : 'none',
                          position: 'relative'
                        }}
                      >
                        <CardActionArea onClick={() => onVideoSelect(video)}>
                          <Box sx={{ position: 'relative' }}>
                            <CardMedia
                              component="div"
                              sx={{
                                height: 120,
                                width: '100%',
                                bgcolor: getColorForText(video.title),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff'
                              }}
                            >
                              <MovieIcon sx={{ fontSize: 40 }} />
                            </CardMedia>
                            
                            <Box 
                              sx={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                transition: 'opacity 0.3s',
                                '&:hover': {
                                  opacity: 1,
                                  backgroundColor: 'rgba(0, 0, 0, 0.5)'
                                }
                              }}
                            >
                              <PlayCircleOutlineIcon sx={{ fontSize: 60, color: '#fff' }} />
                            </Box>
                            
                            {/* Extensão do arquivo */}
                            <Chip 
                              label={extension}
                              size="small"
                              sx={{ 
                                position: 'absolute', 
                                top: 8, 
                                right: 8,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                color: '#fff'
                              }}
                            />
                            
                            {/* Progresso de visualização */}
                            {typeof watchedInfo !== 'string' && watchedInfo.percent > 0 && (
                              <Box sx={{ 
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                width: `${watchedInfo.percent}%`, 
                                height: 3,
                                bgcolor: theme.palette.primary.main
                              }} />
                            )}
                          </Box>
                          <CardContent sx={{ py: 1, px: 2 }}>
                            <Typography gutterBottom variant="body2" component="div" noWrap>
                              {getDisplayName(video)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="flex" alignItems="center">
                              <AccessTimeIcon sx={{ mr: 0.5, fontSize: 12 }} />
                              {formatDuration(video.duration || 0)}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                        
                        {/* Botão de edição */}
                        <Box sx={{ position: 'absolute', top: 40, right: 8, zIndex: 2 }}>
                          <Tooltip title="Editar">
                            <IconButton 
                              size="small"
                              onClick={(e) => handleEditVideo(video, e)}
                              sx={{ 
                                bgcolor: 'background.paper',
                                color: theme.palette.primary.main,
                                '&:hover': {
                                  bgcolor: theme.palette.primary.light,
                                  color: 'white'
                                },
                                width: 24,
                                height: 24
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Card>
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      {/* Diálogo de edição */}
      <EditVideoDialog 
        video={selectedVideo}
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleVideoUpdated}
      />
    </Paper>
  );
}; 