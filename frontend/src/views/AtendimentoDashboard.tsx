import { useState, useEffect } from 'react';
import axios from 'axios';
import { Row, Col, Button, ButtonGroup, Table, Badge, Card, ProgressBar } from 'react-bootstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { AtendimentoStats } from '../types/AtendimentoDashboard';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";

type TimeFilter = 'hoje' | 'semana' | 'mes';
const COLORS = ['#316dbd', '#7ed957', '#8c52ff', '#ffc107'];

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

  const pieData = data ? [
    { name: 'Em Atendimento', value: data.conversas_em_andamento || data.em_atendimento || 0 },
    { name: 'Finalizados', value: data.conversas_resolvidas_hoje || data.finalizados || 0 },
    { name: 'Aguardando', value: data.conversas_aguardando || data.aguardando || 0 }
  ] : [];

  const lineData = data && data.atividade_por_hora ? 
    data.atividade_por_hora.map((item) => ({
      hora: item.hora,
      conversas: item.conversas
    })) : [];

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        width: "100%",
        background: "#f8f9fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: "100px", // 70px sidebar + 30px padding
        boxSizing: "border-box"
      }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem", color: "#316dbd" }}>
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p style={{ color: "#316dbd", fontSize: "1.2rem", marginTop: "20px" }}>Carregando dados do atendimento...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#f8f9fa",
        padding: "30px",
        paddingLeft: "100px", // 70px sidebar + 30px padding
        boxSizing: "border-box"
      }}
    >
      {/* Header */}
      <div style={{ 
        background: "white",
        borderRadius: "15px",
        padding: "25px 30px",
        marginBottom: "25px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={{
            width: "60px",
            height: "60px",
            background: "linear-gradient(135deg, #316dbd 0%, #4a8bd9 100%)",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(49, 109, 189, 0.3)"
          }}>
            <i className="bi bi-bar-chart-line" style={{ fontSize: "28px", color: "white" }}></i>
          </div>
          <div>
            <h2 style={{
              color: "#316dbd",
              fontSize: "28px",
              fontWeight: "700",
              margin: 0,
              lineHeight: "1.2"
            }}>
              Dashboard de Atendimento
            </h2>
            <p style={{ color: "#6c757d", margin: 0, fontSize: "14px" }}>
              Monitore o desempenho em tempo real
            </p>
          </div>
        </div>

        <ButtonGroup>
          <Button
            variant={timeFilter === "hoje" ? "primary" : "outline-primary"}
            onClick={() => setTimeFilter("hoje")}
            style={{
              backgroundColor: timeFilter === "hoje" ? "#316dbd" : "transparent",
              borderColor: "#316dbd",
              fontWeight: "600",
              padding: "8px 20px"
            }}
          >
            <i className="bi bi-calendar-day me-2"></i>Hoje
          </Button>
          <Button
            variant={timeFilter === "semana" ? "primary" : "outline-primary"}
            onClick={() => setTimeFilter("semana")}
            style={{
              backgroundColor: timeFilter === "semana" ? "#316dbd" : "transparent",
              borderColor: "#316dbd",
              fontWeight: "600",
              padding: "8px 20px"
            }}
          >
            <i className="bi bi-calendar-week me-2"></i>Semana
          </Button>
          <Button
            variant={timeFilter === "mes" ? "primary" : "outline-primary"}
            onClick={() => setTimeFilter("mes")}
            style={{
              backgroundColor: timeFilter === "mes" ? "#316dbd" : "transparent",
              borderColor: "#316dbd",
              fontWeight: "600",
              padding: "8px 20px"
            }}
          >
            <i className="bi bi-calendar-month me-2"></i>Mês
          </Button>
        </ButtonGroup>
      </div>

      {error && (
        <div style={{
          background: "#dc3545",
          color: "white",
          padding: "15px 20px",
          borderRadius: "10px",
          marginBottom: "25px"
        }}>
          <i className="bi bi-exclamation-triangle me-2"></i>{error}
        </div>
      )}

      {data && (
        <>
          {/* Métricas Principais - 4 Cards */}
          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <Card style={{
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #316dbd 0%, #4a8bd9 100%)",
                color: "white",
                height: "100%",
                boxShadow: "0 4px 15px rgba(49, 109, 189, 0.25)",
                transition: "transform 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <Card.Body style={{ padding: "25px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: "14px", opacity: 0.9, fontWeight: "500" }}>Total de Atendimentos</p>
                      <h2 style={{ margin: "10px 0 0 0", fontSize: "36px", fontWeight: "700" }}>
                        {data.conversas_totais || data.total || (data.conversas_aguardando + data.conversas_em_andamento + data.conversas_resolvidas_hoje)}
                      </h2>
                    </div>
                    <div style={{
                      width: "50px",
                      height: "50px",
                      background: "rgba(255,255,255,0.2)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <i className="bi bi-chat-dots" style={{ fontSize: "24px" }}></i>
                    </div>
                  </div>
                  <div style={{ marginTop: "15px", fontSize: "13px", opacity: 0.9 }}>
                    <i className="bi bi-arrow-up me-1"></i>
                    <span>Volume total do período</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card style={{
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #7ed957 0%, #9ae573 100%)",
                color: "white",
                height: "100%",
                boxShadow: "0 4px 15px rgba(126, 217, 87, 0.25)",
                transition: "transform 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <Card.Body style={{ padding: "25px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: "14px", opacity: 0.95, fontWeight: "500" }}>Em Atendimento</p>
                      <h2 style={{ margin: "10px 0 0 0", fontSize: "36px", fontWeight: "700" }}>
                        {data.conversas_em_andamento || 0}
                      </h2>
                    </div>
                    <div style={{
                      width: "50px",
                      height: "50px",
                      background: "rgba(255,255,255,0.25)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <i className="bi bi-headset" style={{ fontSize: "24px" }}></i>
                    </div>
                  </div>
                  <div style={{ marginTop: "15px" }}>
                    <ProgressBar 
                      now={(data.conversas_em_andamento / (data.conversas_totais || 100)) * 100} 
                      style={{ height: "6px", background: "rgba(255,255,255,0.3)" }}
                    />
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card style={{
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #8c52ff 0%, #a573ff 100%)",
                color: "white",
                height: "100%",
                boxShadow: "0 4px 15px rgba(140, 82, 255, 0.25)",
                transition: "transform 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <Card.Body style={{ padding: "25px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: "14px", opacity: 0.95, fontWeight: "500" }}>Finalizados</p>
                      <h2 style={{ margin: "10px 0 0 0", fontSize: "36px", fontWeight: "700" }}>
                        {data.conversas_resolvidas_hoje || 0}
                      </h2>
                    </div>
                    <div style={{
                      width: "50px",
                      height: "50px",
                      background: "rgba(255,255,255,0.25)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <i className="bi bi-check-circle" style={{ fontSize: "24px" }}></i>
                    </div>
                  </div>
                  <div style={{ marginTop: "15px", fontSize: "13px", opacity: 0.95 }}>
                    Taxa: {data.taxa_resolucao_percent || 0}%
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card style={{
                borderRadius: "12px",
                border: "2px solid #316dbd",
                background: "white",
                height: "100%",
                boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
                transition: "transform 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <Card.Body style={{ padding: "25px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: "14px", color: "#6c757d", fontWeight: "500" }}>Aguardando</p>
                      <h2 style={{ margin: "10px 0 0 0", fontSize: "36px", fontWeight: "700", color: "#316dbd" }}>
                        {data.conversas_aguardando || 0}
                      </h2>
                    </div>
                    <div style={{
                      width: "50px",
                      height: "50px",
                      background: "rgba(49, 109, 189, 0.1)",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <i className="bi bi-hourglass-split" style={{ fontSize: "24px", color: "#316dbd" }}></i>
                    </div>
                  </div>
                  <div style={{ marginTop: "15px", fontSize: "13px", color: data.conversas_aguardando > 5 ? "#ffc107" : "#6c757d" }}>
                    {data.conversas_aguardando > 5 && <i className="bi bi-exclamation-triangle me-1"></i>}
                    {data.conversas_aguardando > 5 ? "Requer atenção" : "Sob controle"}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Ações Rápidas */}
          <Row className="g-3 mb-4">
            <Col xs={12}>
              <Card style={{
                borderRadius: "12px",
                border: "none",
                background: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
              }}>
                <Card.Body style={{ padding: "20px 25px" }}>
                  <h6 style={{ color: "#316dbd", fontWeight: "600", marginBottom: "15px", fontSize: "16px" }}>
                    <i className="bi bi-lightning me-2"></i>Ações Rápidas
                  </h6>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <Button href="/atendimento" style={{
                      background: "#316dbd",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 20px",
                      fontWeight: "600",
                      fontSize: "14px"
                    }}>
                      <i className="bi bi-plus-circle me-2"></i>Novo Atendimento
                    </Button>
                    <Button style={{
                      background: "#7ed957",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 20px",
                      fontWeight: "600",
                      fontSize: "14px"
                    }}>
                      <i className="bi bi-file-earmark-text me-2"></i>Relatório
                    </Button>
                    <Button style={{
                      background: "#8c52ff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "10px 20px",
                      fontWeight: "600",
                      fontSize: "14px"
                    }}>
                      <i className="bi bi-download me-2"></i>Exportar Dados
                    </Button>
                    <Button style={{
                      background: "white",
                      border: "2px solid #316dbd",
                      color: "#316dbd",
                      borderRadius: "8px",
                      padding: "10px 20px",
                      fontWeight: "600",
                      fontSize: "14px"
                    }}>
                      <i className="bi bi-gear me-2"></i>Configurações
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Métricas Secundárias */}
          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} md={3}>
              <Card style={{
                borderRadius: "12px",
                border: "none",
                background: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                height: "100%"
              }}>
                <Card.Body style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      background: "rgba(49, 109, 189, 0.1)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <i className="bi bi-speedometer2" style={{ fontSize: "20px", color: "#316dbd" }}></i>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "13px", color: "#6c757d" }}>Tempo Médio</p>
                      <h4 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#316dbd" }}>
                        {formatTempo(data.tempo_resposta_medio_min || 0)}
                      </h4>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={3}>
              <Card style={{
                borderRadius: "12px",
                border: "none",
                background: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                height: "100%"
              }}>
                <Card.Body style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      background: "rgba(126, 217, 87, 0.15)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <i className="bi bi-graph-up-arrow" style={{ fontSize: "20px", color: "#7ed957" }}></i>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "13px", color: "#6c757d" }}>Taxa Resolução</p>
                      <h4 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#7ed957" }}>
                        {data.taxa_resolucao_percent || 0}<span style={{ fontSize: "14px", fontWeight: "500" }}>%</span>
                      </h4>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={3}>
              <Card style={{
                borderRadius: "12px",
                border: "none",
                background: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                height: "100%"
              }}>
                <Card.Body style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      background: "rgba(255, 193, 7, 0.15)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <i className="bi bi-clock-history" style={{ fontSize: "20px", color: "#ffc107" }}></i>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "13px", color: "#6c757d" }}>Maior Espera</p>
                      <h4 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#ffc107" }}>
                        {formatTempo(data.tempo_espera_max_min || 0)}
                      </h4>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} sm={6} md={3}>
              <Card style={{
                borderRadius: "12px",
                border: "none",
                background: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                height: "100%"
              }}>
                <Card.Body style={{ padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      background: "rgba(49, 109, 189, 0.1)",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <i className="bi bi-people" style={{ fontSize: "20px", color: "#316dbd" }}></i>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "13px", color: "#6c757d" }}>Operadores Online</p>
                      <h4 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#316dbd" }}>
                        {data.operadores_online || 0}
                      </h4>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Gráficos */}
          <Row className="g-3 mb-4">
            <Col xs={12} lg={8}>
              <Card style={{
                borderRadius: "12px",
                border: "none",
                background: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                height: "100%"
              }}>
                <Card.Body style={{ padding: "25px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h5 style={{ color: "#316dbd", fontWeight: "600", margin: 0 }}>
                      <i className="bi bi-graph-up me-2"></i>Atendimentos por Hora
                    </h5>
                    <Badge bg="primary" style={{ background: "#316dbd", padding: "6px 12px", fontSize: "12px" }}>
                      Tempo Real
                    </Badge>
                  </div>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="hora" 
                        stroke="#6c757d"
                        style={{ fontSize: "12px" }}
                      />
                      <YAxis 
                        stroke="#6c757d"
                        style={{ fontSize: "12px" }}
                      />
                      <Tooltip 
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="conversas" 
                        stroke="#316dbd" 
                        strokeWidth={3}
                        dot={{ fill: "#316dbd", r: 5 }}
                        activeDot={{ r: 7 }}
                        name="Atendimentos"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={4}>
              <Card style={{
                borderRadius: "12px",
                border: "none",
                background: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                height: "100%"
              }}>
                <Card.Body style={{ padding: "25px" }}>
                  <h5 style={{ color: "#316dbd", fontWeight: "600", marginBottom: "20px" }}>
                    <i className="bi bi-pie-chart me-2"></i>Distribuição Status
                  </h5>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: "15px" }}>
                    {pieData.map((item, index) => (
                      <div key={index} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 0",
                        borderBottom: index < pieData.length - 1 ? "1px solid #f0f0f0" : "none"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{
                            width: "12px",
                            height: "12px",
                            borderRadius: "3px",
                            background: COLORS[index]
                          }}></div>
                          <span style={{ fontSize: "13px", color: "#6c757d" }}>{item.name}</span>
                        </div>
                        <strong style={{ fontSize: "14px", color: "#316dbd" }}>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Performance dos Atendentes */}
          <Row className="g-3">
            <Col xs={12}>
              <Card style={{
                borderRadius: "12px",
                border: "none",
                background: "white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)"
              }}>
                <Card.Body style={{ padding: "25px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h5 style={{ color: "#316dbd", fontWeight: "600", margin: 0 }}>
                      <i className="bi bi-trophy me-2"></i>Performance dos Atendentes
                    </h5>
                    <Button size="sm" style={{
                      background: "transparent",
                      border: "1px solid #316dbd",
                      color: "#316dbd",
                      fontWeight: "600",
                      borderRadius: "8px"
                    }}>
                      <i className="bi bi-download me-2"></i>Exportar
                    </Button>
                  </div>
                  <Table responsive hover style={{ marginBottom: 0 }}>
                    <thead style={{ background: "#f8f9fa" }}>
                      <tr>
                        <th style={{ borderBottom: "none", padding: "15px", fontWeight: "600", color: "#316dbd" }}>
                          <i className="bi bi-person me-2"></i>Atendente
                        </th>
                        <th style={{ borderBottom: "none", padding: "15px", fontWeight: "600", color: "#316dbd" }}>
                          <i className="bi bi-circle-fill me-2"></i>Status
                        </th>
                        <th style={{ borderBottom: "none", padding: "15px", fontWeight: "600", color: "#316dbd" }}>
                          <i className="bi bi-chat-dots me-2"></i>Ativas
                        </th>
                        <th style={{ borderBottom: "none", padding: "15px", fontWeight: "600", color: "#316dbd" }}>
                          <i className="bi bi-check-circle me-2"></i>Resolvidas
                        </th>
                        <th style={{ borderBottom: "none", padding: "15px", fontWeight: "600", color: "#316dbd" }}>
                          <i className="bi bi-clock me-2"></i>Tempo Médio
                        </th>
                        <th style={{ borderBottom: "none", padding: "15px", fontWeight: "600", color: "#316dbd" }}>
                          <i className="bi bi-star me-2"></i>Performance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.operadores_performance && data.operadores_performance.length > 0 ? (
                        data.operadores_performance.map((operador, index) => (
                          <tr key={operador.id || index} style={{ borderBottom: "1px solid #f0f0f0" }}>
                            <td style={{ padding: "15px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{
                                  width: "35px",
                                  height: "35px",
                                  borderRadius: "50%",
                                  background: "linear-gradient(135deg, #316dbd 0%, #4a8bd9 100%)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "white",
                                  fontWeight: "600",
                                  fontSize: "14px"
                                }}>
                                  {operador.nome.charAt(0).toUpperCase()}
                                </div>
                                <strong style={{ color: "#212529" }}>{operador.nome}</strong>
                              </div>
                            </td>
                            <td style={{ padding: "15px" }}>
                              {getStatusBadge(operador.status)}
                            </td>
                            <td style={{ padding: "15px", fontWeight: "600", color: "#ffc107" }}>
                              {operador.conversas_ativas || 0}
                            </td>
                            <td style={{ padding: "15px", fontWeight: "600", color: "#7ed957" }}>
                              {operador.conversas_resolvidas || 0}
                            </td>
                            <td style={{ padding: "15px", color: "#6c757d", fontWeight: "500" }}>
                              {formatTempo(operador.tempo_medio_min || 0)}
                            </td>
                            <td style={{ padding: "15px" }}>
                              <div>
                                <Badge 
                                  bg={operador.tempo_medio_min <= 3 ? "success" : operador.tempo_medio_min <= 5 ? "warning" : "danger"}
                                  style={{
                                    background: operador.tempo_medio_min <= 3 ? "#7ed957" : operador.tempo_medio_min <= 5 ? "#ffc107" : "#dc3545",
                                    padding: "6px 12px",
                                    fontWeight: "600",
                                    fontSize: "13px"
                                  }}
                                >
                                  {operador.tempo_medio_min <= 3 ? "Excelente" : operador.tempo_medio_min <= 5 ? "Bom" : "Melhorar"}
                                </Badge>
                                <ProgressBar 
                                  now={operador.tempo_medio_min <= 3 ? 100 : operador.tempo_medio_min <= 5 ? 70 : 40} 
                                  style={{ 
                                    height: "4px", 
                                    marginTop: "8px",
                                    background: "#e9ecef"
                                  }}
                                  variant={operador.tempo_medio_min <= 3 ? "success" : operador.tempo_medio_min <= 5 ? "warning" : "danger"}
                                />
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#6c757d" }}>
                            <i className="bi bi-inbox" style={{ fontSize: "48px", display: "block", marginBottom: "10px", opacity: 0.3 }}></i>
                            Nenhum operador disponível no momento
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default AtendimentoDashboard;