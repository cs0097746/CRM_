import { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Button, ButtonGroup, Table, Badge, Alert, Card } from 'react-bootstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { AtendimentoStats } from '../types/AtendimentoDashboard';
import AtendimentoCard from '../components/AtendimentoCard';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";

const AtendimentoDashboard = () => {
  const [data, setData] = useState<AtendimentoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState('hoje');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = await getToken();
      if (!token) throw new Error("Autenticação falhou.");

      try {
        const api = axios.create({ baseURL: backend_url });
        const response = await api.get<AtendimentoStats>(
            'atendimento-stats/',
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            });
        setData(response.data);
      } catch (err) {
        setError('Falha ao carregar os dados do atendimento.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [timeFilter]);

  const formatTempo = (minutos: number) => {
    if (minutos < 1) return `${Math.round(minutos * 60)}s`;
    if (minutos < 60) return `${minutos.toFixed(1)}min`;
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return `${horas}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return <Badge bg="success">Online</Badge>;
      case 'ocupado': return <Badge bg="warning">Ocupado</Badge>;
      case 'offline': return <Badge bg="secondary">Offline</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const dadosPizza = data ? [
    { name: 'Aguardando', value: data.distribuicao_status.entrada, color: '#dc3545' },
    { name: 'Atendimento', value: data.distribuicao_status.atendimento, color: '#ffc107' },
    { name: 'Resolvidas', value: data.distribuicao_status.resolvida, color: '#7ed957' }
  ] : [];

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
              Atendimento
            </h1>
            <p style={{ color: "#6c757d", fontSize: "1rem", margin: 0 }}>
              Dashboard de suporte e conversas em tempo real
            </p>
          </div>
        </div>
        <ButtonGroup>
          <Button variant={timeFilter === 'hoje' ? 'primary' : 'light'} onClick={() => setTimeFilter('hoje')}>Hoje</Button>
          <Button variant={timeFilter === 'semana' ? 'primary' : 'light'} onClick={() => setTimeFilter('semana')}>Semana</Button>
          <Button variant={timeFilter === 'mes' ? 'primary' : 'light'} onClick={() => setTimeFilter('mes')}>Mês</Button>
          <Button
            variant="success"
            href="/atendimento"
            style={{ marginLeft: "10px", borderRadius: "10px", backgroundColor: "#7ed957", borderColor: "#7ed957" }}
          >
            💬 Ir para Atendimento
          </Button>
        </ButtonGroup>
      </header>

      {loading && <p style={{ color: "#316dbd", fontSize: "1.2rem", textAlign: "center" }}>⏳ Carregando dados do atendimento...</p>}
      {error && <Alert variant="danger">{error}</Alert>}

      {data && (
        <>
          <Container fluid className="p-0 mb-4">
            <Row>
              <Col md={6} lg={3} className="mb-4">
                <AtendimentoCard
                  title="Conversas Aguardando"
                  value={data.conversas_aguardando}
                  icon="⏳"
                  variant="danger"
                  urgent={data.conversas_aguardando > 5}
                />
              </Col>
              <Col md={6} lg={3} className="mb-4">
                <AtendimentoCard
                  title="Em Atendimento"
                  value={data.conversas_em_andamento}
                  icon="💬"
                  variant="warning"
                />
              </Col>
              <Col md={6} lg={3} className="mb-4">
                <AtendimentoCard
                  title="Resolvidas Hoje"
                  value={data.conversas_resolvidas_hoje}
                  icon="✅"
                  variant="success"
                />
              </Col>
              <Col md={6} lg={3} className="mb-4">
                <AtendimentoCard
                  title="Operadores Online"
                  value={data.operadores_online}
                  subValue={`de ${data.operadores_performance.length} total`}
                  icon="👥"
                  variant="info"
                />
              </Col>
            </Row>
          </Container>

          <Container fluid className="p-0 mb-4">
            <Row>
              <Col md={6} lg={3} className="mb-4">
                <AtendimentoCard
                  title="Tempo Médio Resposta"
                  value={formatTempo(data.tempo_resposta_medio_min)}
                  icon="⚡"
                  variant="primary"
                />
              </Col>
              <Col md={6} lg={3} className="mb-4">
                <AtendimentoCard
                  title="Maior Tempo Espera"
                  value={formatTempo(data.tempo_espera_max_min)}
                  icon="⏱️"
                  variant={data.tempo_espera_max_min > 15 ? "danger" : "warning"}
                  urgent={data.tempo_espera_max_min > 15}
                />
              </Col>
              <Col md={6} lg={3} className="mb-4">
                <AtendimentoCard
                  title="Taxa de Resolução"
                  value={`${data.taxa_resolucao_percent}%`}
                  icon="🎯"
                  variant="success"
                />
              </Col>
              <Col md={6} lg={3} className="mb-4">
                <AtendimentoCard
                  title="Pico do Dia"
                  value={data.pico_horario.conversas}
                  subValue={`às ${data.pico_horario.hora}`}
                  icon="📈"
                  variant="info"
                />
              </Col>
            </Row>
          </Container>

          <Container fluid className="p-0 mb-4">
            <Row>
              <Col lg={6} className="mb-4">
                <Card style={{ borderRadius: '15px', border: '1px solid #316dbd' }}>
                  <Card.Header style={{ backgroundColor: '#316dbd', color: 'white', borderRadius: '15px 15px 0 0' }}>
                    <h5 className="mb-0">📊 Status das Conversas</h5>
                  </Card.Header>
                  <Card.Body>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={dadosPizza}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {dadosPizza.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={6} className="mb-4">
                <Card style={{ borderRadius: '15px', border: '1px solid #7ed957' }}>
                  <Card.Header style={{ backgroundColor: '#7ed957', color: 'white', borderRadius: '15px 15px 0 0' }}>
                    <h5 className="mb-0">📈 Atividade por Horário</h5>
                  </Card.Header>
                  <Card.Body>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.atividade_por_hora}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hora" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="conversas"
                          stroke="#316dbd"
                          strokeWidth={3}
                          name="Novas Conversas"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Container>

          <Container fluid className="p-0">
            <Card style={{ borderRadius: '15px', border: '1px solid #8c52ff' }}>
              <Card.Header style={{ backgroundColor: '#8c52ff', color: 'white', borderRadius: '15px 15px 0 0' }}>
                <h5 className="mb-0">👨‍💼 Performance da Equipe</h5>
              </Card.Header>
              <Card.Body>
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>Operador</th>
                      <th>Status</th>
                      <th>Conversas Ativas</th>
                      <th>Resolvidas</th>
                      <th>Tempo Médio</th>
                      <th>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.operadores_performance.map(operador => (
                      <tr key={operador.id}>
                        <td>
                          <strong style={{ color: '#316dbd' }}>{operador.nome}</strong>
                        </td>
                        <td>{getStatusBadge(operador.status)}</td>
                        <td>
                          <Badge bg="warning">{operador.conversas_ativas}</Badge>
                        </td>
                        <td>
                          <Badge bg="success">{operador.conversas_resolvidas}</Badge>
                        </td>
                        <td>{formatTempo(operador.tempo_medio_min)}</td>
                        <td>
                          <Badge bg={operador.tempo_medio_min <= 3 ? 'success' : operador.tempo_medio_min <= 5 ? 'warning' : 'danger'}>
                            {operador.tempo_medio_min <= 3 ? 'Excelente' : operador.tempo_medio_min <= 5 ? 'Bom' : 'Melhorar'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Container>
        </>
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

export default AtendimentoDashboard;