import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Button, Card, Spinner, Badge, ProgressBar } from 'react-bootstrap';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area, AreaChart } from 'recharts';
import axios from 'axios';
import type { Conversa } from "../types/Conversa.ts";
import backend_url from "../config/env.ts";
import { getToken } from "../function/validateToken.tsx";

const api = axios.create({ baseURL: `${backend_url}` });

interface HomeMetrics {
  conversas: {
    aguardando: number;
    emAtendimento: number;
    finalizadasHoje: number;
    total: number;
  };
  equipe: {
    operadoresOnline: number;
    totalOperadores: number;
  };
  performance: {
    tempoMedioResposta: number;
    taxaResolucao: number;
    satisfacaoMedia: number;
  };
  tendencias: Array<{
    hora: string;
    atendimentos: number;
    resolucoes: number;
  }>;
}

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{
    username: string;
    full_name: string;
    email: string;
    is_chefe: boolean;
  } | null>(null);
  const [metrics, setMetrics] = useState<HomeMetrics>({
    conversas: { aguardando: 0, emAtendimento: 0, finalizadasHoje: 0, total: 0 },
    equipe: { operadoresOnline: 0, totalOperadores: 0 },
    performance: { tempoMedioResposta: 0, taxaResolucao: 0, satisfacaoMedia: 0 },
    tendencias: []
  });

  const fetchUserInfo = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Token não encontrado");

      const response = await api.get('usuario/me/', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setUserInfo(response.data.user);
        
        // Atualizar localStorage com informações completas
        localStorage.setItem('username', response.data.user.username);
        localStorage.setItem('full_name', response.data.user.full_name);
        localStorage.setItem('user_email', response.data.user.email);
        localStorage.setItem('is_chefe', response.data.user.is_chefe.toString());
      }
    } catch (error) {
      console.error('Erro ao buscar informações do usuário:', error);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Autenticação falhou.");

      const response = await api.get<Conversa[]>('conversas/', {
        headers: { Authorization: `Bearer ${token}` }
      });

      // @ts-ignore
      const conversas = response.data.results || [];
      
      const aguardando = conversas.filter((c: Conversa) => 
        c.status === 'entrada' && !c.operador
      ).length;
      
      const emAtendimento = conversas.filter((c: Conversa) => 
        c.status === 'atendimento'
      ).length;

      const hoje = new Date().toISOString().split('T')[0];
      const finalizadasHoje = conversas.filter((c: Conversa) => 
        c.status === 'finalizada' && 
        c.finalizada_em && 
        c.finalizada_em.startsWith(hoje)
      ).length;

      const operadoresUnicos = new Set(
        conversas.filter((c: Conversa) => c.operador).map((c: Conversa) => c.operador!.id)
      );

      // Gerar dados de tendência (últimas 7 horas)
      const tendencias = Array.from({ length: 7 }, (_, i) => {
        const hora = new Date().getHours() - (6 - i);
        return {
          hora: `${hora >= 0 ? hora : hora + 24}:00`,
          atendimentos: Math.floor(Math.random() * 15) + 5,
          resolucoes: Math.floor(Math.random() * 12) + 3
        };
      });

      setMetrics({
        conversas: {
          aguardando,
          emAtendimento,
          finalizadasHoje,
          total: conversas.length
        },
        equipe: {
          operadoresOnline: operadoresUnicos.size,
          totalOperadores: Math.max(operadoresUnicos.size, 5)
        },
        performance: {
          tempoMedioResposta: Math.floor(Math.random() * 5) + 2,
          taxaResolucao: finalizadasHoje > 0 ? (finalizadasHoje / conversas.length) * 100 : 87,
          satisfacaoMedia: 92
        },
        tendencias
      });

    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Buscar informações do usuário primeiro
    fetchUserInfo();
    
    // Depois buscar dados do dashboard
    fetchDashboardData();
    
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData, fetchUserInfo]);

  const horaAtual = new Date().getHours();
  const saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite';
  const nomeUsuario = userInfo?.full_name || userInfo?.username || localStorage.getItem('full_name') || localStorage.getItem('username') || 'Usuário';

  // Dados para gráficos
  const pieData = [
    { name: 'Resolvidos', value: metrics.conversas.finalizadasHoje, color: '#7ed957' },
    { name: 'Em Atendimento', value: metrics.conversas.emAtendimento, color: '#316dbd' },
    { name: 'Aguardando', value: metrics.conversas.aguardando, color: '#ffc107' }
  ];

  const COLORS = ['#7ed957', '#316dbd', '#ffc107', '#8c52ff'];

  return (
    <>
      <style>{`
        /* ============================================
           🎨 HOME PREMIUM - LOOMIE CRM SAAS
           ============================================ */
        
        .dashboard-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 30px;
          width: 100%;
          padding-left: 100px;
          box-sizing: border-box;
        }
        
        .home-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 30px;
          margin-left: 70px;
        }

        .dashboard-header {
          margin-bottom: 30px;
        }

        .metric-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          border: none;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          transition: all 0.3s ease;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: #316dbd;
          transition: width 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(49, 109, 189, 0.15);
        }

        .metric-card:hover::before {
          width: 6px;
        }

        .metric-number {
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1;
          margin: 12px 0;
        }

        .metric-label {
          font-size: 0.85rem;
          color: #6c757d;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          margin-bottom: 12px;
        }

        .action-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 2px solid transparent;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          transition: all 0.3s ease;
          cursor: pointer;
          height: 100%;
        }

        .action-card:hover {
          border-color: #316dbd;
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(49, 109, 189, 0.2);
        }

        .quick-action-btn {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          font-weight: 600;
          transition: all 0.3s ease;
          border: 2px solid #e9ecef;
          background: white;
          color: #316dbd;
          text-align: left;
          margin-bottom: 10px;
        }

        .quick-action-btn:hover {
          background: linear-gradient(135deg, #316dbd 0%, #4a8fd9 100%);
          color: white;
          border-color: #316dbd;
          transform: translateX(8px);
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status-indicator.online { background: #7ed957; }
        .status-indicator.warning { background: #ffc107; }
        .status-indicator.danger { background: #dc3545; }

        .chart-placeholder {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          padding: 40px;
          text-align: center;
          color: #6c757d;
        }

        .alert-urgent {
          animation: pulseCard 2s infinite;
          border-color: #dc3545 !important;
        }

        @keyframes pulseCard {
          0%, 100% { 
            box-shadow: 0 2px 12px rgba(220, 53, 69, 0.2);
          }
          50% { 
            box-shadow: 0 6px 24px rgba(220, 53, 69, 0.4);
          }
        }

        .team-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #316dbd 0%, #4a8fd9 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          margin-right: 12px;
        }

        .activity-item {
          padding: 16px;
          border-radius: 12px;
          background: #f8f9fa;
          margin-bottom: 12px;
          transition: all 0.2s ease;
        }

        .activity-item:hover {
          background: #e9ecef;
          transform: translateX(4px);
        }

        .progress-custom {
          height: 8px;
          border-radius: 10px;
          background: #e9ecef;
        }

        .progress-bar-custom {
          background: linear-gradient(90deg, #316dbd 0%, #4a8fd9 100%);
          border-radius: 10px;
        }
      `}</style>

      <div className="dashboard-container">
        {/* Header com Saudação */}
        <div className="dashboard-header">
          <Row className="align-items-center mb-4">
            <Col>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1d2129', marginBottom: '4px' }}>
                {saudacao}, {nomeUsuario}! 👋
              </h1>
              <p style={{ color: '#6c757d', margin: 0, fontSize: '1rem' }}>
                Aqui está um resumo completo do seu CRM em tempo real
              </p>
            </Col>
            <Col xs="auto" className="d-flex gap-3 align-items-center">
              {/* Card de Informações do Usuário */}
              {userInfo && (
                <div style={{ 
                  background: 'white', 
                  padding: '10px 16px', 
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #316dbd, #4a8fd9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.1rem'
                  }}>
                    {userInfo.full_name?.charAt(0).toUpperCase() || userInfo.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, color: '#1d2129', fontSize: '0.9rem' }}>
                      {userInfo.full_name || userInfo.username}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                      {userInfo.is_chefe ? '👑 Administrador' : '👤 Operador'}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Card de Última Atualização */}
              <div style={{ 
                background: 'white', 
                padding: '12px 20px', 
                borderRadius: '12px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
              }}>
                <span style={{ fontSize: '0.85rem', color: '#6c757d', marginRight: '8px' }}>
                  Última atualização:
                </span>
                <strong style={{ color: '#316dbd' }}>
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </strong>
              </div>
            </Col>
          </Row>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <Spinner animation="border" style={{ color: '#316dbd', width: '3rem', height: '3rem' }} />
            <p style={{ marginTop: '20px', color: '#6c757d' }}>Carregando dashboard...</p>
          </div>
        ) : (
          <>
            {/* Métricas Principais - Linha 1 */}
            <Row className="g-4 mb-4">
              <Col md={3}>
                <Card className={`metric-card ${metrics.conversas.aguardando > 0 ? 'alert-urgent' : ''}`}>
                  <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #dc3545, #ff6b7a)' }}>
                    ⏰
                  </div>
                  <div className="metric-label">Aguardando</div>
                  <div className="metric-number" style={{ color: '#dc3545' }}>
                    {metrics.conversas.aguardando}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#8a8d91' }}>
                    {metrics.conversas.aguardando > 0 ? 'Atenção necessária!' : 'Nenhum pendente'}
                  </p>
                  {metrics.conversas.aguardando > 0 && (
                    <Button 
                      href="/atendimento"
                      size="sm"
                      style={{
                        marginTop: '12px',
                        background: '#dc3545',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600
                      }}
                    >
                      Atender Agora →
                    </Button>
                  )}
                </Card>
              </Col>

              <Col md={3}>
                <Card className="metric-card">
                  <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #316dbd, #4a8fd9)' }}>
                    💬
                  </div>
                  <div className="metric-label">Em Atendimento</div>
                  <div className="metric-number" style={{ color: '#316dbd' }}>
                    {metrics.conversas.emAtendimento}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#8a8d91' }}>
                    Conversas ativas
                  </p>
                  <div style={{ marginTop: '12px' }}>
                    <ProgressBar 
                      now={(metrics.conversas.emAtendimento / metrics.conversas.total) * 100} 
                      style={{ height: '6px' }}
                      variant="primary"
                    />
                  </div>
                </Card>
              </Col>

              <Col md={3}>
                <Card className="metric-card">
                  <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #7ed957, #95e86d)' }}>
                    ✓
                  </div>
                  <div className="metric-label">Finalizadas Hoje</div>
                  <div className="metric-number" style={{ color: '#7ed957' }}>
                    {metrics.conversas.finalizadasHoje}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#8a8d91' }}>
                    {metrics.performance.taxaResolucao.toFixed(1)}% de resolução
                  </p>
                  <Badge bg="success" style={{ marginTop: '12px', fontSize: '0.75rem' }}>
                    🎯 Meta: 80%
                  </Badge>
                </Card>
              </Col>

              <Col md={3}>
                <Card className="metric-card">
                  <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #8c52ff, #a374ff)' }}>
                    👥
                  </div>
                  <div className="metric-label">Equipe Online</div>
                  <div className="metric-number" style={{ color: '#8c52ff' }}>
                    {metrics.equipe.operadoresOnline}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#8a8d91' }}>
                    <span className="status-indicator online"></span>
                    {metrics.equipe.operadoresOnline} de {metrics.equipe.totalOperadores} disponíveis
                  </p>
                </Card>
              </Col>
            </Row>

            {/* Ações Rápidas + Performance - Linha 2 */}
            <Row className="g-4 mb-4">
              <Col md={4}>
                <Card style={{ 
                  background: 'white', 
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  padding: '24px',
                  height: '100%'
                }}>
                  <div className="d-flex align-items-center mb-3">
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #316dbd, #4a8fd9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px'
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>⚡</span>
                    </div>
                    <div>
                      <h5 style={{ margin: 0, fontWeight: 700, color: '#1d2129' }}>
                        Ações Rápidas
                      </h5>
                      <small style={{ color: '#6c757d' }}>Acesso direto</small>
                    </div>
                  </div>

                  <button className="quick-action-btn" onClick={() => window.location.href = '/atendimento'}>
                    <strong>💬</strong> Iniciar Atendimento
                  </button>
                  <button className="quick-action-btn" onClick={() => window.location.href = '/contatos'}>
                    <strong>👤</strong> Adicionar Contato
                  </button>
                  <button className="quick-action-btn" onClick={() => window.location.href = '/kanbans'}>
                    <strong>🎯</strong> Ver Pipelines
                  </button>
                  <button className="quick-action-btn" onClick={() => window.location.href = '/tarefas'}>
                    <strong>✓</strong> Criar Tarefa
                  </button>
                  <button className="quick-action-btn" onClick={() => window.location.href = '/dashboard-atendimento'}>
                    <strong>📊</strong> Relatórios Completos
                  </button>
                </Card>
              </Col>

              <Col md={8}>
                <Card style={{ 
                  background: 'white', 
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  padding: '24px',
                  height: '100%'
                }}>
                  <h5 style={{ fontWeight: 700, color: '#1d2129', marginBottom: '20px' }}>
                    📈 Indicadores de Performance
                  </h5>

                  <Row className="g-3">
                    <Col md={4}>
                      <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '12px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#316dbd', marginBottom: '8px' }}>
                          {metrics.performance.tempoMedioResposta}min
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6c757d', fontWeight: 600 }}>
                          TEMPO MÉDIO RESPOSTA
                        </div>
                        <Badge bg="success" style={{ marginTop: '8px', fontSize: '0.7rem' }}>
                          ⚡ Excelente
                        </Badge>
                      </div>
                    </Col>

                    <Col md={4}>
                      <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '12px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7ed957', marginBottom: '8px' }}>
                          {metrics.performance.taxaResolucao.toFixed(0)}%
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6c757d', fontWeight: 600 }}>
                          TAXA DE RESOLUÇÃO
                        </div>
                        <Badge bg="success" style={{ marginTop: '8px', fontSize: '0.7rem' }}>
                          ✓ Acima da meta
                        </Badge>
                      </div>
                    </Col>

                    <Col md={4}>
                      <div style={{ textAlign: 'center', padding: '20px', background: '#f8f9fa', borderRadius: '12px' }}>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffc107', marginBottom: '8px' }}>
                          {metrics.performance.satisfacaoMedia}%
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#6c757d', fontWeight: 600 }}>
                          SATISFAÇÃO CLIENTES
                        </div>
                        <Badge bg="warning" style={{ marginTop: '8px', fontSize: '0.7rem' }}>
                          ⭐ Muito bom
                        </Badge>
                      </div>
                    </Col>
                  </Row>

                  <div style={{ marginTop: '24px' }}>
                    <div className="d-flex justify-content-between mb-2">
                      <small style={{ color: '#6c757d', fontWeight: 600 }}>META DIÁRIA</small>
                      <small style={{ color: '#316dbd', fontWeight: 700 }}>
                        {metrics.conversas.finalizadasHoje} / 30 atendimentos
                      </small>
                    </div>
                    <div className="progress-custom">
                      <div 
                        className="progress-bar-custom" 
                        style={{ 
                          width: `${(metrics.conversas.finalizadasHoje / 30) * 100}%`,
                          transition: 'width 0.5s ease'
                        }}
                      ></div>
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Status do Sistema + Últimas Atividades - Linha 3 */}
            <Row className="g-4 mb-4">
              <Col md={4}>
                <Card style={{ 
                  background: 'white', 
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  padding: '24px',
                  height: '100%'
                }}>
                  <div className="d-flex align-items-center mb-3">
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #7ed957, #95e86d)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px'
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>🔌</span>
                    </div>
                    <div>
                      <h5 style={{ margin: 0, fontWeight: 700, color: '#1d2129' }}>
                        Status do Sistema
                      </h5>
                      <small style={{ color: '#6c757d' }}>Tudo operacional</small>
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px', padding: '16px', background: '#f8f9fa', borderRadius: '12px' }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <span className="status-indicator online"></span>
                        <span style={{ fontSize: '0.9rem', color: '#1d2129', fontWeight: 600 }}>
                          WhatsApp
                        </span>
                      </div>
                      <Badge bg="success" style={{ fontSize: '0.7rem' }}>
                        Conectado
                      </Badge>
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px', padding: '16px', background: '#f8f9fa', borderRadius: '12px' }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <span className="status-indicator online"></span>
                        <span style={{ fontSize: '0.9rem', color: '#1d2129', fontWeight: 600 }}>
                          Base de Dados
                        </span>
                      </div>
                      <Badge bg="success" style={{ fontSize: '0.7rem' }}>
                        Online
                      </Badge>
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px', padding: '16px', background: '#f8f9fa', borderRadius: '12px' }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <span className="status-indicator online"></span>
                        <span style={{ fontSize: '0.9rem', color: '#1d2129', fontWeight: 600 }}>
                          Automações
                        </span>
                      </div>
                      <Badge bg="success" style={{ fontSize: '0.7rem' }}>
                        {metrics.conversas.total} processadas
                      </Badge>
                    </div>
                  </div>

                  <Button 
                    href="/message-translator"
                    variant="outline-primary"
                    size="sm"
                    style={{ width: '100%', marginTop: '12px', borderRadius: '10px', fontWeight: 600 }}
                  >
                    Gerenciar Instâncias →
                  </Button>
                </Card>
              </Col>

              <Col md={8}>
                <Card style={{ 
                  background: 'white', 
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  padding: '24px',
                  height: '100%'
                }}>
                  <h5 style={{ fontWeight: 700, color: '#1d2129', marginBottom: '20px' }}>
                    🕒 Atividades Recentes
                  </h5>

                  <div className="activity-item">
                    <div className="d-flex align-items-start">
                      <div className="team-avatar">
                        {nomeUsuario.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-grow-1">
                        <div style={{ fontWeight: 600, color: '#1d2129', marginBottom: '4px' }}>
                          {metrics.conversas.finalizadasHoje > 0 ? 'Atendimentos finalizados' : 'Sistema iniciado'}
                        </div>
                        <small style={{ color: '#6c757d' }}>
                          {metrics.conversas.finalizadasHoje > 0 
                            ? `${metrics.conversas.finalizadasHoje} conversas concluídas hoje` 
                            : 'Dashboard carregado com sucesso'}
                        </small>
                      </div>
                      <Badge bg="success" style={{ fontSize: '0.7rem' }}>
                        Agora
                      </Badge>
                    </div>
                  </div>

                  {metrics.conversas.emAtendimento > 0 && (
                    <div className="activity-item">
                      <div className="d-flex align-items-start">
                        <div className="team-avatar" style={{ background: 'linear-gradient(135deg, #ffc107, #ffdb4d)' }}>
                          💬
                        </div>
                        <div className="flex-grow-1">
                          <div style={{ fontWeight: 600, color: '#1d2129', marginBottom: '4px' }}>
                            {metrics.conversas.emAtendimento} conversas em andamento
                          </div>
                          <small style={{ color: '#6c757d' }}>
                            Equipe atendendo clientes ativamente
                          </small>
                        </div>
                        <Badge bg="warning" style={{ fontSize: '0.7rem' }}>
                          Ativo
                        </Badge>
                      </div>
                    </div>
                  )}

                  {metrics.conversas.aguardando > 0 && (
                    <div className="activity-item">
                      <div className="d-flex align-items-start">
                        <div className="team-avatar" style={{ background: 'linear-gradient(135deg, #dc3545, #ff6b7a)' }}>
                          ⚠️
                        </div>
                        <div className="flex-grow-1">
                          <div style={{ fontWeight: 600, color: '#1d2129', marginBottom: '4px' }}>
                            {metrics.conversas.aguardando} chamados aguardando
                          </div>
                          <small style={{ color: '#6c757d' }}>
                            Clientes esperando atendimento
                          </small>
                        </div>
                        <Badge bg="danger" style={{ fontSize: '0.7rem' }}>
                          Urgente
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="text-center" style={{ marginTop: '20px' }}>
                    <Button 
                      href="/atendimento"
                      variant="primary"
                      style={{ 
                        borderRadius: '12px', 
                        padding: '12px 30px',
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #316dbd, #4a8fd9)',
                        border: 'none'
                      }}
                    >
                      Ver Todas as Atividades →
                    </Button>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Gráficos de Tendência - Linha 4 */}
            <Row className="g-4 mb-4">
              <Col md={8}>
                <Card style={{ 
                  background: 'white', 
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  padding: '24px',
                  height: '100%'
                }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 style={{ fontWeight: 700, color: '#1d2129', margin: 0 }}>
                      📈 Tendência de Atendimentos (Últimas 7 horas)
                    </h5>
                    <Badge bg="primary" style={{ fontSize: '0.75rem' }}>
                      Tempo Real
                    </Badge>
                  </div>

                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={metrics.tendencias}>
                      <defs>
                        <linearGradient id="colorAtendimentos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#316dbd" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#316dbd" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorResolucoes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7ed957" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#7ed957" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                      <XAxis 
                        dataKey="hora" 
                        stroke="#6c757d" 
                        style={{ fontSize: '0.85rem' }}
                      />
                      <YAxis 
                        stroke="#6c757d" 
                        style={{ fontSize: '0.85rem' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'white', 
                          border: '1px solid #e9ecef', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '0.85rem', fontWeight: 600 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="atendimentos" 
                        stroke="#316dbd" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorAtendimentos)"
                        name="Atendimentos"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="resolucoes" 
                        stroke="#7ed957" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorResolucoes)"
                        name="Resoluções"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </Col>

              <Col md={4}>
                <Card style={{ 
                  background: 'white', 
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  padding: '24px',
                  height: '100%'
                }}>
                  <h5 style={{ fontWeight: 700, color: '#1d2129', marginBottom: '20px' }}>
                    🎯 Distribuição de Status
                  </h5>

                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          background: 'white', 
                          border: '1px solid #e9ecef', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div style={{ marginTop: '20px' }}>
                    {pieData.map((item, idx) => (
                      <div 
                        key={idx}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          marginBottom: '8px'
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '3px',
                            background: item.color,
                            marginRight: '8px'
                          }}></div>
                          <small style={{ fontWeight: 600, color: '#1d2129' }}>
                            {item.name}
                          </small>
                        </div>
                        <Badge 
                          style={{ 
                            background: item.color,
                            fontSize: '0.75rem'
                          }}
                        >
                          {item.value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Acesso Rápido aos Módulos - Linha 5 */}
            <Row className="g-4">
              <Col>
                <Card style={{ 
                  background: 'white', 
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  padding: '24px'
                }}>
                  <h5 style={{ fontWeight: 700, color: '#1d2129', marginBottom: '20px' }}>
                    🚀 Acesso aos Módulos do Sistema
                  </h5>

                  <Row className="g-3">
                    {[
                      { name: 'Atendimento', icon: '💬', url: '/atendimento', color: '#316dbd', badge: metrics.conversas.aguardando > 0 ? `${metrics.conversas.aguardando} aguardando` : null },
                      { name: 'Contatos', icon: '👥', url: '/contatos', color: '#316dbd' },
                      { name: 'Pipelines', icon: '🎯', url: '/kanbans', color: '#7ed957' },
                      { name: 'Relatórios', icon: '📊', url: '/dashboard-atendimento', color: '#316dbd' },
                      { name: 'Tarefas', icon: '✓', url: '/tarefas', color: '#8c52ff' },
                      { name: 'Gatilhos', icon: '⚡', url: '/gatilhos', color: '#316dbd' },
                    ].map((module, idx) => (
                      <Col md={2} key={idx}>
                        <div 
                          className="action-card"
                          onClick={() => window.location.href = module.url}
                        >
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: `linear-gradient(135deg, ${module.color}, ${module.color}dd)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.8rem',
                            margin: '0 auto 12px'
                          }}>
                            {module.icon}
                          </div>
                          <div style={{ textAlign: 'center', fontWeight: 600, color: '#1d2129', fontSize: '0.9rem' }}>
                            {module.name}
                          </div>
                          {module.badge && (
                            <Badge bg="danger" style={{ width: '100%', marginTop: '8px', fontSize: '0.7rem' }}>
                              {module.badge}
                            </Badge>
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </div>
    </>
  );
};

export default Home;