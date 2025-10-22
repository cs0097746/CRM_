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
  Chip,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface Canal {
  id?: number;
  nome: string;
  tipo: string;
  ativo: boolean;
  prioridade: number;
  credenciais: Record<string, any>;
  recebe_entrada: boolean;
  envia_saida: boolean;
  destinos: string[];
}

interface CanalDialogProps {
  open: boolean;
  canal: Canal | null;
  onClose: () => void;
  onSave: (data: Partial<Canal>) => void;
}

export const CanalDialog: React.FC<CanalDialogProps> = ({
  open,
  canal,
  onClose,
  onSave,
}: CanalDialogProps) => {
  const [formData, setFormData] = useState<Partial<Canal>>({
    nome: '',
    tipo: 'whatsapp',
    ativo: true,
    prioridade: 1,
    credenciais: {},
    recebe_entrada: true,
    envia_saida: true,
    destinos: [],
  });

  const [credenciaisJson, setCredenciaisJson] = useState('{}');
  const [novoDestino, setNovoDestino] = useState('');

  useEffect(() => {
    if (canal) {
      setFormData(canal);
      setCredenciaisJson(JSON.stringify(canal.credenciais, null, 2));
    } else {
      setFormData({
        nome: '',
        tipo: 'whatsapp',
        ativo: true,
        prioridade: 1,
        credenciais: {},
        recebe_entrada: true,
        envia_saida: true,
        destinos: [],
      });
      setCredenciaisJson('{}');
    }
  }, [canal, open]);

  const handleChange = (field: keyof Canal, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleCredenciaisChange = (value: string) => {
    setCredenciaisJson(value);
    try {
      const parsed = JSON.parse(value);
      setFormData({ ...formData, credenciais: parsed });
    } catch (e) {
      // JSON inválido, não atualiza
    }
  };

  const adicionarDestino = () => {
    if (novoDestino && formData.destinos) {
      setFormData({
        ...formData,
        destinos: [...formData.destinos, novoDestino],
      });
      setNovoDestino('');
    }
  };

  const removerDestino = (index: number) => {
    if (formData.destinos) {
      setFormData({
        ...formData,
        destinos: formData.destinos.filter((_, i) => i !== index),
      });
    }
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{canal ? 'Editar Canal' : 'Novo Canal'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Nome */}
          <TextField
            label="Nome"
            value={formData.nome}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('nome', e.target.value)}
            fullWidth
            required
          />

          {/* Tipo */}
          <FormControl fullWidth>
            <InputLabel>Tipo de Canal</InputLabel>
            <Select
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
              label="Tipo de Canal"
            >
              <MenuItem value="whatsapp">WhatsApp</MenuItem>
              <MenuItem value="telegram">Telegram</MenuItem>
              <MenuItem value="instagram">Instagram</MenuItem>
              <MenuItem value="evo">Evolution API</MenuItem>
              <MenuItem value="n8n">n8n Webhook</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
              <MenuItem value="outro">Outro</MenuItem>
            </Select>
          </FormControl>

          {/* Prioridade */}
          <TextField
            label="Prioridade"
            type="number"
            value={formData.prioridade}
            onChange={(e) => handleChange('prioridade', parseInt(e.target.value))}
            fullWidth
            helperText="1 = maior prioridade"
          />

          {/* Switches */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.ativo}
                  onChange={(e) => handleChange('ativo', e.target.checked)}
                />
              }
              label="Ativo"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.recebe_entrada}
                  onChange={(e) => handleChange('recebe_entrada', e.target.checked)}
                />
              }
              label="Recebe Entrada"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.envia_saida}
                  onChange={(e) => handleChange('envia_saida', e.target.checked)}
                />
              }
              label="Envia Saída"
            />
          </Box>

          {/* Credenciais (JSON) */}
          <TextField
            label="Credenciais (JSON)"
            value={credenciaisJson}
            onChange={(e) => handleCredenciaisChange(e.target.value)}
            multiline
            rows={6}
            fullWidth
            helperText='Exemplo: {"base_url": "https://evo.exemplo.com", "api_key": "abc123", "instance": "minha_instancia"}'
            error={!isValidJson(credenciaisJson)}
          />

          {/* Destinos */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Destinos
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                value={novoDestino}
                onChange={(e) => setNovoDestino(e.target.value)}
                placeholder="Ex: crm, n8n"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    adicionarDestino();
                  }
                }}
              />
              <Button startIcon={<AddIcon />} onClick={adicionarDestino} variant="outlined">
                Adicionar
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {formData.destinos?.map((destino, index) => (
                <Chip
                  key={index}
                  label={destino}
                  onDelete={() => removerDestino(index)}
                  deleteIcon={<DeleteIcon />}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!isValidJson(credenciaisJson)}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Helper para validar JSON
const isValidJson = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};
