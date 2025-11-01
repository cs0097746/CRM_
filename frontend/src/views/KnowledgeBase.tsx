import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import type { KnowledgeBaseSet} from "../types/KnowledgeBase.ts";
import backend_url from "../config/env.ts";
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Modal, Form } from 'react-bootstrap';
import { getToken} from "../function/validateToken.tsx";
import { FaDatabase, FaPlus, FaChevronRight, FaTrash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

const styles = {
    container: { minHeight: '100vh', backgroundColor: '#f8f9fa' },
    card: { borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', transition: 'all 0.2s ease', border: '1px solid #e1e5e9', height: '100%' },
    cardTitle: { color: '#007bff', fontSize: '1.25rem' },
    btnCreate: { backgroundColor: '#28a745', borderColor: '#28a745', fontWeight: 600, borderRadius: '8px', padding: '0.6rem 1.5rem' },
    listItem: { transition: 'background-color 0.2s', cursor: 'pointer' },
    cardClickableArea: { flexGrow: 1, padding: '1.25rem', cursor: 'pointer' }
};

interface KnowledgeBaseSetModalProps {
    show: boolean;
    onClose: () => void;
    editingSet: KnowledgeBaseSet | null;
    onSaveSuccess: () => void;
}

const api = axios.create({ baseURL: `${backend_url}` });

function KnowledgeBaseSetModal({
    show,
    onClose,
    editingSet,
    onSaveSuccess
}: KnowledgeBaseSetModalProps) {

    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isEditing = !!editingSet;
    const modalTitle = isEditing
        ? `Editar Set: ${editingSet?.name}`
        : 'Criar Novo Set de Conhecimento';

    useEffect(() => {
        if (show) {
            setName(editingSet?.name || '');
            setErrorMessage(null);
        }
    }, [show, editingSet]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setErrorMessage(null);

        if (name.trim() === '') {
            setErrorMessage('⚠️ O nome do Set é obrigatório.');
            setLoading(false);
            return;
        }

        try {
            const token = await getToken();
            if (!token) {
                throw new Error("Autenticação falhou. Token não disponível.");
            }

            const payload = {
                name: name.trim(),
            };

            if (isEditing && editingSet) {
                await api.put(`sets/${editingSet.id}/`, payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } else {
                await api.post(`sets/`, payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            onSaveSuccess();
        } catch (err) {
            console.error(`Erro ao salvar Set:`, err);
            let message = `Erro ao ${isEditing ? 'atualizar' : 'criar'} o Set. Tente novamente.`;

            if (axios.isAxiosError(err) && err.response) {
                const errorData = err.response.data;
                if (errorData.name) {
                    message = `Erro no Nome: ${errorData.name.join(' ')}`;
                } else if (errorData.detail) {
                    message = errorData.detail;
                } else {
                    message = `Erro do Servidor: ${err.response.status}`;
                }
            } else if (err instanceof Error) {
                message = err.message;
            }
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onClose} backdrop="static" keyboard={false} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title className='fw-bold'>
                    {modalTitle}
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {errorMessage && <Alert variant="danger" className="text-start">🚫 {errorMessage}</Alert>}

                    <Form.Group className="mb-3" controlId="kb-set-name">
                        <Form.Label className='fw-bold mb-1'>
                            Nome do Set
                            <span className="text-danger ms-1"> *</span>
                        </Form.Label>
                        <Form.Control
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Ex: Tabela de Preços, Especificações Técnicas"
                            autoFocus
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        <FaTimes className="me-2" /> Cancelar
                    </Button>
                    <Button variant="success" type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <FaSave className="me-2" /> {isEditing ? 'Atualizar' : 'Criar Set'}
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default function KnowledgeBaseSetsList() {
  const [sets, setSets] = useState<KnowledgeBaseSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingSetId, setDeletingSetId] = useState<number | null>(null);
  const [showSetModal, setShowSetModal] = useState(false);
  const [editingSet, setEditingSet] = useState<KnowledgeBaseSet | null>(null);
  const api = axios.create({ baseURL: `${backend_url}` });

  const fetchKnowledgeSets = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Autenticação falhou. Token não disponível.");
      }

      const res = await api.get<KnowledgeBaseSet[]>("sets/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // @ts-ignore
      setSets(res.data.results || res.data);
    } catch (err) {
      console.error("Erro ao buscar conjuntos de conhecimento:", err);

      let message = "Erro de conexão ou desconhecido.";

      if (axios.isAxiosError(err)) {
        if (err.response) {
            const errorData = err.response.data;
            if (errorData.detail) {
                message = errorData.detail;
            } else if (typeof errorData === 'string') {
                message = errorData;
            } else {
                message = `Erro do Servidor: ${err.response.status}.`;
            }
        } else if (err.request) {
            message = "Erro de rede. Verifique a conexão com o backend.";
        }
      } else if (err instanceof Error) {
        message = err.message;
      }

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKnowledgeSets();
  }, [fetchKnowledgeSets]);

  const handleCreateSet = () => {
      setEditingSet(null);
      setShowSetModal(true);
  };

  const handleEditSet = (e: React.MouseEvent, kbSet: KnowledgeBaseSet) => {
      e.stopPropagation();
      setEditingSet(kbSet);
      setShowSetModal(true);
  };

  const handleCloseSetModal = () => {
      setShowSetModal(false);
      setEditingSet(null);
  };

  const handleSaveSuccess = () => {
      handleCloseSetModal();
      fetchKnowledgeSets();
  };

  const handleDeleteSet = async (e: React.MouseEvent, setId: number, setName: string) => {
    e.stopPropagation();

    if (!window.confirm(`⚠️ Tem certeza que deseja EXCLUIR o Set "${setName}" (ID: ${setId})? Todos os campos e entradas serão PERDIDOS!`)) {
      return;
    }

    setDeletingSetId(setId);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Autenticação falhou. Token não disponível.");
      }

      await api.delete(`sets/${setId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchKnowledgeSets();
      alert(`Set "${setName}" excluído com sucesso!`);

    } catch (err) {
      console.error(`Erro ao deletar set ${setId}:`, err);

      let message = `Erro ao deletar set "${setName}".`;
      if (axios.isAxiosError(err) && err.response && err.response.data.detail) {
        message = err.response.data.detail;
      } else if (err instanceof Error) {
        message = err.message;
      }
      alert(`Falha na exclusão: ${message}`);
    } finally {
      setDeletingSetId(null);
    }
  };

  if (loading) return (
    <Container className="py-5 text-center" style={styles.container}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Carregando Conjuntos de Conhecimento...</p>
    </Container>
  );

  return (
    <Container className="py-5" style={styles.container}>
        <Row className="mb-4 align-items-center">
            <Col>
                <h1 className="fw-bold" style={{ color: "#316dbd" }}>
                    <FaDatabase className="me-2" /> Bases de Conhecimento
                </h1>
            </Col>
            <Col xs="auto">
                <Button
                    style={styles.btnCreate}
                    onClick={handleCreateSet}
                >
                    <FaPlus className="me-2" /> Criar Novo Set
                </Button>
            </Col>
        </Row>

        {errorMessage && (
            <Alert variant="danger" className="mb-4" onClose={() => setErrorMessage(null)} dismissible>
                ⚠️ **Erro ao Carregar:** {errorMessage}
            </Alert>
        )}

        {sets.length === 0 && !loading && (
            <Alert variant="info" className="text-center">
                Nenhum conjunto de conhecimento encontrado.
            </Alert>
        )}

        <Row className="g-4">
            {sets.map((kbSet) => {
                const isDeleting = deletingSetId === kbSet.id;

                return (
                <Col key={kbSet.id} xs={12} md={6} lg={4}>
                    <Card
                        style={styles.card}
                        onClick={() => window.location.href = `/kbsets/${kbSet.id}`}
                    >
                        <Card.Body className="d-flex flex-column">

                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <h5 className="card-title fw-bold mb-0" style={styles.cardTitle}>
                                    {kbSet.name}
                                </h5>
                                <Badge bg="primary" pill>#{kbSet.id}</Badge>
                            </div>

                            <div className="mt-2 mb-4">
                                <Badge bg="secondary" className="me-2">Campos: {kbSet.fields.length}</Badge>
                                <Badge bg="success">Entradas: {kbSet.entries.length}</Badge>
                            </div>

                            <div className="mt-auto d-flex justify-content-end">

                                <Button
                                    variant="outline-warning"
                                    size="sm"
                                    className="me-2"
                                    onClick={(e) => handleEditSet(e, kbSet)}
                                    disabled={isDeleting}
                                >
                                    <FaEdit size={12} className="me-1" /> Editar
                                </Button>

                                <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="me-3"
                                    onClick={(e) => handleDeleteSet(e, kbSet.id, kbSet.name)}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                    ) : (
                                        <FaTrash size={12} className="me-1" />
                                    )}
                                    Remover
                                </Button>

                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    as={Link as any}
                                    to={`/kbsets/${kbSet.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={isDeleting}
                                >
                                    Ver Detalhes <FaChevronRight size={10} className="ms-1" />
                                </Button>
                            </div>

                        </Card.Body>
                    </Card>
                </Col>
            );})}
        </Row>

        <KnowledgeBaseSetModal
            show={showSetModal}
            onClose={handleCloseSetModal}
            editingSet={editingSet}
            onSaveSuccess={handleSaveSuccess}
        />
    </Container>
  );
}