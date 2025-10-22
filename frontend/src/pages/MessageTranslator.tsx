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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  PlayArrow as TestIcon,
} from '@mui/icons-material';
import axios from 'axios';
import backend_url from '../config/env';
import { getToken } from '../function/validateToken';
import { CanalDialog, WebhookDialog } from '../components/message-translator';

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
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Message Translator</Typography>
        <Button
          startIcon={<RefreshIcon />}
          onClick={carregarDados}
          disabled={loading}
        >
          Atualizar
        </Button>
      </Box>

      {/* Alertas */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_e, newValue: number) => setTabValue(newValue)}>
          <Tab label="Canais" />
          <Tab label="Webhooks Customizados" />
          <Tab label="Logs de Mensagens" />
        </Tabs>
      </Paper>

      {/* Tab 1: Canais */}
      {tabValue === 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Canais de Comunicação</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => abrirDialogCanal()}
              >
                Adicionar Canal
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Prioridade</TableCell>
                    <TableCell>Entrada/Saída</TableCell>
                    <TableCell>Destinos</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {canais.map((canal: Canal) => (
                    <TableRow key={canal.id}>
                      <TableCell>{canal.nome}</TableCell>
                      <TableCell>
                        <Chip label={canal.tipo_display} size="small" />
                      </TableCell>
                      <TableCell>
                        {canal.ativo ? (
                          <Chip icon={<CheckCircleIcon />} label="Ativo" color="success" size="small" />
                        ) : (
                          <Chip icon={<ErrorIcon />} label="Inativo" color="error" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{canal.prioridade}</TableCell>
                      <TableCell>
                        {canal.recebe_entrada && <Chip label="↓ Entrada" size="small" sx={{ mr: 0.5 }} />}
                        {canal.envia_saida && <Chip label="↑ Saída" size="small" />}
                      </TableCell>
                      <TableCell>
                        {canal.destinos.map((dest: string, idx: number) => (
                          <Chip key={idx} label={dest} size="small" sx={{ mr: 0.5 }} />
                        ))}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => abrirDialogCanal(canal)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => deletarCanal(canal.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Webhooks Customizados */}
      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6">Webhooks Customizados</Typography>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => abrirDialogWebhook()}
              >
                Adicionar Webhook
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>URL</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Filtros</TableCell>
                    <TableCell>Estatísticas</TableCell>
                    <TableCell>Última Execução</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {webhooks.map((webhook: WebhookCustomizado) => (
                    <TableRow key={webhook.id}>
                      <TableCell>{webhook.nome}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {webhook.url}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {webhook.ativo ? (
                          <Chip icon={<CheckCircleIcon />} label="Ativo" color="success" size="small" />
                        ) : (
                          <Chip icon={<ErrorIcon />} label="Inativo" color="error" size="small" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={webhook.filtro_canal_display} size="small" sx={{ mr: 0.5 }} />
                        <Chip label={webhook.filtro_direcao_display} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          ✅ {webhook.total_enviados} | ❌ {webhook.total_erros}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Taxa: {webhook.total_enviados > 0 
                            ? ((webhook.total_enviados / (webhook.total_enviados + webhook.total_erros)) * 100).toFixed(1)
                            : 0}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {webhook.ultima_execucao ? new Date(webhook.ultima_execucao).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => testarWebhook(webhook.id)} color="primary">
                          <TestIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => abrirDialogWebhook(webhook)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => deletarWebhook(webhook.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Logs de Mensagens */}
      {tabValue === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Logs de Mensagens</Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Message ID</TableCell>
                    <TableCell>Direção</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Remetente</TableCell>
                    <TableCell>Destinatário</TableCell>
                    <TableCell>Tempo (ms)</TableCell>
                    <TableCell>Data</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log: MensagemLog) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {log.message_id.substring(0, 16)}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.direcao_display} 
                          size="small"
                          color={log.direcao === 'entrada' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.status_display} 
                          size="small"
                          color={log.status === 'enviada' ? 'success' : log.status === 'erro' ? 'error' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{log.remetente}</TableCell>
                      <TableCell>{log.destinatario}</TableCell>
                      <TableCell>{log.tempo_processamento.toFixed(2)}</TableCell>
                      <TableCell>{new Date(log.criado_em).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
    </Box>
  );
};

export default MessageTranslator;
