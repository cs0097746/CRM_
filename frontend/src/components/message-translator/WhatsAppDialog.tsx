import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Avatar,
} from '@mui/material';
import { WhatsApp as WhatsAppIcon, QrCode as QrCodeIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import axios from 'axios';
import backend_url from '../../config/env';
import { getToken } from '../../function/validateToken';

interface WhatsAppDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (canalId: number) => void;
}

interface FormData {
  nome: string;
  base_url: string;
  api_key: string;
  instance: string;
}

const WhatsAppDialog: React.FC<WhatsAppDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<FormData>({
    nome: 'WhatsApp Principal',
    base_url: '',
    api_key: '',
    instance: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [canalId, setCanalId] = useState<number | null>(null);
  const [verificandoConexao, setVerificandoConexao] = useState(false);

  const handleChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
    setError(null);
  };

  const handleSubmit = async () => {
    // Validação básica
    if (!formData.base_url || !formData.api_key || !formData.instance) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    setError(null);
    setQrCode(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Falha na autenticação');

      // 1️⃣ SALVAR CREDENCIAIS
      const response = await axios.post(
        `${backend_url}translator/conectar-whatsapp/`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('✅ Resposta do backend:', response.data);

      if (response.data.success) {
        setCanalId(response.data.canal_id);

        if (response.data.requer_qr) {
          // ⚠️ PRECISA DE QR CODE - GERAR AUTOMATICAMENTE
          setError(`✅ Credenciais salvas! ${response.data.estado}\n\n🔑 Gerando QR Code...`);
          
          // 2️⃣ GERAR QR CODE AUTOMATICAMENTE
          await gerarQRCode(response.data.canal_id);
        } else {
          // ✅ JÁ CONECTADO
          onSuccess(response.data.canal_id);
          handleClose();
        }
      } else {
        setError(response.data.error || 'Erro ao conectar WhatsApp');
      }
    } catch (err: any) {
      console.error('Erro ao conectar WhatsApp:', err);

      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 401) {
        setError('API Key inválida. Verifique suas credenciais.');
      } else if (err.response?.status === 404) {
        setError('Instância não encontrada. Verifique o nome da instância.');
      } else {
        setError('Erro ao conectar. Verifique as configurações.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNÇÃO PARA GERAR QR CODE
  const gerarQRCode = async (id: number) => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error('Falha na autenticação');

      const response = await axios.post(
        `${backend_url}translator/gerar-qr-code/${id}/`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('✅ QR Code gerado:', response.data);

      if (response.data.success) {
        if (response.data.qr_code) {
          setQrCode(response.data.qr_code);
          setError('📱 Escaneie o QR Code com seu WhatsApp\n\n⏳ Aguardando conexão...'); 
          
          // ✅ INICIAR POLLING PARA VERIFICAR CONEXÃO
          iniciarVerificacaoConexao(id);
        } else {
          // ✅ JÁ CONECTADO
          setError('✅ WhatsApp já está conectado!');
          setTimeout(() => {
            onSuccess(id);
            handleClose();
          }, 2000);
        }
      } else {
        setError(response.data.error || 'Erro ao gerar QR Code');
      }
    } catch (err: any) {
      console.error('Erro ao gerar QR Code:', err);
      setError(
        err.response?.data?.error || 
        'Erro ao gerar QR Code. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  // 🔄 FUNÇÃO PARA VERIFICAR SE CONECTOU (POLLING)
  const iniciarVerificacaoConexao = (id: number) => {
    setVerificandoConexao(true);
    
    const intervalo = setInterval(async () => {
      try {
        const token = await getToken();
        if (!token) return;

        // ✅ Usar endpoint otimizado de status (GET mais leve)
        const response = await axios.get(
          `${backend_url}translator/status-canal/${id}/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log('🔍 Verificando status:', response.data);

        // Verificar se conectou (estado_conexao == 'open')
        if (response.data.ativo && response.data.estado_conexao === 'open') {
          // ✅ CONECTADO!
          clearInterval(intervalo);
          setVerificandoConexao(false);
          setError('✅ WhatsApp conectado com sucesso!');
          
          setTimeout(() => {
            onSuccess(id);
            handleClose();
          }, 2000);
        }
      } catch (err) {
        console.error('Erro ao verificar status:', err);
      }
    }, 3000); // Verifica a cada 3 segundos

    // Parar após 2 minutos (timeout)
    setTimeout(() => {
      clearInterval(intervalo);
      setVerificandoConexao(false);
      if (qrCode) {
        setError('⏱️ Tempo esgotado. Regenere o QR Code se necessário.');
      }
    }, 120000); // 2 minutos
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        nome: 'WhatsApp Principal',
        base_url: '',
        api_key: '',
        instance: '',
      });
      setError(null);
      setQrCode(null);
      setCanalId(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'success.main' }}>
            <WhatsAppIcon />
          </Avatar>
          <Typography variant="h6">
            {qrCode ? '📱 Escaneie o QR Code' : 'Conectar WhatsApp'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert 
            severity={qrCode ? 'info' : 'error'} 
            sx={{ mb: 2, whiteSpace: 'pre-line' }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* ✅ MOSTRAR QR CODE SE DISPONÍVEL */}
        {qrCode ? (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <img 
              src={qrCode} 
              alt="QR Code WhatsApp" 
              style={{ width: '100%', maxWidth: '300px', marginTop: '16px' }}
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Como conectar:</strong><br />
                1. Abra o WhatsApp no celular<br />
                2. Toque em "Mais opções" (⋮) → "WhatsApp Web"<br />
                3. Aponte a câmera para este código<br />
                4. Aguarde a confirmação de conexão
              </Typography>
            </Alert>
          </Box>
        ) : (
          // ✅ FORMULÁRIO DE CREDENCIAIS
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure sua instância Evolution API para conectar o WhatsApp ao CRM.
            </Typography>

            <Box display="flex" flexDirection="column" gap={2}>
              {/* Nome do Canal */}
              <TextField
                label="Nome do Canal"
                value={formData.nome}
                onChange={handleChange('nome')}
                fullWidth
                disabled={loading}
                helperText="Ex: WhatsApp Atendimento, WhatsApp Vendas"
              />

              {/* Base URL */}
              <TextField
                label="Base URL *"
                value={formData.base_url}
                onChange={handleChange('base_url')}
                placeholder="https://evo.loomiecrm.com"
                fullWidth
                required
                disabled={loading}
                helperText="URL da sua Evolution API (sem barra final)"
              />

              {/* API Key */}
              <TextField
                label="API Key *"
                value={formData.api_key}
                onChange={handleChange('api_key')}
                type="password"
                placeholder="B6D711FCDE4D4FD5936544120E713976"
                fullWidth
                required
                disabled={loading}
                helperText="Chave de API gerada na Evolution"
              />

              {/* Instance */}
              <TextField
                label="Instância *"
                value={formData.instance}
                onChange={handleChange('instance')}
                placeholder="crm_teste_2025"
                fullWidth
                required
                disabled={loading}
                helperText="Nome da instância configurada na Evolution API"
              />
            </Box>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                ℹ️ <strong>Importante:</strong> Após salvar, o QR Code será gerado automaticamente para você escanear.
              </Typography>
            </Alert>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          {qrCode ? 'Fechar' : 'Cancelar'}
        </Button>
        
        {!qrCode ? (
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="success"
            disabled={loading || !formData.base_url || !formData.api_key || !formData.instance}
            startIcon={loading ? <CircularProgress size={20} /> : <WhatsAppIcon />}
          >
            {loading ? 'Salvando...' : 'Salvar e Conectar'}
          </Button>
        ) : (
          <Button
            onClick={() => canalId && gerarQRCode(canalId)}
            variant="outlined"
            color="success"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          >
            {loading ? 'Gerando...' : 'Regenerar QR Code'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WhatsAppDialog;
