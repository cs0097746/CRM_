import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { getToken } from "../function/validateToken.tsx";
import backend_url from "../config/env.ts";

interface PlanData {
    plano: string;
    preco: number;
    limite_usuarios: number;
    usuarios_utilizados: number;
    limite_pipelines: number;
    pipelines_inclusos: number;
    limite_contatos: number;
    contatos_utilizados: number;
}

const styles = `
    .plan-container {
        min-height: 80vh;
        background-color: #f8f9fa; 
    }
    .plan-card {
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        transition: all 0.2s ease;
        border: 1px solid #e1e5e9;
        height: 100%;
    }
    .plan-card .card-title {
        color: #316dbd; /* Azul primário */
        font-size: 1.25rem;
    }
    .btn-upgrade-plan {
        background-color: #7ed957; /* Verde suave (CTA) */
        border-color: #7ed957;
        font-weight: 600;
        border-radius: 8px;
        padding: 0.6rem 1.5rem;
        box-shadow: 0 4px 12px rgba(126, 217, 87, 0.4);
    }
    /* Estilos para barras de progresso */
    .progress-danger .progress-bar {
        background-color: #dc3545 !important; 
    }
    .progress-warning .progress-bar {
        background-color: #ffc107 !important; 
    }
`;

const getProgressStatus = (used: number, limit: number) => {
    if (limit === 0 || limit === Infinity) return { variant: "success", now: 0, className: "" };

    const percentage = (used / limit) * 100;
    let variant = "success";
    let className = "";

    if (percentage >= 95) {
        variant = "danger";
        className = "progress-danger";
    } else if (percentage >= 75) {
        variant = "warning";
        className = "progress-warning";
    } else {
        variant = "success";
    }

    return { now: percentage, variant, className };
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export default function PlanUsageDashboard() {
    const [planData, setPlanData] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const api = axios.create({ baseURL: `${backend_url}` });

    const fetchPlanData = async () => {
        try {
            const token = await getToken();
            if (!token) throw new Error("Autenticação falhou.");

            const res = await api.get<PlanData>("plan_usage/", {
                headers: { Authorization: `Bearer ${token}` },
            });

            setPlanData(res.data);
        } catch (err) {
            console.error("Erro ao buscar dados do plano:", err);

            let errorMessage = "Ocorreu um erro desconhecido ao carregar o plano.";
            if (axios.isAxiosError(err) && err.response && err.response.data && err.response.data.error) {
                 errorMessage = err.response.data.error;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlanData();
    }, []);

    if (loading) return (
        <Container className="py-5 text-center plan-container">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Buscando informações do seu plano...</p>
        </Container>
    );

    if (error) return (
        <Container className="py-5 plan-container">
            <Alert variant="danger">
                ⚠️ <strong>Erro:</strong> {error}
            </Alert>
        </Container>
    );

    if (!planData) return null;

    const userProgress = getProgressStatus(planData.usuarios_utilizados, planData.limite_usuarios);
    const pipelineProgress = getProgressStatus(planData.pipelines_inclusos, planData.limite_pipelines);
    const contactProgress = getProgressStatus(planData.contatos_utilizados, planData.limite_contatos);

    return (
        <>
            <style>{styles}</style>
            <Container className="py-5 plan-container">
                <div className="d-flex justify-content-between align-items-center mb-5">
                    <h1 className="fw-bold" style={{ color: "#316dbd" }}>
                        Meu Plano: {planData.plano}
                    </h1>
                    <Button
                        className="btn-upgrade-plan"
                        onClick={() => window.location.href = "/planos"}
                    >
                        🚀 Mudar de Plano
                    </Button>
                </div>

                <Card className="mb-5 plan-card bg-primary text-white border-0">
                    <Card.Body className="d-flex justify-content-between align-items-center">
                        <h4 className="mb-0">
                            Preço Mensal:
                            <span className="fw-bold ms-2">{formatCurrency(planData.preco)}</span>
                        </h4>
                        <Badge bg="light" text="primary" className="p-2 fs-6">
                            PLANO {planData.plano.toUpperCase()}
                        </Badge>
                    </Card.Body>
                </Card>

                <h3 className="mb-4 text-secondary">Uso dos Recursos Limitados</h3>
                <Row className="g-4 mb-5">
                    <Col xs={12} md={4}>
                        <ResourceCard
                            title="👥 Usuários da Equipe (EM DESENVOLVIMENTO)"
                            used={planData.usuarios_utilizados}
                            limit={planData.limite_usuarios}
                            progress={userProgress}
                            ctaText="Gerenciar Usuários"
                            ctaLink="/users-management"
                            limitWarningText="Limite de usuários atingido! Faça o upgrade."
                        />
                    </Col>

                    <Col xs={12} md={4}>
                        <ResourceCard
                            title="⚡ Pipelines (Kanbans)"
                            used={planData.pipelines_inclusos}
                            limit={planData.limite_pipelines}
                            progress={pipelineProgress}
                            ctaText="Ir para Pipelines"
                            ctaLink="/kanbans"
                            limitWarningText="Limite de pipelines atingido! Exclua ou faça o upgrade."
                        />
                    </Col>

                    <Col xs={12} md={4}>
                        <ResourceCard
                            title="📞 Contatos / Leads"
                            used={planData.contatos_utilizados}
                            limit={planData.limite_contatos}
                            progress={contactProgress}
                            ctaText="Gerenciar Contatos"
                            ctaLink="/contatos"
                            limitWarningText="Limite de contatos atingido! Faça a limpeza ou upgrade."
                        />
                    </Col>
                </Row>

                <Alert variant="info" className="text-center">
                    Sua produtividade não pode parar!
                    <Link to="/planos" className="alert-link ms-2 fw-bold">
                        Veja o que nossos planos superiores podem oferecer.
                    </Link>
                </Alert>
            </Container>
        </>
    );
}

interface ResourceCardProps {
    title: string;
    used: number;
    limit: number;
    progress: ReturnType<typeof getProgressStatus>;
    ctaText: string;
    ctaLink: string;
    limitWarningText: string;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ title, used, limit, progress, ctaText, ctaLink, limitWarningText }) => {

    const isLimitReached = used >= limit;

    return (
        <Card className="plan-card">
            <Card.Body>
                <Card.Title className="fw-bold mb-3">{title}</Card.Title>

                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 className="mb-0 fw-light">{used}</h2>
                    <p className="text-muted mb-0">de {limit === Infinity || limit === 0 ? 'Ilimitado' : limit}</p>
                </div>

                <ProgressBar
                    now={progress.now}
                    variant={progress.variant}
                    className={progress.className}
                    label={`${Math.round(progress.now)}%`}
                    style={{ height: '18px' }}
                />

                {isLimitReached && (
                    <Alert variant="danger" className="mt-3 p-2 text-center">
                        🚨 <strong>Atenção:</strong> {limitWarningText}
                    </Alert>
                )}

                <Link to={ctaLink} className="btn btn-outline-secondary btn-sm w-100 mt-3">
                    {ctaText}
                </Link>
            </Card.Body>
        </Card>
    );
};