import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Grid,
  Tooltip,
  LinearProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as TestIcon,
  Webhook as WebhookIcon,
  Send as SendIcon,
  CallReceived as ReceiveIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import axios from 'axios';
import backend_url from '../config/env';
import { getToken } from '../function/validateToken';
import { CanalDialog, WebhookDialog } from '../components/message-translator';
import CanalCard from '../components/message-translator/CanalCard';
import WhatsAppDialog from '../components/message-translator/WhatsAppDialog';

// 🎨 Cores Loomie
const COLORS = {
  azul: '#316dbd',
  verde: '#7ed957',
  roxo: '#8c52ff',
  branco: '#ffffff',
  cinza: {
    50: '#f8f9fa',
    100: '#f1f3f5',
    200: '#e9ecef',
    300: '#dee2e6',
    400: '#ced4da',
    500: '#adb5bd',
    600: '#6c757d',
    700: '#495057',
    800: '#343a40',
    900: '#212529',
  }
};

// Interface para Canal
interface Canal {
  id: number;
  nome: string;
  tipo: string;
  tipo_display: string;
  ativo: boolean;
  prioridade: number;
  credenciais: Record<string, any>;
  recebe_entrada: boolean;
  envia_saida: boolean;
  destinos: string[];
  criado_em: string;
  atualizado_em: string;
}

// Interface para Webhook Customizado
interface WebhookCustomizado {
  id: number;
  nome: string;
  url: string;
  ativo: boolean;
  filtro_canal: string;
  filtro_canal_display: string;
  filtro_direcao: string;
  filtro_direcao_display: string;
  headers: Record<string, string>;
  metodo_http: string;
  metodo_http_display: string;
  timeout: number;
  retry_em_falha: boolean;
  max_tentativas: number;
  total_enviados: number;
  total_erros: number;
  ultima_execucao: string | null;
  criado_em: string;
  atualizado_em: string;
}

// Interface para Log de Mensagem
interface MensagemLog {
  id: number;
  message_id: string;
  direcao: string;
  direcao_display: string;
  status: string;
  status_display: string;
  canal_origem_nome: string | null;
  canal_destino_nome: string | null;
  remetente: string;
  destinatario: string;
  erro_mensagem: string | null;
  tempo_processamento: number;
  criado_em: string;
  processado_em: string | null;
}

