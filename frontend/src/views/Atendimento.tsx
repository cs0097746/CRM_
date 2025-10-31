import { useState, useEffect, useCallback } from 'react';
import { Alert, Spinner, Button, ButtonGroup, Toast, ToastContainer } from 'react-bootstrap';
import axios from 'axios';
import type { Conversa, StatusConversa } from '../types/Conversa';
import ChatWindow from '../components/ChatWindow';
import ContatoInfo from '../components/ContatoInfo';
import { useNotificationSound } from '../hooks/useNotificationSound';
import backend_url from "../config/env.ts";
import { getToken } from "../function/validateToken.tsx";
import './Atendimento.css';

const api = axios.create({ 
  baseURL: backend_url
});

export default function Atendimento() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<Conversa | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'danger' | 'warning'>('success');
  const [pegandoChamado, setPegandoChamado] = useState(false);

  const { playSound } = useNotificationSound();

  // Funções
  const showToastWithSound = (message: string, variant: 'success' | 'danger' | 'warning', soundType?: 'message' | 'alert' | 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);

    if (soundType) {
      playSound(soundType);
    }
  };

  const fetchConversas = useCallback(async () => {
      try {
        setLoadingList(true);

        const token = await getToken();
        if (!token) throw new Error("Autenticação falhou.");

        const response = await api.get<Conversa[]>('conversas/', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // @ts-ignore
        setConversas(response.data.results);
        setError(null);

      } catch (err) {
        setError('Não foi possível carregar as conversas.');
        console.error('Erro ao buscar conversas:', err);
      } finally {
        setLoadingList(false);
      }
    }, []);

  const pegarProximoChamado = useCallback(async () => {
    if (pegandoChamado) return;

    try {
      setPegandoChamado(true);

      const conversasEntrada = conversas.filter(conv =>
        conv.status === 'entrada' && !conv.operador
      );

      if (conversasEntrada.length === 0) {
        showToastWithSound('Não há chamados aguardando atendimento', 'warning', 'alert');
        return;
      }

      const chamadoMaisAntigo = conversasEntrada
        .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())[0];

      const token = await getToken();
      if (!token) throw new Error("Não foi possível autenticar.");

      const response = await api.patch(`conversas/${chamadoMaisAntigo.id}/`, {
        status: 'atendimento',
        operador_id: 1
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        await handleConversaSelect(chamadoMaisAntigo);
        await fetchConversas();
        showToastWithSound(`Chamado assumido: ${chamadoMaisAntigo.contato.nome}`, 'success', 'success');
      }
    } catch (error) {
      console.error('Erro ao pegar chamado:', error);
      showToastWithSound('Erro ao assumir chamado', 'danger', 'alert');
    } finally {
      setPegandoChamado(false);
    }
  }, [conversas, pegandoChamado]);

  // 🤖 Toggle Atendimento Humano (pausa o bot por 15 minutos)
  const toggleAtendimentoHumano = async () => {
    if (!conversaAtiva) return;

    try {
      const token = await getToken();
      if (!token) throw new Error("Não foi possível autenticar.");

      // Toggle: se está ativo (true), desativa (false) e vice-versa
      const novoEstado = !conversaAtiva.atendimento_humano;

      const response = await api.post(
        `conversas/${conversaAtiva.id}/atendimento-humano/`,
        { ativar: novoEstado },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        // Atualizar o estado local da conversa
        const conversaAtualizada = {
          ...conversaAtiva,
          atendimento_humano: response.data.atendimento_humano,
          atendimento_humano_ate: response.data.atendimento_humano_ate
        };
        setConversaAtiva(conversaAtualizada);

        // Atualizar na lista de conversas
        setConversas(conversas.map(c =>
          c.id === conversaAtiva.id ? conversaAtualizada : c
        ));

        const mensagem = novoEstado
          ? '🤖 Bot pausado! Atendimento humano ativo por 15 minutos'
          : '✅ Bot reativado! Atendimento automático retomado';
        
        showToastWithSound(mensagem, 'success', 'success');
      }
    } catch (error) {
      console.error('Erro ao alternar atendimento humano:', error);
      showToastWithSound('Erro ao alternar modo de atendimento', 'danger', 'alert');
    }
  };

  const handleConversaSelect = async (conversa: Conversa) => {
    try {
      setLoadingChat(true);
      setError(null);

      const token = await getToken();
      if (!token) throw new Error("Não foi possível autenticar.");

      const response = await api.get<Conversa>(`conversas/${conversa.id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setConversaAtiva(response.data);
      playSound('success');
    } catch (err) {
      setError('Não foi possível carregar a conversa.');
      console.error('Erro ao carregar conversa:', err);
      playSound('alert');
    } finally {
      setLoadingChat(false);
    }
  };

 const handleNewMessageSent = useCallback(async () => {
    if (!conversaAtiva) return;

    try {
      const token = await getToken();
      if (!token) throw new Error("Não foi possível autenticar.");

      const [conversaResponse, listResponse] = await Promise.all([
        api.get<Conversa>(`conversas/${conversaAtiva.id}/`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get<Conversa[]>('conversas/', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setConversaAtiva(conversaResponse.data);
      // @ts-ignore
      setConversas(listResponse.data.results);
    } catch (error) {
      console.error('Erro ao atualizar após envio de mensagem:', error);
    }
  }, [conversaAtiva]);


 const handleStatusChange = async (novoStatus: StatusConversa) => {
    if (!conversaAtiva) return;

    try {
      const token = await getToken();
      if (!token) throw new Error("Não foi possível autenticar.");

      await api.patch(`conversas/${conversaAtiva.id}/`, { status: novoStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const [conversaResponse, listResponse] = await Promise.all([
        api.get<Conversa>(`conversas/${conversaAtiva.id}/`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get<Conversa[]>('conversas/', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setConversaAtiva(conversaResponse.data);
      // @ts-ignore
      setConversas(listResponse.data.results);

      showToastWithSound(`Status alterado para: ${getStatusText(novoStatus)}`, 'success', 'success');
    } catch (error) {
      console.error('Erro ao atualizar status da conversa:', error);
      setError('Erro ao atualizar status da conversa.');
      showToastWithSound('Erro ao atualizar status da conversa', 'danger', 'alert');
    }
  };

  const handleTagsChange = async (newTags: string) => {
    if (!conversaAtiva) return;

    try {
      const token = await getToken();
      if (!token) throw new Error("Não foi possível autenticar.");

      await api.patch(`conversas/${conversaAtiva.id}/`, { tags: newTags }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const [conversaResponse, listResponse] = await Promise.all([
        api.get<Conversa>(`conversas/${conversaAtiva.id}/`, { headers: { Authorization: `Bearer ${token}` } }),
        api.get<Conversa[]>('conversas/', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setConversaAtiva(conversaResponse.data);
      // @ts-ignore
      setConversas(listResponse.data.results);

      showToastWithSound('Tags atualizadas com sucesso!', 'success', 'success');
    } catch (error) {
      console.error('Erro ao atualizar tags:', error);
      showToastWithSound('Erro ao atualizar tags', 'danger', 'alert');
    }
  };

  const getStatusText = (status: StatusConversa) => {
    switch (status) {
      case 'entrada': return 'Aguardando';
      case 'atendimento': return 'Em Atendimento';
      case 'pendente': return 'Pendente';
      case 'finalizada': return 'Finalizada';
      case 'perdida': return 'Perdida';
      default: return status;
    }
  };

  // Effects
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'r') {
        event.preventDefault();
        pegarProximoChamado();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pegarProximoChamado]);

  useEffect(() => {
    fetchConversas();
  }, [fetchConversas]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const response = await api.get<Conversa[]>('conversas/', { headers: { Authorization: `Bearer ${token}` } });

        // @ts-ignore
        const novasConversas = response.data.results;

        const conversasAnteriores = conversas;
        const novasMensagens = novasConversas.some((nova: Conversa) => {
          const anterior = conversasAnteriores.find(ant => ant.id === nova.id);
          return anterior && nova.atualizado_em !== anterior.atualizado_em;
        });

        if (novasMensagens) playSound('message');
        setConversas(novasConversas);

        if (conversaAtiva) {
          const updatedConversa = await api.get<Conversa>(`conversas/${conversaAtiva.id}/`, { headers: { Authorization: `Bearer ${token}` } });
          setConversaAtiva(updatedConversa.data);
        }
      } catch (error) {
        console.error('Erro ao atualizar conversas:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [conversaAtiva, conversas, playSound]);

  console.log("Conversas, ", conversas, "Type conversa", typeof conversas);

  // Filtrar conversas
  const conversasFiltradas = conversas.filter(conversa => {
    const matchStatus = filtroStatus === 'todos' || conversa.status === filtroStatus;
    
    if (!searchTerm) return matchStatus;
    
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      conversa.contato?.nome?.toLowerCase().includes(searchLower) ||
      conversa.contato?.telefone?.includes(searchTerm) ||
      conversa.contato?.email?.toLowerCase().includes(searchLower) ||
      conversa.ultima_mensagem?.mensagem?.toLowerCase().includes(searchLower);
      
    return matchStatus && matchSearch;
  });

  const chamadosAguardando = conversas.filter(conv => 
    conv.status === 'entrada' && !conv.operador
  ).length;

  return (
    <div className="atendimento-container">
        {/* COLUNA 1: Lista de Conversas */}
        <div className="conversas-sidebar">
          <div className="conversas-header">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5>Conversas</h5>
              {chamadosAguardando > 0 && (
                <span className="notification-badge">{chamadosAguardando}</span>
              )}
            </div>

            <button
              className="btn-primary-custom w-100 mb-3"
              onClick={pegarProximoChamado}
              disabled={pegandoChamado || chamadosAguardando === 0}
            >
              {pegandoChamado ? (
                <>
                  <Spinner animation="border" size="sm" style={{ width: '14px', height: '14px', marginRight: '8px' }} />
                  Assumindo...
                </>
              ) : (
                <>Assumir Chamado {chamadosAguardando > 0 && `(${chamadosAguardando})`}</>
              )}
            </button>

            <input
              type="text"
              className="search-input"
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="filter-tabs">
              <button
                className={`filter-tab ${filtroStatus === 'todos' ? 'active' : ''}`}
                onClick={() => setFiltroStatus('todos')}
              >
                Todos
              </button>
              <button
                className={`filter-tab ${filtroStatus === 'entrada' ? 'active' : ''}`}
                onClick={() => setFiltroStatus('entrada')}
              >
                Aguardando
              </button>
              <button
                className={`filter-tab ${filtroStatus === 'atendimento' ? 'active' : ''}`}
                onClick={() => setFiltroStatus('atendimento')}
              >
                Atendimento
              </button>
              <button
                className={`filter-tab ${filtroStatus === 'finalizada' ? 'active' : ''}`}
                onClick={() => setFiltroStatus('finalizada')}
              >
                Finalizadas
              </button>
            </div>

            <div style={{ marginTop: '8px' }}>
              <small style={{ color: '#8a8d91', fontSize: '11px' }}>
                💡 Ctrl+R para assumir próximo
              </small>
            </div>
          </div>

          <div className="conversation-list">
            {error && (
              <Alert variant="danger" className="m-3">
                {error}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setError(null);
                    fetchConversas();
                  }}
                >
                  Tentar novamente
                </Button>
              </Alert>
            )}

            {loadingList ? (
              <div className="text-center p-4">
                <Spinner animation="border" />
                <div className="mt-2" style={{ fontSize: '14px', color: '#65676b' }}>
                  Carregando...
                </div>
              </div>
            ) : conversasFiltradas.length === 0 ? (
              <div className="text-center p-4" style={{ color: '#8a8d91' }}>
                <div style={{ fontSize: '14px' }}>Nenhuma conversa encontrada</div>
              </div>
            ) : (
              conversasFiltradas.map((conversa) => (
                <div
                  key={conversa.id}
                  className={`conversation-item ${
                    conversaAtiva?.id === conversa.id ? 'active' : ''
                  } ${
                    conversa.status === 'entrada' && !conversa.operador ? 'urgent' : ''
                  }`}
                  onClick={() => handleConversaSelect(conversa)}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-1">
                        <strong style={{ fontSize: '14px', fontWeight: 600 }}>
                          {conversa.contato?.nome || conversa.contato_nome || 'Sem nome'}
                        </strong>
                        {conversa.status === 'entrada' && !conversa.operador && (
                          <span className="urgent-dot" />
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8a8d91', marginBottom: '4px' }}>
                        {conversa.contato.telefone}
                      </div>
                      {conversa.ultima_mensagem && (
                        <div style={{
                          fontSize: '13px',
                          color: '#65676b',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {conversa.ultima_mensagem.mensagem}
                        </div>
                      )}
                    </div>
                    <div className="text-end">
                      <span className={`status-badge status-${conversa.status}`}>
                        {getStatusText(conversa.status)}
                      </span>
                      <div style={{ fontSize: '11px', color: '#8a8d91', marginTop: '4px' }}>
                        {conversa.atualizado_em
                          ? new Date(conversa.atualizado_em).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUNA 2: Chat */}
        <div className="chat-area">
          {loadingChat ? (
            <div className="empty-chat">
              <div>
                <Spinner animation="border" />
                <div className="mt-2">Carregando conversa...</div>
              </div>
            </div>
          ) : conversaAtiva ? (
            <>
              <div className="chat-header">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h6 className="mb-1" style={{ fontWeight: 600, fontSize: '16px' }}>
                      {conversaAtiva.contato.nome}
                    </h6>
                    <small style={{ color: '#65676b' }}>
                      {conversaAtiva.contato.telefone}
                    </small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <ButtonGroup size="sm">
                      <Button
                        variant={conversaAtiva.status === 'entrada' ? 'danger' : 'outline-danger'}
                        onClick={() => handleStatusChange('entrada')}
                        style={{ fontSize: '12px' }}
                      >
                        Aguardando
                      </Button>
                      <Button
                        variant={conversaAtiva.status === 'atendimento' ? 'warning' : 'outline-warning'}
                        onClick={() => handleStatusChange('atendimento')}
                        style={{ fontSize: '12px' }}
                      >
                        Atendimento
                      </Button>
                      <Button
                        variant={conversaAtiva.status === 'finalizada' ? 'success' : 'outline-success'}
                        onClick={() => handleStatusChange('finalizada')}
                        style={{ fontSize: '12px' }}
                      >
                        Finalizada
                      </Button>
                    </ButtonGroup>
                    
                    {/* Toggle Atendimento Humano */}
                    <div className="toggle-container">
                      <div className={`toggle-label ${conversaAtiva.atendimento_humano ? 'active' : ''}`}>
                        {conversaAtiva.atendimento_humano ? (
                          <>
                            <i className="bi bi-person-fill"></i>
                            <span>Humano</span>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-robot"></i>
                            <span>Bot</span>
                          </>
                        )}
                      </div>
                      
                      <div 
                        className={`toggle-switch ${conversaAtiva.atendimento_humano ? 'active' : ''}`}
                        onClick={toggleAtendimentoHumano}
                        title={conversaAtiva.atendimento_humano 
                          ? 'Atendimento humano ATIVO (15 min)'
                          : 'Bot ATIVO - Clique para pausar'
                        }
                      >
                        <div className="toggle-slider"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, overflow: 'hidden' }}>
                <ChatWindow
                  conversa={conversaAtiva}
                  mensagens={conversaAtiva.interacoes}
                  onNewMessageSent={handleNewMessageSent}
                />
              </div>
            </>
          ) : (
            <div className="empty-chat">
              <div>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: '#e4e6eb',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <i className="bi bi-chat-dots" style={{ fontSize: '32px', color: '#65676b' }}></i>
                </div>
                <h5 style={{ fontWeight: 600, marginBottom: '8px', color: '#050505' }}>
                  Selecione uma conversa
                </h5>
                <p style={{ margin: 0, fontSize: '14px', color: '#65676b' }}>
                  Escolha uma conversa da lista ou assuma um chamado
                </p>
              </div>
            </div>
          )}
        </div>

        {/* COLUNA 3: Info do Contato */}
        {conversaAtiva && (
          <ContatoInfo
            conversa={conversaAtiva}
            onTagsChange={handleTagsChange}
          />
        )}

        {/* Toast de Notificações */}
        <ToastContainer position="top-end" className="p-3">
          <Toast
            show={showToast}
            onClose={() => setShowToast(false)}
            delay={3000}
            autohide
            bg={toastVariant}
          >
            <Toast.Body className="text-white">
              {toastMessage}
            </Toast.Body>
          </Toast>
        </ToastContainer>
      </div>
  );
};
