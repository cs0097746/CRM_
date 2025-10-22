import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Alert,
} from '@mui/material';

interface WebhookCustomizado {
  id?: number;
  nome: string;
  url: string;
  ativo: boolean;
  filtro_canal: string;
  filtro_direcao: string;
  headers: Record<string, string>;
  metodo_http: string;
  timeout: number;
  retry_em_falha: boolean;
  max_tentativas: number;
}

interface WebhookDialogProps {
  open: boolean;
  webhook: WebhookCustomizado | null;
  onClose: () => void;
  onSave: (data: Partial<WebhookCustomizado>) => void;
}

export const WebhookDialog: React.FC<WebhookDialogProps> = ({
  open,
  webhook,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<WebhookCustomizado>>({
    nome: '',
    url: '',
    ativo: true,
    filtro_canal: 'todos',
    filtro_direcao: 'ambas',
    headers: {},
    metodo_http: 'POST',
    timeout: 10,
    retry_em_falha: true,
    max_tentativas: 3,
  });

  const [headersJson, setHeadersJson] = useState('{}');

  useEffect(() => {
    if (webhook) {
      setFormData(webhook);
      setHeadersJson(JSON.stringify(webhook.headers, null, 2));
    } else {
      setFormData({
        nome: '',
        url: '',
        ativo: true,
        filtro_canal: 'todos',
        filtro_direcao: 'ambas',
        headers: {},
        metodo_http: 'POST',
        timeout: 10,
        retry_em_falha: true,
        max_tentativas: 3,
      });
      setHeadersJson('{}');
    }
  }, [webhook, open]);

  const handleChange = (field: keyof WebhookCustomizado, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleHeadersChange = (value: string) => {
    setHeadersJson(value);
    try {
      const parsed = JSON.parse(value);
      setFormData({ ...formData, headers: parsed });
    } catch (e) {
      // JSON inválido, não atualiza
    }
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const isValidJson = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{webhook ? 'Editar Webhook' : 'Novo Webhook'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Informações Básicas */}
          <Typography variant="h6" sx={{ mt: 1 }}>Informações Básicas</Typography>

          <TextField
            label="Nome"
            value={formData.nome}
            onChange={(e) => handleChange('nome', e.target.value)}
            fullWidth
            required
            helperText="Ex: Webhook Cliente ABC"
          />

          <TextField
            label="URL"
            value={formData.url}
            onChange={(e) => handleChange('url', e.target.value)}
            fullWidth
            required
            error={formData.url !== '' && !isValidUrl(formData.url || '')}
            helperText={
              formData.url && !isValidUrl(formData.url)
                ? 'URL deve começar com http:// ou https://'
                : 'Ex: https://hooks.zapier.com/...'
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.ativo}
                onChange={(e) => handleChange('ativo', e.target.checked)}
              />
            }
            label="Webhook Ativo"
          />

          {/* Filtros */}
          <Typography variant="h6" sx={{ mt: 2 }}>Filtros</Typography>
          <Alert severity="info" sx={{ mb: 1 }}>
            Configure quando este webhook deve ser acionado
          </Alert>

          <FormControl fullWidth>
            <InputLabel>Filtro de Canal</InputLabel>
            <Select
              value={formData.filtro_canal}
              onChange={(e) => handleChange('filtro_canal', e.target.value)}
              label="Filtro de Canal"
            >
              <MenuItem value="todos">Todos os Canais</MenuItem>
              <MenuItem value="whatsapp">Apenas WhatsApp</MenuItem>
              <MenuItem value="telegram">Apenas Telegram</MenuItem>
              <MenuItem value="instagram">Apenas Instagram</MenuItem>
              <MenuItem value="evo">Apenas Evolution API</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Filtro de Direção</InputLabel>
            <Select
              value={formData.filtro_direcao}
              onChange={(e) => handleChange('filtro_direcao', e.target.value)}
              label="Filtro de Direção"
            >
              <MenuItem value="ambas">Entrada e Saída</MenuItem>
              <MenuItem value="entrada">Apenas Entrada</MenuItem>
              <MenuItem value="saida">Apenas Saída</MenuItem>
            </Select>
          </FormControl>

          {/* Configurações HTTP */}
          <Typography variant="h6" sx={{ mt: 2 }}>Configurações HTTP</Typography>

          <FormControl fullWidth>
            <InputLabel>Método HTTP</InputLabel>
            <Select
              value={formData.metodo_http}
              onChange={(e) => handleChange('metodo_http', e.target.value)}
              label="Método HTTP"
            >
              <MenuItem value="POST">POST</MenuItem>
              <MenuItem value="PUT">PUT</MenuItem>
              <MenuItem value="PATCH">PATCH</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Headers (JSON)"
            value={headersJson}
            onChange={(e) => handleHeadersChange(e.target.value)}
            multiline
            rows={4}
            fullWidth
            error={!isValidJson(headersJson)}
            helperText='Exemplo: {"Authorization": "Bearer token123", "X-API-Key": "abc"}'
          />

          <TextField
            label="Timeout (segundos)"
            type="number"
            value={formData.timeout}
            onChange={(e) => handleChange('timeout', parseInt(e.target.value) || 10)}
            fullWidth
            inputProps={{ min: 1, max: 60 }}
            helperText="Entre 1 e 60 segundos"
          />

          {/* Retry e Confiabilidade */}
          <Typography variant="h6" sx={{ mt: 2 }}>Retry e Confiabilidade</Typography>

          <FormControlLabel
            control={
              <Switch
                checked={formData.retry_em_falha}
                onChange={(e) => handleChange('retry_em_falha', e.target.checked)}
              />
            }
            label="Retry em Falha"
          />

          {formData.retry_em_falha && (
            <TextField
              label="Máximo de Tentativas"
              type="number"
              value={formData.max_tentativas}
              onChange={(e) => handleChange('max_tentativas', parseInt(e.target.value) || 3)}
              fullWidth
              inputProps={{ min: 1, max: 10 }}
              helperText="Entre 1 e 10 tentativas (exponential backoff: 2s, 4s, 8s...)"
            />
          )}

          {/* Exemplos de Uso */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              💡 Exemplos de Uso:
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Zapier:</strong> https://hooks.zapier.com/hooks/catch/123456/abcdef
              <br />
              <strong>Make.com:</strong> https://hook.us1.make.com/abc123def456
              <br />
              <strong>n8n:</strong> https://n8n.exemplo.com/webhook/abc123
            </Typography>
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            !formData.nome ||
            !formData.url ||
            !isValidUrl(formData.url || '') ||
            !isValidJson(headersJson)
          }
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};
