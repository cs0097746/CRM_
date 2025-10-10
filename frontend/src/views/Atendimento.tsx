import { useState, useEffect, useCallback } from 'react';
import { Alert, Spinner, Button, ButtonGroup, Toast, ToastContainer } from 'react-bootstrap';
import axios from 'axios';
import type { Conversa, StatusConversa } from '../types/Conversa';
import ChatWindow from '../components/ChatWindow';
import { useNotificationSound } from '../hooks/useNotificationSound';
import backend_url from "../config/env.ts";
import { getToken } from "../function/validateToken.tsx";

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

  // CSS profissional
  const styles = `
    .professional-layout {
      height: 100vh;
      overflow: hidden;
      background: #f8f9fa;
      display: flex;
      flex-direction: column;
    }

    .top-bar {
      background: #ffffff;
      border-bottom: 1px solid #e1e5e9;
      padding: 12px 20px;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .main-content {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    .sidebar {
      width: 320px;
      background: #ffffff;
      border-right: 1px solid #e1e5e9;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }

    .sidebar-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e1e5e9;
      background: #f8f9fa;
    }

    .conversation-list {
      flex: 1;
      overflow-y: auto;
    }

    .conversation-list::-webkit-scrollbar {
      width: 6px;
    }

    .conversation-list::-webkit-scrollbar-track {
      background: #f1f3f4;
    }

    .conversation-list::-webkit-scrollbar-thumb {
      background: #c1c8cd;
      border-radius: 3px;
    }

    .conversation-item {
      border: none !important;
      border-bottom: 1px solid #f0f2f5 !important;
      padding: 16px 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: #ffffff;
    }

    .conversation-item:hover {
      background: #f8f9fa;
    }

    .conversation-item.active {
      background: #e7f3ff;
      border-left: 3px solid #1877f2 !important;
    }

    .conversation-item.urgent {
      border-left: 3px solid #fa7970 !important;
      background: #fff5f5;
    }

    .conversation-item.urgent:hover {
      background: #ffebeb;
    }

    .chat-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .chat-header-bar {
      background: #ffffff;
      border-bottom: 1px solid #e1e5e9;
      padding: 16px 20px;
      flex-shrink: 0;
    }

    .empty-chat {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      text-align: center;
      color: #65676b;
    }

    .search-input {
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 14px;
      transition: border-color 0.2s ease;
      font-family: inherit;
    }

    .search-input:focus {
      outline: none;
      border-color: #1877f2;
      box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.1);
    }

    .filter-tabs {
      display: flex;
      gap: 4px;
      margin-top: 12px;
    }

    .filter-tab {
      padding: 6px 12px;
      border: 1px solid #e1e5e9;
      background: #ffffff;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .filter-tab.active {
      background: #1877f2;
      color: white;
      border-color: #1877f2;
    }

    .filter-tab:hover:not(.active) {
      background: #f0f2f5;
    }

    .notification-badge {
      background: #fa7970;
      color: white;
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 600;
      min-width: 16px;
      text-align: center;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-entrada {
      background: #ffebee;
      color: #c62828;
    }

    .status-atendimento {
      background: #fff3e0;
      color: #ef6c00;
    }

    .status-resolvida {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .action-button {
      background: #1877f2;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      color: white;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .action-button:hover:not(:disabled) {
      background: #166fe5;
      transform: translateY(-1px);
    }

    .action-button:disabled {
      background: #e4e6ea;
      color: #8a8d91;
      cursor: not-allowed;
      transform: none;
    }

    .action-button.secondary {
      background: #f0f2f5;
      color: #1d2129;
    }

    .action-button.secondary:hover:not(:disabled) {
      background: #e4e6ea;
    }
  `;

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

  const criarChamadoTeste = async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Não foi possível autenticar.");

      await api.patch('conversas/1/', {
        operador_id: null,
        status: 'entrada'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToastWithSound('Chamado de teste criado', 'success', 'success');
      await fetchConversas();
    } catch (error) {
      console.error('Erro ao criar chamado teste:', error);
      showToastWithSound('Erro ao criar chamado de teste', 'danger', 'alert');
    }
  };


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
      setConversas(listResponse.data);

      showToastWithSound(`Status alterado para: ${getStatusText(novoStatus)}`, 'success', 'success');
    } catch (error) {
      console.error('Erro ao atualizar status da conversa:', error);
      setError('Erro ao atualizar status da conversa.');
      showToastWithSound('Erro ao atualizar status da conversa', 'danger', 'alert');
    }
  };

  const getStatusText = (status: StatusConversa) => {
    switch (status) {
      case 'entrada': return 'Aguardando';
      case 'atendimento': return 'Em Atendimento';
      case 'resolvida': return 'Resolvida';
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
        console.log("Token", token);
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
    <>
      <style>{styles}</style>
      
      <div className="professional-layout">
        {/* Barra superior */}
        <div className="top-bar">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <img src="/Loomie.svg" alt="Logo" style={{ width: "28px", height: "28px" }} />
              <div>
                <h5 className="mb-0" style={{ fontWeight: 600, fontSize: '18px' }}>
                  Sistema de Atendimento
                </h5>
                <small style={{ color: '#65676b' }}>Suporte em tempo real</small>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" href="/" size="sm">
                Início
              </Button>
              <Button variant="outline-success" href="/dashboard-atendimento" size="sm">
                Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="main-content">
          {/* Sidebar */}
          <div className="sidebar">
            <div className="sidebar-header">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0" style={{ fontWeight: 600, fontSize: '16px' }}>
                  Conversas
                </h6>
                <div className="d-flex gap-2">
                  {chamadosAguardando > 0 && (
                    <span className="notification-badge">{chamadosAguardando}</span>
                  )}
                  <button className="action-button secondary" onClick={criarChamadoTeste}>
                    Teste
                  </button>
                  <button
                    className="action-button"
                    onClick={pegarProximoChamado}
                    disabled={pegandoChamado || chamadosAguardando === 0}
                  >
                    {pegandoChamado ? (
                      <Spinner animation="border" size="sm" style={{ width: '14px', height: '14px' }} />
                    ) : (
                      'Assumir'
                    )}
                  </button>
                </div>
              </div>
              
              <input
                type="text"
                className="search-input w-100"
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
                  {chamadosAguardando > 0 && <span style={{ marginLeft: '4px' }}>({chamadosAguardando})</span>}
                </button>
                <button 
                  className={`filter-tab ${filtroStatus === 'atendimento' ? 'active' : ''}`}
                  onClick={() => setFiltroStatus('atendimento')}
                >
                  Atendimento
                </button>
                <button 
                  className={`filter-tab ${filtroStatus === 'resolvida' ? 'active' : ''}`}
                  onClick={() => setFiltroStatus('resolvida')}
                >
                  Resolvidas
                </button>
              </div>

              <div style={{ marginTop: '8px' }}>
                <small style={{ color: '#8a8d91', fontSize: '11px' }}>
                  Ctrl+R para assumir próximo chamado
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
                    Carregando conversas...
                  </div>
                </div>
              ) : (
                <>
                  {conversasFiltradas.length === 0 ? (
                    <div className="text-center p-4" style={{ color: '#8a8d91' }}>
                      <div style={{ fontSize: '14px' }}>Nenhuma conversa encontrada</div>
                      <small style={{ fontSize: '12px' }}>
                        {searchTerm || filtroStatus !== 'todos' 
                          ? 'Ajuste os filtros para ver mais resultados'
                          : 'As conversas aparecerão aqui quando chegarem'
                        }
                      </small>
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
                          <div className="flex-grow-1 me-3">
                            <div className="d-flex align-items-center mb-2">
                              <strong style={{ fontSize: '14px', fontWeight: 600 }}>
                                {conversa.contato.nome}
                              </strong>
                              {conversa.status === 'entrada' && !conversa.operador && (
                                <span style={{ 
                                  marginLeft: '8px',
                                  width: '6px', 
                                  height: '6px', 
                                  background: '#fa7970', 
                                  borderRadius: '50%',
                                  display: 'inline-block'
                                }} />
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
                                whiteSpace: 'nowrap',
                                maxWidth: '200px'
                              }}>
                                {conversa.ultima_mensagem.mensagem}
                              </div>
                            )}
                            {conversa.operador && (
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#1877f2', 
                                marginTop: '4px',
                                fontWeight: 500
                              }}>
                                {conversa.operador.user.username}
                              </div>
                            )}
                          </div>
                          <div className="text-end">
                            <span className={`status-badge status-${conversa.status}`}>
                              {getStatusText(conversa.status)}
                            </span>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#8a8d91',
                              marginTop: '4px'
                            }}>
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
                </>
              )}
            </div>
          </div>

          {/* Área do chat */}
          <div className="chat-area">
            {loadingChat ? (
              <div className="empty-chat">
                <div>
                  <Spinner animation="border" />
                  <div className="mt-2" style={{ fontSize: '14px' }}>
                    Carregando conversa...
                  </div>
                </div>
              </div>
            ) : conversaAtiva ? (
              <>
                <div className="chat-header-bar">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1" style={{ fontWeight: 600, fontSize: '16px' }}>
                        {conversaAtiva.contato.nome}
                      </h6>
                      <small style={{ color: '#65676b' }}>
                        {conversaAtiva.contato.telefone}
                      </small>
                    </div>
                    <div>
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
                          variant={conversaAtiva.status === 'resolvida' ? 'success' : 'outline-success'}
                          onClick={() => handleStatusChange('resolvida')}
                          style={{ fontSize: '12px' }}
                        >
                          Resolvida
                        </Button>
                      </ButtonGroup>
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
                    background: '#f0f2f5', 
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                  }}>
                    <i className="bi bi-chat-dots" style={{ fontSize: '32px', color: '#8a8d91' }}></i>
                  </div>
                  <h5 style={{ fontWeight: 600, marginBottom: '8px' }}>
                    Selecione uma conversa
                  </h5>
                  <p style={{ margin: '0 0 20px', fontSize: '14px' }}>
                    Escolha uma conversa da lista para iniciar o atendimento
                  </p>
                  {chamadosAguardando > 0 && (
                    <button
                      className="action-button"
                      onClick={pegarProximoChamado}
                      disabled={pegandoChamado}
                      style={{ fontSize: '14px', padding: '12px 24px' }}
                    >
                      {pegandoChamado ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Assumindo...
                        </>
                      ) : (
                        `Assumir Próximo Chamado (${chamadosAguardando})`
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
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
    </>
  );
}