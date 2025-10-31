import { useState, useEffect } from 'react';
import { Row, Col, Button, Card, Container } from 'react-bootstrap';
import { getToken } from "../function/validateToken.tsx";
import TermosModal from "../components/TermosModal.tsx";

const Home = () => {
  const [userName, setUserName] = useState<string>('');
  const [termosAceitos, setTermosAceitos] = useState<boolean>(false);

  useEffect(() => {
    const name = localStorage.getItem('full_name') || localStorage.getItem('username') || 'Usuário';
    setUserName(name);
  }, []);

  const handleTermosAceitos = () => {
    setTermosAceitos(true);
    console.log('✅ Termos aceitos pelo usuário');
  };

  const features = [
    {
      icon: '💬',
      title: 'Conversas Unificadas',
      description: 'Centralize WhatsApp, e-mail e mensagens em uma interface única',
      color: '#316dbd'
    },
    {
      icon: '🎯',
      title: 'Gestão de Negócios',
      description: 'Acompanhe oportunidades pelo funil visual de vendas Kanban',
      color: '#7ed957'
    },
    {
      icon: '⚡',
      title: 'Gatilhos Automáticos',
      description: 'Configure respostas e ações inteligentes sem esforço manual',
      color: '#ffc107'
    },
    {
      icon: '📊',
      title: 'Análises Estratégicas',
      description: 'Dashboards completos com dados acionáveis do seu negócio',
      color: '#8c52ff'
    },
    {
      icon: '👥',
      title: 'Controle de Acesso',
      description: 'Defina permissões e gerencie toda sua equipe operacional',
      color: '#316dbd'
    },
    {
      icon: '🔔',
      title: 'Alertas Inteligentes',
      description: 'Receba notificações instantâneas sobre eventos importantes',
      color: '#7ed957'
    }
  ];

  const benefits = [
    {
      number: '24/7',
      label: 'Suporte Ativo',
      icon: '🛟'
    },
    {
      number: '100%',
      label: 'Cloud Seguro',
      icon: '☁️'
    },
    {
      number: '∞',
      label: 'Integrações',
      icon: '🔗'
    }
  ];

  return (
    <>
      {/* Modal de Termos de Serviço */}
      <TermosModal onAceite={handleTermosAceitos} />
      
      <style>{`
        .home-clean-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
          position: fixed;
          top: 0;
          left: 70px;
          right: 0;
          bottom: 0;
          padding: 0;
          margin: 0;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .hero-section {
          background: linear-gradient(135deg, #316dbd 0%, #4a8fd9 100%);
          padding: 80px 0 100px 0;
          position: relative;
          overflow: hidden;
        }

        .hero-section::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 600px;
          height: 600px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          filter: blur(100px);
        }

        .hero-title {
          font-size: 3.5rem;
          font-weight: 800;
          color: white;
          margin-bottom: 24px;
          line-height: 1.2;
          text-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .hero-subtitle {
          font-size: 1.3rem;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 40px;
          max-width: 600px;
          line-height: 1.6;
        }

        .cta-button {
          padding: 16px 48px;
          font-size: 1.1rem;
          font-weight: 700;
          border-radius: 12px;
          border: none;
          transition: all 0.3s ease;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .cta-primary {
          background: white;
          color: #316dbd;
        }

        .cta-primary:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
          background: #f8f9fa;
        }

        .cta-secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid white;
          backdrop-filter: blur(10px);
        }

        .cta-secondary:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-4px);
        }

        .features-section {
          padding: 80px 0;
          background: white;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1d2129;
          text-align: center;
          margin-bottom: 16px;
        }

        .section-subtitle {
          font-size: 1.1rem;
          color: #6c757d;
          text-align: center;
          margin-bottom: 60px;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .feature-card {
          background: white;
          border-radius: 20px;
          padding: 40px 30px;
          border: 2px solid #f0f0f0;
          transition: all 0.4s ease;
          height: 100%;
          cursor: pointer;
        }

        .feature-card:hover {
          transform: translateY(-12px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
          border-color: transparent;
        }

        .feature-icon {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }

        .feature-card:hover .feature-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .feature-title {
          font-size: 1.4rem;
          font-weight: 700;
          color: #1d2129;
          margin-bottom: 12px;
        }

        .feature-description {
          font-size: 1rem;
          color: #6c757d;
          line-height: 1.6;
          margin: 0;
        }

        .benefits-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 60px 0;
        }

        .benefit-card {
          text-align: center;
          padding: 30px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
        }

        .benefit-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 32px rgba(49, 109, 189, 0.15);
        }

        .benefit-number {
          font-size: 3rem;
          font-weight: 800;
          color: #316dbd;
          margin-bottom: 8px;
        }

        .benefit-label {
          font-size: 1rem;
          color: #6c757d;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .benefit-icon {
          font-size: 2rem;
        }

        .cta-section {
          padding: 80px 0;
          background: linear-gradient(135deg, #7ed957 0%, #95e86d 100%);
          text-align: center;
        }

        .cta-section-title {
          font-size: 2.8rem;
          font-weight: 800;
          color: white;
          margin-bottom: 20px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .cta-section-subtitle {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 40px;
        }

        .footer-section {
          background: #1d2129;
          color: white;
          padding: 40px 0;
          text-align: center;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-bottom: 24px;
        }

        .footer-link {
          color: rgba(255, 255, 255, 0.7);
          text-decoration: none;
          font-size: 0.95rem;
          transition: color 0.3s ease;
        }

        .footer-link:hover {
          color: white;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.5rem;
          }
          
          .hero-subtitle {
            font-size: 1.1rem;
          }
          
          .section-title {
            font-size: 2rem;
          }
        }
      `}</style>

      <div className="home-clean-container">
        {/* Hero Section */}
        <div className="hero-section">
          <Container>
            <Row className="align-items-center">
              <Col lg={7}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <h1 className="hero-title">
                    Bem-vindo ao seu<br/>
                    <span style={{ color: '#7ed957' }}>Loomie CRM</span>
                  </h1>
                  <p className="hero-subtitle">
                    Gerencie seus atendimentos, acompanhe negócios e otimize sua equipe em uma única plataforma integrada.
                  </p>
                  <div className="d-flex gap-3 flex-wrap">
                    <Button 
                      className="cta-button cta-primary"
                      onClick={() => window.location.href = '/atendimento'}
                    >
                      Iniciar Atendimento
                    </Button>
                    <Button 
                      className="cta-button cta-secondary"
                      onClick={() => window.location.href = '/dashboard-atendimento'}
                    >
                      Ver Analytics
                    </Button>
                  </div>
                </div>
              </Col>
              <Col lg={5} className="text-center">
                <div style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '24px',
                  padding: '40px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  position: 'relative',
                  zIndex: 2
                }}>
                  <div style={{ fontSize: '6rem', marginBottom: '16px' }}>💼</div>
                  <h3 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
                    Bem-vindo, {userName}!
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.9)', margin: 0 }}>
                    Gerencie tudo em um só lugar
                  </p>
                </div>
              </Col>
            </Row>
          </Container>
        </div>

        {/* Benefits Section */}
        <div className="benefits-section">
          <Container>
            <Row className="g-4">
              {benefits.map((benefit, idx) => (
                <Col md={4} key={idx}>
                  <div className="benefit-card">
                    <div className="benefit-icon">{benefit.icon}</div>
                    <div className="benefit-number">{benefit.number}</div>
                    <div className="benefit-label">{benefit.label}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </Container>
        </div>

        {/* Features Section */}
        <div className="features-section">
          <Container>
            <h2 className="section-title">Seus Recursos Disponíveis</h2>
            <p className="section-subtitle">
              Explore todas as funcionalidades do seu CRM para maximizar seus resultados
            </p>

            <Row className="g-4">
              {features.map((feature, idx) => (
                <Col md={6} lg={4} key={idx}>
                  <div className="feature-card">
                    <div 
                      className="feature-icon"
                      style={{
                        background: `linear-gradient(135deg, ${feature.color}20, ${feature.color}10)`
                      }}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">{feature.description}</p>
                  </div>
                </Col>
              ))}
            </Row>
          </Container>
        </div>

        {/* CTA Section */}
        <div className="cta-section">
          <Container>
            <h2 className="cta-section-title">Comece a Atender Agora</h2>
            <p className="cta-section-subtitle">
              Sua equipe está pronta. Seus clientes estão esperando. Vamos começar!
            </p>
            <Button 
              className="cta-button cta-primary"
              onClick={() => window.location.href = '/atendimento'}
              style={{ fontSize: '1.2rem' }}
            >
              🎯 Ir para Atendimento
            </Button>
          </Container>
        </div>

        {/* Footer */}
        <div className="footer-section">
          <Container>
            <div className="footer-links">
              <a href="#" className="footer-link">Sobre</a>
              <a href="#" className="footer-link">Recursos</a>
              <a href="#" className="footer-link">Suporte</a>
              <a href="#" className="footer-link">Contato</a>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)' }}>
              © 2025 Loomie CRM. Todos os direitos reservados.
            </p>
          </Container>
        </div>
      </div>
    </>
  );
};

export default Home;
