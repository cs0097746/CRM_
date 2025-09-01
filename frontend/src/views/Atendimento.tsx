import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, ListGroup, Alert, Spinner, Form, Button, ButtonGroup, Toast, ToastContainer } from 'react-bootstrap';
import axios from 'axios';
import type { Conversa, StatusConversa } from '../types/Conversa';
import ChatWindow from '../components/ChatWindow';

const api = axios.create({ baseURL: "http://localhost:8000" });

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

  // Função para buscar conversas
  const fetchConversas = useCallback(async () => {
    try {
      setLoadingList(true);
      const response = await api.get<Conversa[]>('/api/conversas/');
      setConversas(response.data);
      setError(null);
    } catch (err) {
      setError('Não foi possível carregar as conversas.');
      console.error('Erro ao buscar conversas:', err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Função para criar chamado de teste (temporária)
  const criarChamadoTeste = async () => {
    try {
      // Corrigir: usar operador_id em vez de operador
      const response = await api.patch('/api/conversas/1/', {
        operador_id: null,
        status: 'entrada'
      });
      
      setToastMessage('Chamado de teste criado!');
      setToastVariant('success');
      setShowToast(true);
      
      // Atualizar lista
      await fetchConversas();
      
    } catch (error) {
      console.error('Erro ao criar chamado teste:', error);
      setToastMessage('Erro ao criar chamado de teste.');
      setToastVariant('danger');
      setShowToast(true);
    }
  };

  // Função para pegar próximo chamado aguardando atendimento
  const pegarProximoChamado = useCallback(async () => {
    if (pegandoChamado) return;

    try {
      setPegandoChamado(true);
      
      // Buscar conversas com status 'entrada' sem operador
      const conversasEntrada = conversas.filter(conv => 
        conv.status === 'entrada' && !conv.operador
      );
      
      if (conversasEntrada.length === 0) {
        setToastMessage('Não há chamados aguardando atendimento');
        setToastVariant('warning');
        setShowToast(true);
        return;
      }

      // Pegar o chamado mais antigo
      const chamadoMaisAntigo = conversasEntrada
        .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())[0];

      // Assumir o chamado (corrigir: usar operador_id)
      const response = await api.patch(`/api/conversas/${chamadoMaisAntigo.id}/`, {
        status: 'atendimento',
        operador_id: 1 // TODO: usar ID do operador logado
      });

      if (response.status === 200) {
        // Abrir a conversa automaticamente
        await handleConversaSelect(chamadoMaisAntigo);
        
        // Atualizar lista de conversas
        await fetchConversas();
        
        setToastMessage(`Chamado assumido: ${chamadoMaisAntigo.contato.nome}`);
        setToastVariant('success');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Erro ao pegar chamado:', error);
      setToastMessage('Erro ao assumir chamado. Tente novamente.');
      setToastVariant('danger');
      setShowToast(true);
    } finally {
      setPegandoChamado(false);
    }
  }, [conversas, pegandoChamado]);

  // Listener para Ctrl+R
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

  // Buscar conversas inicialmente
  useEffect(() => {
    fetchConversas();
  }, [fetchConversas]);

  // Atualização automática das conversas (otimizada)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await api.get<Conversa[]>('/api/conversas/');
        setConversas(response.data);
        
        // Se há uma conversa ativa, atualize ela também
        if (conversaAtiva) {
          const updatedConversa = await api.get<Conversa>(`/api/conversas/${conversaAtiva.id}/`);
          setConversaAtiva(updatedConversa.data);
        }
      } catch (error) {
        console.error('Erro ao atualizar conversas:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [conversaAtiva]);

  // Função para selecionar uma conversa
  const handleConversaSelect = async (conversa: Conversa) => {
    try {
      setLoadingChat(true);
      setError(null);
      const response = await api.get<Conversa>(`/api/conversas/${conversa.id}/`);
      setConversaAtiva(response.data);
    } catch (err) {
      setError('Não foi possível carregar a conversa.');
      console.error('Erro ao carregar conversa:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  // Callback quando uma nova mensagem é enviada (otimizado)
  const handleNewMessageSent = useCallback(async () => {
    // Atualizar apenas a conversa ativa sem recarregar toda a lista
    if (conversaAtiva) {
      try {
        const [conversaResponse, listResponse] = await Promise.all([
          api.get<Conversa>(`/api/conversas/${conversaAtiva.id}/`),
          api.get<Conversa[]>('/api/conversas/')
        ]);
        
        setConversaAtiva(conversaResponse.data);
        setConversas(listResponse.data);
      } catch (error) {
        console.error('Erro ao atualizar após envio de mensagem:', error);
      }
    }
  }, [conversaAtiva]);

  // Filtrar conversas por status e termo de busca (melhorado)
  const conversasFiltradas = conversas.filter(conversa => {
    const matchStatus = filtroStatus === 'todos' || conversa.status === filtroStatus;
    
    if (!searchTerm) return matchStatus;
    
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      conversa.contato?.nome?.toLowerCase().includes(searchLower) ||
      conversa.contato?.telefone?.includes(searchTerm) ||
      conversa.contato?.email?.toLowerCase().includes(searchLower) ||
      conversa.ultima_mensagem?.toLowerCase().includes(searchLower);
      
    return matchStatus && matchSearch;
  });

  // Função para mudar status da conversa
  const handleStatusChange = async (novoStatus: StatusConversa) => {
    if (!conversaAtiva) return;
    
    try {
      await api.patch(`/api/conversas/${conversaAtiva.id}/`, {
        status: novoStatus
      });
      
      // Atualizar conversa ativa e lista
      const [conversaResponse, listResponse] = await Promise.all([
        api.get<Conversa>(`/api/conversas/${conversaAtiva.id}/`),
        api.get<Conversa[]>('/api/conversas/')
      ]);
      
      setConversaAtiva(conversaResponse.data);
      setConversas(listResponse.data);

      setToastMessage(`Status alterado para: ${getStatusText(novoStatus)}`);
      setToastVariant('success');
      setShowToast(true);
    } catch (error) {
      console.error('Erro ao atualizar status da conversa:', error);
      setError('Erro ao atualizar status da conversa.');
      setToastMessage('Erro ao atualizar status da conversa.');
      setToastVariant('danger');
      setShowToast(true);
    }
  };

  // Função para obter a cor do badge baseado no status
  const getStatusBadgeColor = (status: StatusConversa) => {
    switch (status) {
      case 'entrada': return 'primary';
      case 'atendimento': return 'warning';
      case 'resolvida': return 'success';
      default: return 'secondary';
    }
  };

  // Função para obter o texto do status
  const getStatusText = (status: StatusConversa) => {
    switch (status) {
      case 'entrada': return 'Entrada';
      case 'atendimento': return 'Atendimento';
      case 'resolvida': return 'Resolvida';
      default: return status;
    }
  };

  // Contar chamados aguardando (otimizado)
  const chamadosAguardando = conversas.filter(conv => 
    conv.status === 'entrada' && !conv.operador
  ).length;

  return (
    <>
      <Container fluid className="h-100">
        <Row className="h-100">
          {/* Sidebar com lista de conversas */}
          <Col md={4} className="border-end bg-light p-0">
            <div className="p-3 border-bottom">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Conversas</h5>
                <div className="d-flex align-items-center gap-2">
                  {chamadosAguardando > 0 && (
                    <span className="badge bg-danger">{chamadosAguardando}</span>
                  )}
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={criarChamadoTeste}
                    className="me-2"
                  >
                    Criar Teste
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    onClick={pegarProximoChamado}
                    disabled={pegandoChamado || chamadosAguardando === 0}
                    title="Pegar próximo chamado (Ctrl+R)"
                  >
                    {pegandoChamado ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <i className="bi bi-hand-index"></i> Pegar Chamado
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Filtros */}
              <Form.Group className="mb-2">
                <Form.Control
                  type="text"
                  placeholder="Buscar conversa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="sm"
                />
              </Form.Group>
              
              <ButtonGroup size="sm" className="w-100">
                <Button 
                  variant={filtroStatus === 'todos' ? 'primary' : 'outline-primary'}
                  onClick={() => setFiltroStatus('todos')}
                >
                  Todas
                </Button>
                <Button 
                  variant={filtroStatus === 'entrada' ? 'primary' : 'outline-primary'}
                  onClick={() => setFiltroStatus('entrada')}
                >
                  Entrada {chamadosAguardando > 0 && <span className="badge bg-light text-dark ms-1">{chamadosAguardando}</span>}
                </Button>
                <Button 
                  variant={filtroStatus === 'atendimento' ? 'primary' : 'outline-primary'}
                  onClick={() => setFiltroStatus('atendimento')}
                >
                  Atendimento
                </Button>
                <Button 
                  variant={filtroStatus === 'resolvida' ? 'primary' : 'outline-primary'}
                  onClick={() => setFiltroStatus('resolvida')}
                >
                  Resolvidas
                </Button>
              </ButtonGroup>

              {/* Indicador de atalho */}
              <div className="mt-2">
                <small className="text-muted">
                  <i className="bi bi-keyboard"></i> Pressione <kbd>Ctrl+R</kbd> para pegar próximo chamado
                </small>
              </div>
            </div>

            {/* Lista de conversas */}
            <div style={{ height: 'calc(100vh - 250px)', overflowY: 'auto' }}>
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
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </Spinner>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {conversasFiltradas.length === 0 ? (
                    <ListGroup.Item className="text-center text-muted">
                      {searchTerm || filtroStatus !== 'todos' 
                        ? 'Nenhuma conversa encontrada com os filtros aplicados'
                        : 'Nenhuma conversa disponível'
                      }
                    </ListGroup.Item>
                  ) : (
                    conversasFiltradas.map((conversa) => (
                      <ListGroup.Item
                        key={conversa.id}
                        action
                        active={conversaAtiva?.id === conversa.id}
                        onClick={() => handleConversaSelect(conversa)}
                        className={`d-flex justify-content-between align-items-start ${
                          conversa.status === 'entrada' && !conversa.operador ? 'border-start border-danger border-3' : ''
                        }`}
                      >
                        <div className="ms-2 me-auto">
                          <div className="fw-bold">
                            {conversa.contato.nome}
                            {conversa.status === 'entrada' && !conversa.operador && (
                              <i className="bi bi-exclamation-circle text-danger ms-2" title="Aguardando atendimento"></i>
                            )}
                          </div>
                          <small className="text-muted">{conversa.contato.telefone}</small>
                          {conversa.ultima_mensagem && (
                            <div className="text-truncate" style={{ maxWidth: '200px' }}>
                              <small>{conversa.ultima_mensagem}</small>
                            </div>
                          )}
                          {conversa.operador && (
                            <div>
                              <small className="text-info">
                                Operador: {conversa.operador.user.username}
                              </small>
                            </div>
                          )}
                        </div>
                        <div className="text-end">
                          <span className={`badge bg-${getStatusBadgeColor(conversa.status)}`}>
                            {getStatusText(conversa.status)}
                          </span>
                          <br />
                          <small className="text-muted">
                            {new Date(conversa.atualizado_em).toLocaleTimeString('pt-BR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </small>
                        </div>
                      </ListGroup.Item>
                    ))
                  )}
                </ListGroup>
              )}
            </div>
          </Col>

          {/* Área do chat */}
          <Col md={8} className="p-0">
            {loadingChat ? (
              <div className="d-flex justify-content-center align-items-center h-100">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Carregando conversa...</span>
                </Spinner>
              </div>
            ) : conversaAtiva ? (
              <div className="h-100 d-flex flex-column">
                {/* Header da conversa com botões de status */}
                <div className="border-bottom p-3 bg-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">{conversaAtiva.contato.nome}</h5>
                      <small className="text-muted">{conversaAtiva.contato.telefone}</small>
                    </div>
                    <div>
                      <ButtonGroup size="sm">
                        <Button 
                          variant={conversaAtiva.status === 'entrada' ? 'primary' : 'outline-primary'}
                          onClick={() => handleStatusChange('entrada')}
                        >
                          Entrada
                        </Button>
                        <Button 
                          variant={conversaAtiva.status === 'atendimento' ? 'warning' : 'outline-warning'}
                          onClick={() => handleStatusChange('atendimento')}
                        >
                          Atendimento
                        </Button>
                        <Button 
                          variant={conversaAtiva.status === 'resolvida' ? 'success' : 'outline-success'}
                          onClick={() => handleStatusChange('resolvida')}
                        >
                          Resolvida
                        </Button>
                      </ButtonGroup>
                    </div>
                  </div>
                </div>
                
                {/* Componente do chat */}
                <div className="flex-grow-1">
                  <ChatWindow
                    conversa={conversaAtiva}
                    onNewMessageSent={handleNewMessageSent}
                  />
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted">
                <i className="bi bi-chat-dots" style={{ fontSize: '4rem' }}></i>
                <h4 className="mt-3">Selecione uma conversa</h4>
                <p>Escolha uma conversa da lista para começar o atendimento</p>
                {chamadosAguardando > 0 && (
                  <div className="text-center mt-3">
                    <Button variant="primary" onClick={pegarProximoChamado} disabled={pegandoChamado}>
                      {pegandoChamado ? (
                        <Spinner animation="border" size="sm" />
                      ) : (
                        <>Pegar próximo chamado ({chamadosAguardando} aguardando)</>
                      )}
                    </Button>
                    <br />
                    <small className="text-muted mt-2 d-block">
                      Ou pressione <kbd>Ctrl+R</kbd>
                    </small>
                  </div>
                )}
              </div>
            )}
          </Col>
        </Row>
      </Container>

      {/* Toast para notificações */}
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
    </>
  );
}