const MessageTranslator: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  
  // Estados para Canais
  const [canais, setCanais] = useState<Canal[]>([]);
  const [canalDialogOpen, setCanalDialogOpen] = useState(false);
  const [canalEditando, setCanalEditando] = useState<Canal | null>(null);
  
  // Estados para Conexão Visual (WhatsApp)
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  
  // Estados para Webhooks
  const [webhooks, setWebhooks] = useState<WebhookCustomizado[]>([]);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [webhookEditando, setWebhookEditando] = useState<WebhookCustomizado | null>(null);
  
  // Estados para Logs
  const [logs, setLogs] = useState<MensagemLog[]>([]);
  
  // Estados gerais
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, [tabValue]);

  const carregarDados = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Carregando dados - Tab:', tabValue);
      console.log('🔍 Backend URL:', backend_url);
      
      const token = await getToken();
      if (!token) throw new Error('Falha na autenticação');

      if (tabValue === 0) {
        const response = await axios.get(`${backend_url}translator/canais/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Canais recebidos:', response.data);
        // Django Rest Framework retorna paginação: {count, results}
        const data = response.data.results || response.data;
        setCanais(Array.isArray(data) ? data : []);
      } else if (tabValue === 1) {
        const response = await axios.get(`${backend_url}translator/webhooks-customizados/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Webhooks recebidos:', response.data);
        const data = response.data.results || response.data;
        setWebhooks(Array.isArray(data) ? data : []);
      } else if (tabValue === 2) {
        const response = await axios.get(`${backend_url}translator/logs/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Logs recebidos:', response.data);
        const data = response.data.results || response.data;
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.response?.data?.message || err.message || 'Erro ao carregar dados');
      // Garantir que os estados permaneçam arrays em caso de erro
      if (tabValue === 0) setCanais([]);
      if (tabValue === 1) setWebhooks([]);
      if (tabValue === 2) setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // ==================== CANAIS ====================
  
  const abrirDialogCanal = (canal?: Canal) => {
    setCanalEditando(canal || null);
    setCanalDialogOpen(true);
  };

  const fecharDialogCanal = () => {
    setCanalDialogOpen(false);
    setCanalEditando(null);
  };

  const salvarCanal = async (formData: Partial<Canal>) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Falha na autenticação');

      if (canalEditando) {
        await axios.patch(`${backend_url}translator/canais/${canalEditando.id}/`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Canal atualizado com sucesso!');
      } else {
        await axios.post(`${backend_url}translator/canais/`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Canal criado com sucesso!');
      }
      fecharDialogCanal();
      carregarDados();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar canal');
    }
  };

  const deletarCanal = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este canal?')) return;
    
    try {
      const token = await getToken();
      if (!token) throw new Error('Falha na autenticação');

      await axios.delete(`${backend_url}translator/canais/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Canal deletado com sucesso!');
      carregarDados();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao deletar canal');
    }
  };

  // ==================== CONEXÃO VISUAL (WHATSAPP) ====================
  
  const abrirWhatsAppDialog = () => {
    setWhatsappDialogOpen(true);
  };

  const fecharWhatsAppDialog = () => {
    setWhatsappDialogOpen(false);
  };

  const handleWhatsAppSuccess = (canalId: number) => {
    setSuccess(`✅ WhatsApp conectado com sucesso! Canal ID: ${canalId}`);
    carregarDados(); // Recarregar para atualizar o status da card
    setTimeout(() => setSuccess(null), 5000);
  };

  // Verificar se WhatsApp já está conectado
  const whatsappConectado = canais.some(
    (canal) => canal.tipo === 'evo' && canal.ativo
  );

  // ==================== WEBHOOKS ====================
  
  const abrirDialogWebhook = (webhook?: WebhookCustomizado) => {
    setWebhookEditando(webhook || null);
    setWebhookDialogOpen(true);
  };

  const fecharDialogWebhook = () => {
    setWebhookDialogOpen(false);
    setWebhookEditando(null);
  };

  const salvarWebhook = async (formData: Partial<WebhookCustomizado>) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Falha na autenticação');

      if (webhookEditando) {
        await axios.patch(`${backend_url}translator/webhooks-customizados/${webhookEditando.id}/`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Webhook atualizado com sucesso!');
      } else {
        await axios.post(`${backend_url}translator/webhooks-customizados/`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccess('Webhook criado com sucesso!');
      }
      fecharDialogWebhook();
      carregarDados();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar webhook');
    }
  };

  const deletarWebhook = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este webhook?')) return;
    
    try {
      const token = await getToken();
      if (!token) throw new Error('Falha na autenticação');

      await axios.delete(`${backend_url}translator/webhooks-customizados/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Webhook deletado com sucesso!');
      carregarDados();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao deletar webhook');
    }
  };

  const testarWebhook = async (id: number) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('Falha na autenticação');

      await axios.post(`${backend_url}translator/webhooks-customizados/${id}/testar/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Mensagem de teste enviada!');
      carregarDados();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao testar webhook');
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${COLORS.cinza[50]} 0%, ${COLORS.branco} 100%)`,
      p: 4
    }}>
      {/* 🎨 HEADER MODERNO */}
      <Paper
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${COLORS.azul} 0%, #4a7fc1 100%)`,
          borderRadius: 3,
          p: 4,
          mb: 4,
          color: COLORS.branco,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <WebhookIcon sx={{ fontSize: 40 }} />
              Message Translator
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Gerencie canais de comunicação e webhooks personalizados
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={carregarDados}
            disabled={loading}
            sx={{
              borderColor: COLORS.branco,
              color: COLORS.branco,
              '&:hover': {
                borderColor: COLORS.branco,
                background: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            Atualizar
          </Button>
        </Box>
      </Paper>

      {/* 📊 ESTATÍSTICAS RÁPIDAS (Cards superiores) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card
            elevation={0}
            sx={{
              background: COLORS.branco,
              borderRadius: 2,
              border: `2px solid ${COLORS.azul}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${COLORS.azul}40`,
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${COLORS.azul} 0%, #4a7fc1 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.branco,
                  }}
                >
                  <SendIcon />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.azul }}>
                    {canais.filter(c => c.ativo).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Canais Ativos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card
            elevation={0}
            sx={{
              background: COLORS.branco,
              borderRadius: 2,
              border: `2px solid ${COLORS.verde}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${COLORS.verde}40`,
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${COLORS.verde} 0%, #91e36a 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.branco,
                  }}
                >
                  <WebhookIcon />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.verde }}>
                    {webhooks.filter(w => w.ativo).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Webhooks Ativos
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card
            elevation={0}
            sx={{
              background: COLORS.branco,
              borderRadius: 2,
              border: `2px solid ${COLORS.roxo}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${COLORS.roxo}40`,
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${COLORS.roxo} 0%, #a066ff 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.branco,
                  }}
                >
                  <TimelineIcon />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.roxo }}>
                    {webhooks.reduce((sum, w) => sum + w.total_enviados, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mensagens Enviadas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card
            elevation={0}
            sx={{
              background: COLORS.branco,
              borderRadius: 2,
              border: `2px solid ${COLORS.cinza[300]}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: `0 8px 24px ${COLORS.cinza[400]}40`,
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${COLORS.cinza[400]} 0%, ${COLORS.cinza[500]} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.branco,
                  }}
                >
                  <SpeedIcon />
                </Box>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>
                    {webhooks.length > 0
                      ? ((webhooks.reduce((sum, w) => sum + w.total_enviados, 0) /
                          (webhooks.reduce((sum, w) => sum + w.total_enviados + w.total_erros, 0) || 1)) *
                          100
                        ).toFixed(0)
                      : 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Taxa de Sucesso
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 🚨 ALERTAS */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)} 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            border: '1px solid #f44336',
          }}
        >
          {error}
        </Alert>
      )}
      {success && (
        <Alert 
          severity="success" 
          onClose={() => setSuccess(null)} 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            border: `1px solid ${COLORS.verde}`,
          }}
        >
          {success}
        </Alert>
      )}

      {/* 📑 TABS MODERNAS */}
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          borderRadius: 2,
          background: COLORS.branco,
          border: `1px solid ${COLORS.cinza[200]}`,
        }}
      >
        <Tabs 
          value={tabValue} 
          onChange={(_e, newValue: number) => setTabValue(newValue)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              color: COLORS.cinza[600],
              '&.Mui-selected': {
                color: COLORS.azul,
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: COLORS.azul,
              height: 3,
              borderRadius: '3px 3px 0 0',
            }
          }}
        >
          <Tab label="📡 Canais" />
          <Tab label="🔗 Webhooks" />
          <Tab label="📊 Logs" />
        </Tabs>
      </Paper>

      {/* Loading Indicator */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Tab 1: Canais */}
      {tabValue === 0 && (
        <Box>
          {/* 📋 Grid de Cards Visuais */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 3,
              mb: 4,
            }}
          >
            {/* 🟢 CARD: WhatsApp Evolution API */}
            <CanalCard
              logo="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
              titulo="WhatsApp"
              descricao="Conecte seu WhatsApp Evolution API para receber e enviar mensagens"
              conectado={whatsappConectado}
              onConectar={abrirWhatsAppDialog}
              onGerenciar={abrirWhatsAppDialog}
            />

            {/* 🔵 CARD: Instagram (Desabilitado - Em breve) */}
            <CanalCard
              logo="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"
              titulo="Instagram"
              descricao="Conecte seu Instagram Business para responder Direct Messages"
              conectado={false}
              onConectar={() => {}}
              desabilitado={true}
              mensagemDesabilitado="Em breve"
            />

            {/* 🟣 CARD: Telegram (Desabilitado - Em breve) */}
            <CanalCard
              logo="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
              titulo="Telegram"
              descricao="Conecte seu bot do Telegram para atender clientes"
              conectado={false}
              onConectar={() => {}}
              desabilitado={true}
              mensagemDesabilitado="Em breve"
            />

            {/* 🟠 CARD: Chat Widget (Desabilitado - Em breve) */}
            <CanalCard
              logo="https://cdn-icons-png.flaticon.com/512/724/724664.png"
              titulo="Chat Widget"
              descricao="Adicione um chat ao vivo em seu site"
              conectado={false}
              onConectar={() => {}}
              desabilitado={true}
              mensagemDesabilitado="Em breve"
            />
          </Box>

          {/* 📊 Tabela de Canais Conectados (Gestão Avançada) */}
          <Card 
            elevation={0}
            sx={{ 
              mt: 4, 
              borderRadius: 2,
              background: COLORS.branco,
              border: `1px solid ${COLORS.cinza[200]}`,
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.azul, mb: 0.5 }}>
                    ⚙️ Gestão Avançada
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configure manualmente os canais de comunicação
                  </Typography>
                </Box>
                <Button
                  startIcon={<AddIcon />}
                  variant="contained"
                  size="medium"
                  onClick={() => abrirDialogCanal()}
                  sx={{
                    background: `linear-gradient(135deg, ${COLORS.azul} 0%, #4a7fc1 100%)`,
                    boxShadow: `0 4px 12px ${COLORS.azul}40`,
                    '&:hover': {
                      background: `linear-gradient(135deg, #2558a0 0%, ${COLORS.azul} 100%)`,
                      boxShadow: `0 6px 16px ${COLORS.azul}60`,
                    }
                  }}
                >
                  Configuração Manual
                </Button>
              </Box>

              {canais.length === 0 ? (
                <Alert 
                  severity="info"
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${COLORS.azul}40`,
                  }}
                >
                  Nenhum canal conectado. Use os cards acima para conectar seus canais de comunicação.
                </Alert>
              ) : (
                <TableContainer>
                  <Table size="medium">
                    <TableHead>
                      <TableRow sx={{ background: COLORS.cinza[50] }}>
                        <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Nome</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Tipo</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Prioridade</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Fluxo</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Destinos</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }} align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {canais.map((canal: Canal) => (
                        <TableRow 
                          key={canal.id}
                          sx={{
                            '&:hover': {
                              background: COLORS.cinza[50],
                            }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600 }}>{canal.nome}</TableCell>
                          <TableCell>
                            <Chip 
                              label={canal.tipo_display} 
                              size="small"
                              sx={{
                                background: COLORS.cinza[100],
                                color: COLORS.cinza[700],
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {canal.ativo ? (
                              <Chip 
                                icon={<CheckCircleIcon />} 
                                label="Ativo" 
                                size="small"
                                sx={{
                                  background: `${COLORS.verde}20`,
                                  color: COLORS.verde,
                                  border: `1px solid ${COLORS.verde}`,
                                  fontWeight: 600,
                                }}
                              />
                            ) : (
                              <Chip 
                                icon={<ErrorIcon />} 
                                label="Inativo" 
                                size="small"
                                color="error"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={canal.prioridade} 
                              size="small"
                              sx={{
                                background: COLORS.azul,
                                color: COLORS.branco,
                                fontWeight: 700,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              {canal.recebe_entrada && (
                                <Chip 
                                  icon={<ReceiveIcon />}
                                  label="Entrada" 
                                  size="small"
                                  sx={{
                                    background: `${COLORS.azul}15`,
                                    color: COLORS.azul,
                                    border: `1px solid ${COLORS.azul}40`,
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                              {canal.envia_saida && (
                                <Chip 
                                  icon={<SendIcon />}
                                  label="Saída" 
                                  size="small"
                                  sx={{
                                    background: `${COLORS.verde}15`,
                                    color: COLORS.verde,
                                    border: `1px solid ${COLORS.verde}40`,
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {canal.destinos.map((dest: string, idx: number) => (
                                <Chip 
                                  key={idx} 
                                  label={dest} 
                                  size="small"
                                  sx={{
                                    background: COLORS.cinza[100],
                                    color: COLORS.cinza[700],
                                  }}
                                />
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Editar">
                              <IconButton 
                                size="small" 
                                onClick={() => abrirDialogCanal(canal)}
                                sx={{
                                  color: COLORS.azul,
                                  '&:hover': {
                                    background: `${COLORS.azul}15`,
                                  }
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Deletar">
                              <IconButton 
                                size="small" 
                                onClick={() => deletarCanal(canal.id)}
                                sx={{
                                  color: '#f44336',
                                  '&:hover': {
                                    background: '#f4433615',
                                  }
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 2: Webhooks Customizados */}
      {tabValue === 1 && (
        <Card
          elevation={0}
          sx={{
            borderRadius: 2,
            background: COLORS.branco,
            border: `1px solid ${COLORS.cinza[200]}`,
          }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.azul, mb: 0.5 }}>
                  🔗 Webhooks Customizados
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Integre com n8n, Make.com, Zapier e outras plataformas
                </Typography>
              </Box>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                size="medium"
                onClick={() => abrirDialogWebhook()}
                sx={{
                  background: `linear-gradient(135deg, ${COLORS.verde} 0%, #91e36a 100%)`,
                  boxShadow: `0 4px 12px ${COLORS.verde}40`,
                  '&:hover': {
                    background: `linear-gradient(135deg, #6bc947 0%, ${COLORS.verde} 100%)`,
                    boxShadow: `0 6px 16px ${COLORS.verde}60`,
                  }
                }}
              >
                Adicionar Webhook
              </Button>
            </Box>

            {webhooks.length === 0 ? (
              <Alert 
                severity="info"
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${COLORS.verde}40`,
                }}
              >
                Nenhum webhook configurado. Clique em "Adicionar Webhook" para integrar com plataformas externas.
              </Alert>
            ) : (
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow sx={{ background: COLORS.cinza[50] }}>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Nome</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>URL</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Filtros</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Estatísticas</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Última Execução</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }} align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {webhooks.map((webhook: WebhookCustomizado) => {
                      const taxaSucesso = webhook.total_enviados > 0 
                        ? ((webhook.total_enviados / (webhook.total_enviados + webhook.total_erros)) * 100)
                        : 0;
                      
                      return (
                        <TableRow 
                          key={webhook.id}
                          sx={{
                            '&:hover': {
                              background: COLORS.cinza[50],
                            }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600 }}>{webhook.nome}</TableCell>
                          <TableCell>
                            <Tooltip title={webhook.url}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  maxWidth: 200, 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis',
                                  color: COLORS.cinza[600],
                                  fontFamily: 'monospace',
                                  fontSize: '0.85rem',
                                }}
                              >
                                {webhook.url}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            {webhook.ativo ? (
                              <Chip 
                                icon={<CheckCircleIcon />} 
                                label="Ativo" 
                                size="small"
                                sx={{
                                  background: `${COLORS.verde}20`,
                                  color: COLORS.verde,
                                  border: `1px solid ${COLORS.verde}`,
                                  fontWeight: 600,
                                }}
                              />
                            ) : (
                              <Chip 
                                icon={<ErrorIcon />} 
                                label="Inativo" 
                                size="small"
                                color="error"
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Chip 
                                label={webhook.filtro_canal_display} 
                                size="small"
                                sx={{
                                  background: `${COLORS.azul}15`,
                                  color: COLORS.azul,
                                  border: `1px solid ${COLORS.azul}40`,
                                  fontWeight: 600,
                                }}
                              />
                              <Chip 
                                label={webhook.filtro_direcao_display} 
                                size="small"
                                sx={{
                                  background: `${COLORS.roxo}15`,
                                  color: COLORS.roxo,
                                  border: `1px solid ${COLORS.roxo}40`,
                                  fontWeight: 600,
                                }}
                              />
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                                <Chip 
                                  label={`✅ ${webhook.total_enviados}`} 
                                  size="small"
                                  sx={{
                                    background: `${COLORS.verde}20`,
                                    color: COLORS.verde,
                                    fontWeight: 700,
                                  }}
                                />
                                <Chip 
                                  label={`❌ ${webhook.total_erros}`} 
                                  size="small"
                                  sx={{
                                    background: '#f4433620',
                                    color: '#f44336',
                                    fontWeight: 700,
                                  }}
                                />
                              </Stack>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress 
                                  variant="determinate" 
                                  value={taxaSucesso} 
                                  sx={{ 
                                    flex: 1, 
                                    height: 6, 
                                    borderRadius: 3,
                                    background: COLORS.cinza[200],
                                    '& .MuiLinearProgress-bar': {
                                      background: `linear-gradient(90deg, ${COLORS.verde} 0%, #91e36a 100%)`,
                                      borderRadius: 3,
                                    }
                                  }} 
                                />
                                <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.verde }}>
                                  {taxaSucesso.toFixed(0)}%
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {webhook.ultima_execucao 
                                ? new Date(webhook.ultima_execucao).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Testar Webhook">
                              <IconButton 
                                size="small" 
                                onClick={() => testarWebhook(webhook.id)}
                                sx={{
                                  color: COLORS.verde,
                                  '&:hover': {
                                    background: `${COLORS.verde}15`,
                                  }
                                }}
                              >
                                <TestIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton 
                                size="small" 
                                onClick={() => abrirDialogWebhook(webhook)}
                                sx={{
                                  color: COLORS.azul,
                                  '&:hover': {
                                    background: `${COLORS.azul}15`,
                                  }
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Deletar">
                              <IconButton 
                                size="small" 
                                onClick={() => deletarWebhook(webhook.id)}
                                sx={{
                                  color: '#f44336',
                                  '&:hover': {
                                    background: '#f4433615',
                                  }
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Logs de Mensagens */}
      {tabValue === 2 && (
        <Card
          elevation={0}
          sx={{
            borderRadius: 2,
            background: COLORS.branco,
            border: `1px solid ${COLORS.cinza[200]}`,
          }}
        >
          <CardContent>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.azul, mb: 0.5 }}>
                📊 Logs de Mensagens
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Histórico de processamento de mensagens
              </Typography>
            </Box>

            {logs.length === 0 ? (
              <Alert 
                severity="info"
                sx={{
                  borderRadius: 2,
                  border: `1px solid ${COLORS.azul}40`,
                }}
              >
                Nenhum log disponível. Os logs aparecerão aqui quando mensagens forem processadas.
              </Alert>
            ) : (
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow sx={{ background: COLORS.cinza[50] }}>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Message ID</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Direção</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Remetente</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Destinatário</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Tempo</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: COLORS.cinza[700] }}>Data</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((log: MensagemLog) => (
                      <TableRow 
                        key={log.id}
                        sx={{
                          '&:hover': {
                            background: COLORS.cinza[50],
                          }
                        }}
                      >
                        <TableCell>
                          <Tooltip title={log.message_id}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontFamily: 'monospace', 
                                fontSize: '0.8rem',
                                color: COLORS.cinza[600],
                              }}
                            >
                              {log.message_id.substring(0, 16)}...
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            icon={log.direcao === 'entrada' ? <ReceiveIcon /> : <SendIcon />}
                            label={log.direcao_display} 
                            size="small"
                            sx={{
                              background: log.direcao === 'entrada' ? `${COLORS.azul}15` : `${COLORS.verde}15`,
                              color: log.direcao === 'entrada' ? COLORS.azul : COLORS.verde,
                              border: `1px solid ${log.direcao === 'entrada' ? COLORS.azul : COLORS.verde}40`,
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={log.status_display} 
                            size="small"
                            icon={log.status === 'enviada' ? <CheckCircleIcon /> : <ErrorIcon />}
                            sx={{
                              background: log.status === 'enviada' ? `${COLORS.verde}20` : '#f4433620',
                              color: log.status === 'enviada' ? COLORS.verde : '#f44336',
                              border: `1px solid ${log.status === 'enviada' ? COLORS.verde : '#f44336'}`,
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {log.remetente}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {log.destinatario}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`${log.tempo_processamento.toFixed(0)}ms`}
                            size="small"
                            sx={{
                              background: COLORS.cinza[100],
                              color: COLORS.cinza[700],
                              fontFamily: 'monospace',
                              fontWeight: 700,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(log.criado_em).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog para Canal */}
      <CanalDialog
        open={canalDialogOpen}
        canal={canalEditando}
        onClose={fecharDialogCanal}
        onSave={salvarCanal}
      />

      {/* Dialog para Webhook */}
      <WebhookDialog
        open={webhookDialogOpen}
        webhook={webhookEditando}
        onClose={fecharDialogWebhook}
        onSave={salvarWebhook}
      />

      {/* 🟢 Dialog para Conectar WhatsApp */}
      <WhatsAppDialog
        open={whatsappDialogOpen}
        onClose={fecharWhatsAppDialog}
        onSuccess={handleWhatsAppSuccess}
      />
    </Box>
  );
};

export default MessageTranslator;
