import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Card, Badge, Alert } from 'react-bootstrap';
import axios from 'axios';

const Home = () => {
  const [loading, setLoading] = useState(true);
  const [resumoAtendimento, setResumoAtendimento] = useState({
    aguardando: 0,
    emAndamento: 0,
    operadoresOnline: 0
  });

  const api = axios.create({ baseURL: "http://localhost:8000" });

  useEffect(() => {
    const fetchResumoRapido = async () => {
      try {
        // Buscar apenas dados essenciais para a home
        const response = await api.get('/api/conversas/');
        const conversas = response.data;
        
        const aguardando = conversas.filter((c: any) => c.status === 'entrada' && !c.operador).length;
        const emAndamento = conversas.filter((c: any) => c.status === 'atendimento').length;
        const operadoresUnicos = new Set(conversas.filter((c: any) => c.operador).map((c: any) => c.operador.id));
        
        setResumoAtendimento({
          aguardando,
          emAndamento,
          operadoresOnline: operadoresUnicos.size
        });
      } catch (error) {
        console.error('Erro ao carregar resumo:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResumoRapido();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchResumoRapido, 30000);
    return () => clearInterval(interval);
  }, []);

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
      url: '/kanban',
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
          <div className="d-flex justify-content-center gap-3 flex-wrap">
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