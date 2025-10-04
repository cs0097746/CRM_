import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Card, Badge, Alert, ListGroup, Spinner } from 'react-bootstrap';
import axios from 'axios';
import type {Conversa} from "../types/Conversa.ts";
import backend_url from "../config/env.ts";

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [resumoAtendimento, setResumoAtendimento] = useState({
    aguardando: 0,
    emAndamento: 0,
    operadoresOnline: 0
  });
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [markingLidas, setMarkingLidas] = useState(false);
  const [notificacoesError, setNotificacoesError] = useState<string | null>(null);

  // NOVO: Estado para controlar a expansão
  const [isExpanded, setIsExpanded] = useState(false);

  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida);

  // Lista de notificações a serem exibidas: todas se expandido, ou apenas as 3 primeiras
  const notificacoesExibidas = isExpanded ? notificacoesNaoLidas : notificacoesNaoLidas.slice(0, 3);

  // Verifica se há mais de 3 notificações não lidas para mostrar o botão "Ver Mais"
  const hasMoreNotifs = notificacoesNaoLidas.length > 3;

  const api = axios.create({ baseURL: `${backend_url}` });

    const USERNAME = "admin";
    const PASSWORD = "admin";
    const CLIENT_ID = "R2W2Ypo54DAiLKZZLKlCvqLe3U81i67n2NjoQhS0";
    const CLIENT_SECRET = "i1XG19wUmdnNYEdatXsxpPF32qAX9oQsk46wu3393H91IpDi8rDtGcU7s9ZLs5BKNK0oaAHravReclTXZIzSS6bFhgHSetAuKq46OPDMJ29Q0uPUqO60CVFi2PYOvSKh";

    // --- Tipos e Funções de Notificação ---
    interface Notificacao {
        id: number;
        lida: boolean;
        texto: string;
        tipo: 'boa' | 'alerta' | 'erro';
        criado_em: string;
    }

    const getTipoBadge = (tipo: Notificacao['tipo']) => {
        switch (tipo) {
            case 'boa': return { variant: 'success', icone: '✅' };
            case 'alerta': return { variant: 'warning', icone: '⚠️' };
            case 'erro': return { variant: 'danger', icone: '❌' };
            default: return { variant: 'secondary', icone: 'ℹ️' };
        }
    };

    const getToken = async () => {
      const params = new URLSearchParams();
      params.append("grant_type", "password");
      params.append("username", USERNAME);
      params.append("password", PASSWORD);
      params.append("client_id", CLIENT_ID);
      params.append("client_secret", CLIENT_SECRET);

      try {
        const res = await axios.post(`${backend_url}o/token/`, params);
        return res.data.access_token;
      } catch (err) {
        console.error(err);
      }
    };
    // ------------------------------------

    const handleMarcarTodasLidas = async () => {
        if (notificacoesNaoLidas.length === 0) return;

        try {
            setMarkingLidas(true);
            const token = await getToken();
            if (!token) throw new Error("Autenticação falhou.");

            await api.patch('notificacoes/marcar-todas-lidas/', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Atualiza o estado das notificações localmente
            const novasNotificacoes = notificacoes.map(n => ({ ...n, lida: true }));
            setNotificacoes(novasNotificacoes);

            // Oculta após marcar todas como lidas
            if (isExpanded) {
                setIsExpanded(false);
            }

        } catch (err) {
            setNotificacoesError('Erro ao marcar notificações como lidas.');
            console.error('Erro ao marcar como lidas:', err);
        } finally {
            setMarkingLidas(false);
        }
    };

    // Função para buscar o resumo e notificações (ajustada)
    const fetchResumoRapido = useCallback(async () => {
      try {
        const token = await getToken();
        if (!token) {
            setLoading(false);
            return;
        }

        const [resumoResponse, notifResponse] = await Promise.all([
             api.get<Conversa[]>('conversas/', {
              headers: { Authorization: `Bearer ${token}` }
            }),
            api.get<Notificacao[]>('notificacoes/', {
                headers: { Authorization: `Bearer ${token}` }
            })
        ]);

        // @ts-ignore
        const conversas = resumoResponse.data.results;
        const aguardando = conversas.filter((c: Conversa) => c.status === 'entrada' && !c.operador).length;
        const emAndamento = conversas.filter((c: Conversa) => c.status === 'atendimento').length;
        const operadoresUnicos = new Set(
          conversas.filter((c: Conversa) => c.operador).map((c: Conversa) => c.operador!.id)
        );

        setResumoAtendimento({
          aguardando,
          emAndamento,
          operadoresOnline: operadoresUnicos.size
        });
        // @ts-ignore
        setNotificacoes(notifResponse.data.results || []);

      } catch (error) {
        console.error('Erro ao carregar resumo/notificações:', error);
      } finally {
        setLoading(false);
      }
    }, [api]);


  useEffect(() => {
    fetchResumoRapido();

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchResumoRapido, 30000);
    return () => clearInterval(interval);
  }, [fetchResumoRapido]);

  const modulosCRM = [
    {
      titulo: '💬 Atendimento',
      descricao: 'Gerencie conversas e suporte ao cliente',
      url: '/atendimento',
      cor: '#316dbd',
      icone: '💬',
      urgente: resumoAtendimento.aguardando > 0,
      badge: resumoAtendimento.aguardando > 0 ? `${resumoAtendimento.aguardando} aguardando` : null
    },
    {
      titulo: '📊 Dashboard Atendimento',
      descricao: 'Métricas e relatórios de suporte',
      url: '/dashboard-atendimento',
      cor: '#7ed957',
      icone: '📈',
      badge: `${resumoAtendimento.emAndamento} em andamento`
    },
    {
      titulo: '🎯 Kanban CRM',
      descricao: 'Gestão de leads e negócios',
      url: '/kanbans/',
      cor: '#8c52ff',
      icone: '🎯',
      externo: true
    },
  ];

  return (
    <div
      className="d-flex flex-column"
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #316dbd 0%, #8c52ff 2%, #7ed957 4%, #ffffff 6%, #ffffff 94%, #7ed957 96%, #8c52ff 98%, #316dbd 100%)",
        padding: "2rem",
        boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Container Flutuante de Notificações */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1050, // Acima de outros elementos normais
          width: '350px',
          // Limita a altura do container principal se expandido
          maxHeight: isExpanded ? '85vh' : 'auto',
          overflowY: isExpanded ? 'auto' : 'visible',
        }}
      >
        {notificacoesNaoLidas.length > 0 && (
          <Card className="shadow-lg border-0" style={{ borderRadius: '10px' }}>
            <Card.Header className="d-flex justify-content-between align-items-center" style={{ backgroundColor: '#316dbd', color: 'white', borderTopLeftRadius: '10px', borderTopRightRadius: '10px' }}>
              <h6 className="mb-0" style={{ fontWeight: 600 }}>
                🔔 {notificacoesNaoLidas.length} Novas Notificações
              </h6>
              {markingLidas ? (
                <Spinner animation="border" size="sm" variant="light" />
              ) : (
                <Button
                    variant="light"
                    size="sm"
                    onClick={handleMarcarTodasLidas}
                    style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '5px' }}
                >
                    Marcar Todas como Lidas
                </Button>
              )}
            </Card.Header>
            <ListGroup variant="flush">
              {notificacoesExibidas.map(n => {
                const tipoStyle = getTipoBadge(n.tipo);
                return (
                  <ListGroup.Item key={n.id} style={{ padding: '10px 15px', borderLeft: `3px solid ${tipoStyle.variant === 'danger' ? '#dc3545' : tipoStyle.variant === 'warning' ? '#ffc107' : '#28a745'}`, backgroundColor: '#fff' }}>
                    <div className="d-flex align-items-start">
                      <Badge bg={tipoStyle.variant} className="me-2 mt-1" style={{ fontSize: '1rem' }}>
                        {tipoStyle.icone}
                      </Badge>
                      <div className="flex-grow-1">
                        <small style={{ fontWeight: 600, color: '#333' }}>
                          {n.texto}
                        </small>
                        <div style={{ fontSize: '0.7rem', color: '#888' }}>
                          {new Date(n.criado_em).toLocaleTimeString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </ListGroup.Item>
                );
              })}
              {/* Botão de expansão/colapso, visível se houver mais de 3 e não estiver totalmente expandido */}
              {hasMoreNotifs && (
                  <ListGroup.Item className="text-center py-2" style={{ backgroundColor: '#f8f9fa' }}>
                      <Button
                          variant="link"
                          size="sm"
                          onClick={() => setIsExpanded(!isExpanded)}
                          style={{ fontSize: '0.85rem', fontWeight: 600, color: '#316dbd' }}
                      >
                          {isExpanded ? (
                              '▲ Mostrar menos'
                          ) : (
                              `▼ Ver todas (${notificacoesNaoLidas.length - 3} a mais)`
                          )}
                      </Button>
                  </ListGroup.Item>
              )}
            </ListGroup>
          </Card>
        )}
        {notificacoesError && (
            <Alert variant="danger" className="mt-3 p-2" style={{ fontSize: '0.8rem' }}>
                Erro: {notificacoesError}
            </Alert>
        )}
      </div>

      {/* Header Principal */}
      <header className="text-center mb-5">
        <div className="d-flex justify-content-center align-items-center gap-3 mb-3">
          <img src="/Loomie.svg" alt="Loomie Logo" style={{ width: "100px", height: "100px" }} />
          <div>
            <h1 style={{
              color: "#316dbd",
              fontWeight: 800,
              fontSize: "3rem",
              margin: 0,
              textShadow: "2px 2px 4px rgba(0,0,0,0.1)"
            }}>
              CRM Loomie
            </h1>
            <p style={{
              color: "#6c757d",
              fontSize: "1.3rem",
              margin: 0,
              fontWeight: 500
            }}>
              Sistema Completo de Gestão e Atendimento
            </p>
          </div>
        </div>

        {/* Status Rápido */}
        {!loading && (
          <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap">
            {resumoAtendimento.aguardando > 0 && (
              <Alert variant="danger" className="py-2 px-3 mb-0">
                <strong>🔔 {resumoAtendimento.aguardando} chamados aguardando!</strong>
              </Alert>
            )}
            <Badge bg="info" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              👥 {resumoAtendimento.operadoresOnline} operadores online
            </Badge>
            <Badge bg="warning" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
              💬 {resumoAtendimento.emAndamento} em atendimento
            </Badge>
          </div>
        )}
      </header>

      {/* Módulos Principais */}
      <Container fluid className="mb-5">
        <h2 className="text-center mb-4" style={{ color: "#316dbd", fontWeight: 700 }}>
          🚀 Módulos do Sistema
        </h2>
        <Row className="g-4 justify-content-center">
          {modulosCRM.map((modulo, index) => (
            <Col md={6} lg={3} key={index}>
              <Card
                className="h-100 shadow-sm border-0"
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  transform: 'translateY(0)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  animation: modulo.urgente ? 'pulse 2s infinite' : 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                }}
                onClick={() => {
                  if (modulo.externo) {
                    window.open(modulo.url, '_blank');
                  } else {
                    window.location.href = modulo.url;
                  }
                }}
              >
                <div style={{
                  background: `linear-gradient(135deg, ${modulo.cor}, ${modulo.cor}dd)`,
                  padding: '1.5rem',
                  color: 'white',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                    {modulo.icone}
                  </div>
                  <h5 className="mb-0" style={{ fontWeight: 700 }}>
                    {modulo.titulo}
                  </h5>
                </div>
                <Card.Body className="text-center p-4">
                  <p className="text-muted mb-3" style={{ fontSize: '0.95rem' }}>
                    {modulo.descricao}
                  </p>
                  {modulo.badge && (
                    <Badge
                      bg={modulo.urgente ? 'danger' : 'primary'}
                      className="mb-2"
                      style={{ fontSize: '0.8rem' }}
                    >
                      {modulo.badge}
                    </Badge>
                  )}
                  <br />
                  <Button
                    style={{
                      backgroundColor: modulo.cor,
                      borderColor: modulo.cor,
                      borderRadius: '15px',
                      fontWeight: 600
                    }}
                    size="sm"
                  >
                    {modulo.externo ? 'Abrir' : 'Acessar'} →
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Resumo Rápido do Sistema */}
      <Container fluid className="mb-4">
        <Card className="border-0 shadow-sm" style={{ borderRadius: '15px', backgroundColor: 'rgba(255,255,255,0.9)' }}>
          <Card.Body className="p-4">
            <h5 className="text-center mb-3" style={{ color: "#316dbd", fontWeight: 600 }}>
              📊 Status do Sistema
            </h5>
            <Row className="text-center">
              <Col md={4}>
                <div className="p-3">
                  <h3 style={{ color: "#dc3545", fontWeight: 700 }}>
                    {resumoAtendimento.aguardando}
                  </h3>
                  <small className="text-muted">Chamados Aguardando</small>
                </div>
              </Col>
              <Col md={4}>
                <div className="p-3">
                  <h3 style={{ color: "#ffc107", fontWeight: 700 }}>
                    {resumoAtendimento.emAndamento}
                  </h3>
                  <small className="text-muted">Em Atendimento</small>
                </div>
              </Col>
              <Col md={4}>
                <div className="p-3">
                  <h3 style={{ color: "#7ed957", fontWeight: 700 }}>
                    {resumoAtendimento.operadoresOnline}
                  </h3>
                  <small className="text-muted">Operadores Online</small>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Container>

      {/* Footer */}
      <footer
        style={{
          marginTop: "auto",
          paddingTop: "2rem",
          textAlign: "center",
          fontSize: "0.9rem",
          color: "#8c52ff",
          fontWeight: 500,
        }}
      >
        <p className="mb-2">
          🚀 Powered by <span style={{ color: "#316dbd", fontWeight: 700 }}>Loomie</span>
        </p>
        <small style={{ color: "#6c757d" }}>
          Sistema de CRM e Atendimento • Versão 1.0 • {new Date().getFullYear()}
        </small>
      </footer>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }
        `}
      </style>
    </div>
  );
};

export default Home;