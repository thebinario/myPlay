import React, { useState } from 'react';
import {
  Button,
  TextField,
  Paper,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';

interface AddVideoProps {
  onVideoAdded: () => void;
}

export const AddVideo: React.FC<AddVideoProps> = ({ onVideoAdded }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [path, setPath] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('/api/videos', {
        title,
        path,
      });
      setOpen(false);
      setTitle('');
      setPath('');
      onVideoAdded();
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'Erro ao adicionar vídeo. Verifique o caminho do arquivo.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
    setTitle('');
    setPath('');
  };

  return (
    <>
      <Button variant="contained" color="primary" onClick={() => setOpen(true)} sx={{ mb: 2 }}>
        Adicionar Vídeo
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Adicionar Novo Vídeo</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              autoFocus
              margin="dense"
              label="Título do Vídeo"
              type="text"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={loading}
            />
            <TextField
              margin="dense"
              label="Caminho do Arquivo"
              type="text"
              fullWidth
              value={path}
              onChange={(e) => setPath(e.target.value)}
              required
              disabled={loading}
              helperText="Digite o caminho completo do arquivo de vídeo"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!title || !path || loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {loading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};
