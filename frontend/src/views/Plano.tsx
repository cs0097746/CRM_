import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import backend_url from '../config/env.ts';
import { getToken } from '../function/validateToken.tsx';
import {
    Container,
    Spinner,
    Alert,
    Card,
    Row,
    Col,
    Button,
    ListGroup,
    Modal
} from 'react-bootstrap';
import type { Plano } from "../types/Plano.ts";
import { FaUser, FaPhoneAlt, FaCodeBranch } from 'react-icons/fa';

const PLANOS_ENDPOINT = 'planos/';
const ASSINAR_ENDPOINT = 'assinaturas/iniciar/';

const api = axios.create({ baseURL: `${backend_url}` });

const ListaPlanos: React.FC = () => {
    const [planos, setPlanos] = useState<Plano[]>([]);
    const [carregando, setCarregando] = useState<boolean>(true);
    const [erro, setErro] = useState<string | null>(null);
    const [processando, setProcessando] = useState<number | null>(null);
    const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null);
    const [showModal, setShowModal] = useState<boolean>(false);

    const buscarPlanos = useCallback(async () => {
        setCarregando(true);
        setErro(null);
        try {
            const token = await getToken();
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const response = await api.get<Plano[] | { results: Plano[] }>(PLANOS_ENDPOINT, config);
            if (Array.isArray(response.data)) {
                setPlanos(response.data);
            } else {
                // @ts-ignore
                setPlanos(response.data.results || []);
            }
        } catch (err) {
            console.error('Erro ao buscar planos:', err);
            if (axios.isAxiosError(err)) {
                const detail = err.response?.data?.detail || err.response?.data?.message || '';
                setErro(`Falha ao buscar os planos: ${err.message}. ${detail}`);
            } else {
                setErro('Ocorreu um erro desconhecido.');
            }
            setPlanos([]);
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        buscarPlanos();
    }, [buscarPlanos]);

    const iniciarAssinatura = async (planoId: number) => {
        try {
            setProcessando(planoId);
            const token = await getToken();
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            const response = await api.post<{ url: string }>(
                `${ASSINAR_ENDPOINT}${planoId}/`,
                {},
                config
            );

            // @ts-ignore
            const dataUrl = response.data?.data?.url;
            if (dataUrl) {
                window.location.href = dataUrl;
            } else {
                alert('Erro: o servidor não retornou uma URL válida.');
            }
        } catch (err) {
            console.error('Erro ao iniciar assinatura:', err);
            alert('Falha ao iniciar a assinatura. Tente novamente.');
        } finally {
            setProcessando(null);
            setShowModal(false);
            setPlanoSelecionado(null);
        }
    };

    const abrirModalAviso = (plano: Plano) => {
        setPlanoSelecionado(plano);
        setShowModal(true);
    };

    const fecharModal = () => {
        setShowModal(false);
        setPlanoSelecionado(null);
    };

    return (
        <Container className="my-5">
            <h1 className="text-center fw-bold mb-5" style={{ color: '#198754' }}>
                Conheça nossos Planos de Assinatura
            </h1>

            {carregando && (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="success" role="status" />
                    <p className="mt-2 text-muted">Carregando dados dos planos...</p>
                </div>
            )}

            {erro && (
                <Alert variant="danger" className="text-center">
                    <strong>Erro de Conexão:</strong> {erro}
                    <Button variant="danger" size="sm" className="ms-3" onClick={buscarPlanos}>
                        Tentar Novamente
                    </Button>
                </Alert>
            )}

            {!carregando && !erro && planos.length === 0 && (
                <Alert variant="info" className="text-center">
                    Nenhum plano foi encontrado.
                </Alert>
            )}

            {!carregando && !erro && planos.length > 0 && (
                <Row xs={1} md={2} lg={3} className="g-4 justify-content-center">
                    {planos.map((plano) => (
                        <Col key={plano.id}>
                            <Card className="shadow-lg h-100 border-0 text-center" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                                <Card.Header
                                    className={`text-white py-4 ${
                                        plano.nome.toLowerCase().includes('premium')
                                            ? 'bg-primary'
                                            : plano.nome.toLowerCase().includes('basic')
                                            ? 'bg-secondary'
                                            : 'bg-success'
                                    }`}
                                    style={{ borderBottom: 'none' }}
                                >
                                    <h3 className="fw-bold mb-0">{plano.nome}</h3>
                                </Card.Header>
                                <Card.Body className="d-flex flex-column justify-content-between">
                                    <div>
                                        <Card.Title className="display-4 fw-bold mb-0">
                                            R$ {plano.preco}
                                        </Card.Title>
                                        <Card.Text className="text-muted mb-4">
                                            <small>/ mês</small>
                                        </Card.Text>

                                        <ListGroup variant="flush" className="text-start">
                                            <ListGroup.Item className="d-flex align-items-center">
                                                <FaUser className="text-success me-2" />
                                                {plano.usuarios_inclusos} Usuário(s) incluso(s)
                                            </ListGroup.Item>
                                            <ListGroup.Item className="d-flex align-items-center">
                                                <FaPhoneAlt className="text-success me-2" />
                                                {plano.contatos_inclusos} Contato(s)
                                            </ListGroup.Item>
                                            <ListGroup.Item className="d-flex align-items-center">
                                                <FaCodeBranch className="text-success me-2" />
                                                {plano.pipelines_inclusos} Pipeline(s)
                                            </ListGroup.Item>
                                        </ListGroup>
                                    </div>
                                </Card.Body>
                                <Card.Footer className="bg-light py-3">
                                    <Button
                                        variant={plano.nome.toLowerCase().includes('premium') ? 'primary' : 'success'}
                                        size="lg"
                                        className="w-100 fw-bold"
                                        disabled={processando === plano.id}
                                        onClick={() => abrirModalAviso(plano)}
                                    >
                                        {processando === plano.id ? (
                                            <>
                                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                                Processando...
                                            </>
                                        ) : (
                                            'Assinar Agora'
                                        )}
                                    </Button>
                                </Card.Footer>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            <Modal show={showModal} onHide={fecharModal} centered>
                <Modal.Header closeButton className="bg-warning bg-opacity-25">
                    <Modal.Title className="fw-bold text-warning">
                        ⚠️ Atenção antes de prosseguir
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    <p className="fw-semibold mb-3">
                        Para que seu pagamento seja reconhecido corretamente:
                    </p>
                    <p>
                        <strong>Use o mesmo e-mail</strong> que você utilizou para criar sua conta
                        na plataforma.
                    </p>
                    <p className="text-muted small mb-0">
                        Caso utilize outro e-mail na tela de pagamento, o sistema não conseguirá
                        vincular a assinatura automaticamente ao seu perfil.
                    </p>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <Button variant="secondary" onClick={fecharModal}>
                        Cancelar
                    </Button>
                    <Button
                        variant="success"
                        onClick={() => planoSelecionado && iniciarAssinatura(planoSelecionado.id)}
                    >
                        Entendi, continuar
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ListaPlanos;
