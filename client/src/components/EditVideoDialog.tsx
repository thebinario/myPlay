import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';
import { APP_CONFIG } from '../config/app.config';
import { SelectChangeEvent } from '@mui/material/Select';

// Lista de categorias predefinidas
const PREDEFINED_CATEGORIES = [
  'Filmes',
  'Séries',
  'Documentários',
  'Tutoriais',
  'Música',
  'Pessoal',
  'Outros'
];

// Interface para o objeto Video
interface Video {
  id: string;
  title: string;
  alias?: string;
  filePath: string;
  fileSize?: number;
  duration?: number;
  lastPosition?: number;
  category?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EditVideoDialogProps {
  video: Video | null;
  open: boolean;
  onClose: () => void;
  onSave: (updatedVideo: Video) => void;
}

const EditVideoDialog: React.FC<EditVideoDialogProps> = ({ 
  video, 
  open, 
  onClose,
  onSave
}) => {
  const [alias, setAlias] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Atualiza os campos quando o vídeo muda
  useEffect(() => {
    if (video) {
      setAlias(video.alias || video.title || '');
      
      if (video.category) {
        // Se a categoria do vídeo estiver nas predefinidas, use-a
        // Caso contrário, defina como personalizada
        if (PREDEFINED_CATEGORIES.includes(video.category)) {
          setCategory(video.category);
          setCustomCategory('');
        } else {
          setCategory('custom');
          setCustomCategory(video.category);
        }
      } else {
        setCategory('');
        setCustomCategory('');
      }
    }
  }, [video]);

  const handleSave = async () => {
    if (!video) return;

    try {
      setLoading(true);
      setError(null);

      const finalCategory = category === 'custom' ? customCategory : category;
      
      const updateData = {
        alias,
        category: finalCategory
      };
      
      console.log('Enviando atualização para o backend:', JSON.stringify(updateData));
      console.log('ID do vídeo:', video.id);
      console.log('URL completa:', `${APP_CONFIG.API_BASE_URL}/videos/${video.id}`);
      
      // Chamada à API para atualizar o vídeo
      const response = await axios.patch(
        `${APP_CONFIG.API_BASE_URL}/videos/${video.id}`, 
        updateData
      );
      
      console.log('Resposta do servidor:', response.data);
      
      // Callback com vídeo atualizado
      onSave({
        ...video,
        alias,
        category: finalCategory
      });
      
      onClose();
    } catch (err) {
      console.error('Erro ao atualizar vídeo:', err);
      setError('Erro ao salvar alterações. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setCategory(value);
    
    // Se não for categoria personalizada, reseta o campo de categoria personalizada
    if (value !== 'custom') {
      setCustomCategory('');
    }
  };

  // Adicione uma função para formatar a duração
  const formatDuration = (duration: number): string => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  // Limpa os estados quando o diálogo fecha
  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          minHeight: '350px'
        }
      }}
    >
      <DialogTitle>Editar Vídeo</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          autoFocus
          margin="dense"
          id="alias"
          label="Nome de exibição"
          type="text"
          fullWidth
          variant="outlined"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          sx={{ mb: 2, mt: 1 }}
        />
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="category-label">Categoria</InputLabel>
          <Select
            labelId="category-label"
            id="category"
            value={category}
            label="Categoria"
            onChange={handleCategoryChange}
          >
            {PREDEFINED_CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
            <MenuItem value="custom">Categoria Personalizada</MenuItem>
          </Select>
        </FormControl>
        
        {category === 'custom' && (
          <TextField
            margin="dense"
            id="customCategory"
            label="Categoria Personalizada"
            type="text"
            fullWidth
            variant="outlined"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            sx={{ mb: 2 }}
          />
        )}
        
        {video && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Informações do Arquivo
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Nome original:</strong> {video.title}
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Nome do arquivo:</strong> {video.filePath.split('/').pop()}
            </Typography>
            {video.fileSize && (
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Tamanho:</strong> {(video.fileSize / (1024 * 1024)).toFixed(2)} MB
              </Typography>
            )}
            {video.duration && (
              <Typography variant="body2">
                <strong>Duração:</strong> {formatDuration(video.duration)}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained" 
          disabled={loading || !alias || (category === 'custom' && !customCategory)}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditVideoDialog; 