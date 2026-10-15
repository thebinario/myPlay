import React, { useState } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, Alert } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import axios from 'axios';
import { APP_CONFIG } from '../config/app.config';

interface ScanResult {
  message: string;
  videos: Array<{
    id: number;
    title: string;
    path: string;
    added: boolean;
  }>;
}

export const ScanDirectory: React.FC = () => {
  const [directoryPath, setDirectoryPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Se um caminho foi especificado, usamos ele. Caso contrário, enviamos um objeto vazio
      const payload = directoryPath.trim() ? { path: directoryPath.trim() } : {};
      const url = `${APP_CONFIG.API_BASE_URL}/videos/scan-directory`;

      console.log('Iniciando escaneamento do diretório:', directoryPath || 'diretório padrão');
      console.log('URL da requisição:', url);
      console.log('Payload:', payload);

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Resposta recebida:', response.status, response.data);
      setResult(response.data);
    } catch (err) {
      console.error('Erro ao escanear diretório:', err);

      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
          setError(
            'Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3000.',
          );
        } else if (err.response?.status === 404) {
          setError(
            `Endpoint de escaneamento não encontrado. URL: ${APP_CONFIG.API_BASE_URL}/videos/scan-directory`,
          );
        } else if (err.response?.status === 500) {
          const errorMessage =
            err.response?.data?.message || err.response?.data?.error || 'Erro interno no servidor';
          setError(`Erro no servidor: ${errorMessage}`);
        } else {
          const errorMessage =
            err.response?.data?.message || err.response?.data?.error || err.message;
          setError(`Erro ao escanear diretório: ${errorMessage}`);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao escanear diretório');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Escanear Diretório de Vídeos
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="Caminho do Diretório"
          value={directoryPath}
          onChange={(e) => setDirectoryPath(e.target.value)}
          placeholder="/media/pendrive ou D:\ (Windows)"
          variant="outlined"
          helperText="Deixe em branco para usar o diretório padrão"
        />
        <Button
          variant="contained"
          startIcon={<FolderOpenIcon />}
          onClick={handleScan}
          disabled={loading}
        >
          {loading ? 'Escaneando...' : 'Escanear'}
        </Button>
      </Box>

      {loading && <CircularProgress size={24} sx={{ ml: 2 }} />}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            {result.message}
          </Alert>

          <Typography variant="subtitle1" gutterBottom>
            Vídeos encontrados:
          </Typography>

          <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
            {result.videos.map((video) => (
              <Box
                key={video.id}
                sx={{
                  p: 1,
                  mb: 1,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="body2">{video.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {video.path}
                </Typography>
                <Typography
                  variant="caption"
                  color={video.added ? 'success.main' : 'text.secondary'}
                  sx={{ display: 'block' }}
                >
                  {video.added ? 'Novo vídeo adicionado' : 'Já existe no banco de dados'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};
