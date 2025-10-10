import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Card, Badge, Alert, ListGroup, Spinner } from 'react-bootstrap';
import axios from 'axios';
import type { Conversa } from "../types/Conversa.ts";
import backend_url from "../config/env.ts";
import { getToken} from "../function/validateToken.tsx";

const styles = `
    .professional-layout {
      height: 100vh;
      overflow: hidden;
      background: #f8f9fa; /* Fundo cinza claro */
      display: flex;
      flex-direction: column;
    }

    .top-bar {
      background: #ffffff; /* Fundo branco para a barra superior */
      border-bottom: 1px solid #e1e5e9;
      padding: 12px 20px;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 30px;
    }

    /* Estilos para os Cards de Módulos */
    .module-card {
        border-radius: 12px;
        transition: all 0.3s ease;
        cursor: pointer;
        border: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    
    .module-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }
    
    /* Estilos para o Card de Notificações Flutuante */
    .notif-card {
        max-height: 85vh;
        overflow-y: auto;
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1050;
        width: 350px;
        border-radius: 10px;
        box-shadow: 0 6px 15px rgba(0,0,0,0.2);
    }
    
    .notif-header {
        background-color: #316dbd; /* Cor primária */
        color: white;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
    }
    
    .notif-item {
        border-left-width: 4px;
        border-left-style: solid;
        transition: background-color 0.2s;
    }
    
    .notif-item:hover {
        background-color: #f0f2f5;
    }
    
    /* Keyframes para animação */
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.01); }
        100% { transform: scale(1); }
    }
`;

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

  // A API e as constantes estão sendo definidas dentro do escopo do componente ou fora
  // como no código original. Mantendo a definição dentro do Home para simplificar.
  const api = axios.create({ baseURL: `${backend_url}` });

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
            case 'boa': return { variant: 'success', cor: '#28a745', icone: '✅' };
            case 'alerta': return { variant: 'warning', cor: '#ffc107', icone: '⚠️' };
            case 'erro': return { variant: 'danger', cor: '#dc3545', icone: '❌' };
            default: return { variant: 'secondary', cor: '#6c757d', icone: 'ℹ️' };
        }
    };
    // ------------------------------------

    const handleMarcarTodasLidas = async () => {
        if (notificacoesNaoLidas.length === 0) return;

        try {
            setMarkingLidas(true);
            const token = await getToken();
            console.log("Token", token);
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
        console.log("Token", token);
        if (!token) throw new Error("Autenticação falhou.");

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
        // Simulação de operadores online baseada nas conversas ativas
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
      cor: '#316dbd', // Azul primário
      icone: '💬',
      urgente: resumoAtendimento.aguardando > 0,
      badge: resumoAtendimento.aguardando > 0 ? `${resumoAtendimento.aguardando} aguardando` : null
    },
    {
      titulo: '📈 Dashboard Atendimento',
      descricao: 'Métricas e relatórios de suporte',
      url: '/dashboard-atendimento',
      cor: '#7ed957', // Verde
      icone: '📊',
      badge: `${resumoAtendimento.emAndamento} em andamento`
    },
    {
      titulo: '👥 Contatos',
      descricao: 'Gerenciamento de clientes e leads',
      url: '/contatos',
      cor: '#8c52ff', // Roxo
      icone: '🧑‍🤝‍🧑',
      badge: null // Você pode adicionar a contagem de contatos aqui se tiver os dados
    },
    {
      titulo: '🎯 Kanban CRM',
      descricao: 'Gestão de leads e negócios',
      url: '/kanbans/',
      cor: '#ffc107', // Amarelo (warning)
      icone: '🎯',
      externo: true
    },
  ];

  return (
    <>
        <style>{styles}</style>

        <div className="professional-layout">

            {/* 1. Top Bar com Logo e Título */}
            <div className="top-bar">
                <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                        <img src="/Loomie.svg" alt="Loomie Logo" style={{ width: "32px", height: "32px" }} />
                        <div>
                            <h5 className="mb-0" style={{ fontWeight: 700, fontSize: '20px', color: '#1d2129' }}>
                                CRM Loomie
                            </h5>
                            <small style={{ color: '#65676b' }}>Sistema Completo de Gestão</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Container Flutuante de Notificações */}
            <div
                className="notif-card"
                style={{ maxHeight: isExpanded ? '85vh' : 'auto', overflowY: isExpanded ? 'auto' : 'visible' }}
            >
                {notificacoesNaoLidas.length > 0 && (
                <Card className="shadow-lg border-0">
                    <Card.Header className="notif-header d-flex justify-content-between align-items-center py-2 px-3">
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
                            Marcar Lidas
                        </Button>
                    )}
                    </Card.Header>
                    <ListGroup variant="flush">
                    {notificacoesExibidas.map(n => {
                        const tipoStyle = getTipoBadge(n.tipo);
                        return (
                        <ListGroup.Item
                            key={n.id}
                            className="notif-item"
                            style={{ padding: '10px 15px', borderLeftColor: tipoStyle.cor, backgroundColor: '#fff' }}
                        >
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

            {/* 2. Conteúdo Principal */}
            <div className="main-content">
                <Container className="p-0" style={{ maxWidth: '1200px', margin: '0 auto' }}>

                    {/* Resumo Rápido/Status do Sistema - Mantido o visual sóbrio */}
                    <Card className="border-0 shadow-sm mb-5" style={{ borderRadius: '15px', backgroundColor: '#ffffff' }}>
                        <Card.Body className="p-4">
                            <h5 className="text-center mb-4" style={{ color: "#316dbd", fontWeight: 700 }}>
                                📊 Resumo Rápido do Atendimento
                            </h5>
                            {loading ? (
                                <div className="text-center py-3">
                                    <Spinner animation="border" variant="primary" />
                                </div>
                            ) : (
                                <Row className="text-center">
                                    <Col md={4} className="border-end">
                                        <div className="p-3">
                                            <h3 style={{ color: "#dc3545", fontWeight: 700 }}>
                                                {resumoAtendimento.aguardando}
                                            </h3>
                                            <small className="text-muted">Chamados **Aguardando**</small>
                                        </div>
                                    </Col>
                                    <Col md={4} className="border-end">
                                        <div className="p-3">
                                            <h3 style={{ color: "#ffc107", fontWeight: 700 }}>
                                                {resumoAtendimento.emAndamento}
                                            </h3>
                                            <small className="text-muted">Chamados **Em Atendimento**</small>
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="p-3">
                                            <h3 style={{ color: "#7ed957", fontWeight: 700 }}>
                                                {resumoAtendimento.operadoresOnline}
                                            </h3>
                                            <small className="text-muted">**Operadores Online**</small>
                                        </div>
                                    </Col>
                                </Row>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Módulos Principais */}
                    <h2 className="text-center mb-4" style={{ color: "#316dbd", fontWeight: 700 }}>
                        🚀 Módulos do Sistema
                    </h2>
                    <Row className="g-4 justify-content-center">
                    {modulosCRM.map((modulo, index) => (
                        <Col md={6} lg={3} key={index}>
                        <Card
                            className="h-100 module-card"
                            style={{ animation: modulo.urgente ? 'pulse 2s infinite' : 'none' }}
                            onClick={() => {
                            if (modulo.externo) {
                                window.open(modulo.url, '_blank');
                            } else {
                                window.location.href = modulo.url;
                            }
                            }}
                        >
                            <div style={{
                            background: `linear-gradient(135deg, ${modulo.cor}, ${modulo.cor}cc)`,
                            padding: '1.5rem',
                            color: 'white',
                            textAlign: 'center'
                            }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
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
                            <div className="mt-3">
                                <Button
                                style={{
                                    backgroundColor: modulo.cor,
                                    borderColor: modulo.cor,
                                    borderRadius: '15px',
                                    fontWeight: 600,
                                    transition: 'all 0.3s'
                                }}
                                size="sm"
                                >
                                {modulo.externo ? 'Abrir em Nova Aba' : 'Acessar Módulo'} →
                                </Button>
                            </div>
                            </Card.Body>
                        </Card>
                        </Col>
                    ))}
                    </Row>
                </Container>

                {/* Footer */}
                <footer
                    style={{
                        paddingTop: "4rem",
                        textAlign: "center",
                        fontSize: "0.9rem",
                        color: "#6c757d",
                    }}
                >
                    <p className="mb-2">
                        🚀 Desenvolvido por <span style={{ color: "#316dbd", fontWeight: 700 }}>Loomie</span>
                    </p>
                    <small>
                        Sistema de CRM e Atendimento • Versão 1.0 • {new Date().getFullYear()}
                    </small>
                </footer>
            </div>
        </div>
    </>
  );
};

export default Home;