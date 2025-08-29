import { useState, useEffect } from 'react';
import { Container, Row, Col, Button, ButtonGroup } from 'react-bootstrap';
import axios from 'axios';
import type { DashboardData } from '../types/Dashboard';
import KpiCard from '../components/KpiCard';

const Home = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState('semana');

  const api = axios.create({ baseURL: "http://localhost:8000" });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {

        const response = await api.get<DashboardData>('/api/dashboard-stats/');
        setData(response.data);
      } catch (err) {
        setError('Falha ao carregar os dados do dashboard.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeFilter]);

  const formatCurrency = (amount: number = 0) =>
    amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
      <header
        style={{
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="d-flex align-items-center gap-2">
            <img src="/Loomie.svg" alt="Loomie Logo" style={{ width: "80px", height: "80px" }} />
            <div>
              <h1 style={{ color: "#316dbd", fontWeight: 800, fontSize: "2.2rem", margin: 0 }}>
                Dashboard
              </h1>
              <p style={{ color: "#6c757d", fontSize: "1rem", margin: 0 }}>
                Visão geral do desempenho da sua equipe
              </p>
            </div>
        </div>
        <ButtonGroup>
            <Button variant={timeFilter === 'hoje' ? 'primary' : 'light'} onClick={() => setTimeFilter('hoje')}>Hoje</Button>
            <Button variant={timeFilter === 'semana' ? 'primary' : 'light'} onClick={() => setTimeFilter('semana')}>Semana</Button>
            <Button variant={timeFilter === 'mes' ? 'primary' : 'light'} onClick={() => setTimeFilter('mes')}>Mês</Button>
            <Button
              variant="success"
              href="/kanban"
              target="_blank"
              style={{ marginLeft: "10px", borderRadius: "10px" }}
            >
              Ir para o CRM
            </Button>
        </ButtonGroup>
      </header>

      {loading && <p>Carregando...</p>}
      {error && <p className="text-danger">{error}</p>}
      
      {data && (
        <Container fluid className="p-0">
          <Row>
            <Col md={4} lg={2} className="mb-4"><KpiCard title="Mensagens Recebidas" value={data.mensagens_recebidas} /></Col>
            <Col md={4} lg={2} className="mb-4"><KpiCard title="Conversas Atuais" value={data.conversas_atuais} /></Col>
            <Col md={4} lg={2} className="mb-4"><KpiCard title="Chats sem Respostas" value={data.chats_sem_respostas} /></Col>
            <Col md={6} lg={3} className="mb-4"><KpiCard title="Tempo de Resposta" value={`${data.tempo_resposta_medio_min} min`} /></Col>
            <Col md={6} lg={3} className="mb-4"><KpiCard title="Maior Tempo de Espera" value={`${data.tempo_espera_max_horas} h`} /></Col>

            <Col md={6} lg={3} className="mb-4"><KpiCard title="Leads Ganhos" value={data.leads_ganhos.total} subValue={formatCurrency(data.leads_ganhos.valor)} /></Col>
            <Col md={6} lg={3} className="mb-4"><KpiCard title="Leads Ativos" value={data.leads_ativos.total} /></Col>
            <Col md={6} lg={3} className="mb-4"><KpiCard title="Leads Perdidos" value={data.leads_perdidos.total} subValue={formatCurrency(data.leads_perdidos.valor)} /></Col>
            <Col md={6} lg={3} className="mb-4"><KpiCard title="Fontes de Lead" value="" chartData={data.fontes_lead} /></Col>
          </Row>
        </Container>
      )}
      
      <footer
        style={{
          marginTop: "auto",
          paddingTop: "2rem",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "#8c52ff",
          fontWeight: 500,
        }}
      >
        🚀 Powered by <span style={{ color: "#316dbd", fontWeight: 600 }}>loomie</span>
      </footer>
    </div>
  );
};

export default Home;

