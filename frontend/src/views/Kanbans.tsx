import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import type { Kanban } from "../types/Kanban.ts";
import backend_url from "../config/env.ts";
import { Container, Row, Col, Card, Button, Modal, Form, Badge, Spinner, Alert, InputGroup } from 'react-bootstrap';
import {getToken} from "../function/validateToken.tsx";
import { FaThLarge, FaList, FaSearch } from 'react-icons/fa';

const styles = `
    .kanbans-container {
        min-height: 100vh;
        background-color: #f8f9fa; /* Fundo cinza claro */
    }

    /* Estilo do Card Kanban (Visualização em Grid) */
    .kanban-card {
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        transition: all 0.2s ease;
        border: 1px solid #e1e5e9;
        height: 100%;
        cursor: pointer;
    }
    .kanban-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 15px rgba(0,0,0,0.12);
    }
    .kanban-card .card-title {
        color: #316dbd; /* Azul primário */
        font-size: 1.25rem;
    }

    /* Estilo da Visualização em Lista */
    .kanban-list-item {
        background-color: white;
        border: 1px solid #e1e5e9;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 12px;
        transition: background-color 0.2s;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .kanban-list-item:hover {
        background-color: #f0f4f7;
    }
    .kanban-list-item .list-title {
        color: #316dbd;
        font-weight: 600;
    }

    /* Estilo do Modal Profissional (Mantido) */
    .modal-professional .modal-content {
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    .modal-professional .modal-header {
        background-color: #316dbd; 
        color: white;
        border-bottom: none;
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
    }
    .modal-professional .form-control {
        border-radius: 8px;
    }

    /* Botões de Ação (Mantido) */
    .btn-create-kanban {
        background-color: #7ed957; 
        border-color: #7ed957;
        font-weight: 600;
        border-radius: 8px;
        padding: 0.6rem 1.5rem;
        box-shadow: 0 4px 12px rgba(126, 217, 87, 0.4);
    }
    .btn-primary-kanban {
        background-color: #316dbd;
        border-color: #316dbd;
        font-weight: 600;
        border-radius: 8px;
    }
    .btn-primary-kanban:hover {
        background-color: #2a5a9c;
        border-color: #2a5a9c;
    }
    /* Estilo para o Toggle Group (Mantido) */
    .view-toggle button {
        border: 1px solid #ced4da !important;
        background-color: white;
        color: #495057;
    }
    .view-toggle .active {
        background-color: #316dbd !important;
        color: white !important;
        border-color: #316dbd !important;
    }
`;

type ViewMode = 'grid' | 'list';

interface KanbanListItemProps {
    kanban: Kanban;
    openModal: (k: Kanban) => void;
    deleteKanban: (id: number) => void;
}

const ListViewKanban: React.FC<KanbanListItemProps> = ({ kanban, openModal, deleteKanban }) => (
    <div className="kanban-list-item">
        <div className="flex-grow-1" onClick={() => window.location.href = `/kanban/${kanban.id}`}>
            <div className="d-flex align-items-center">
                <span className="list-title me-3">{kanban.nome}</span>
                <Badge bg="secondary" pill className="me-3">#{kanban.id}</Badge>
                <span className="text-muted d-none d-sm-block" style={{ fontSize: '0.9rem' }}>
                    {kanban.descricao ? kanban.descricao.substring(0, 100) + '...' : 'Nenhuma descrição fornecida.'}
                </span>
            </div>
        </div>

        <div className="d-flex gap-2 ms-3">
            <Link
                to={`/kanban/${kanban.id}`}
                className="btn btn-primary-kanban btn-sm"
            >
                Acessar
            </Link>
            <Button
                variant="warning"
                size="sm"
                onClick={(e) => { e.stopPropagation(); openModal(kanban); }}
                style={{ borderRadius: "8px" }}
            >
                ✏️
            </Button>
            <Button
                variant="danger"
                size="sm"
                onClick={(e) => { e.stopPropagation(); deleteKanban(kanban.id); }}
                style={{ borderRadius: "8px" }}
            >
                🗑️
            </Button>
        </div>
    </div>
);

export default function Kanbans() {
  const [kanbans, setKanbans] = useState<Kanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKanban, setEditingKanban] = useState<Kanban | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState("");

  const api = axios.create({ baseURL: `${backend_url}` });

  const fetchKanbans = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Autenticação falhou.");

      const res = await api.get<Kanban[]>("kanbans/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // @ts-ignore
      setKanbans(res.data.results || res.data);
    } catch (err) {
      console.error("Erro ao buscar kanbans:", err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchKanbans();
  }, [fetchKanbans]);

  const openModal = (kanban?: Kanban) => {
    if (kanban) {
      setEditingKanban(kanban);
      setNome(kanban.nome);
      setDescricao(kanban.descricao);
    } else {
      setEditingKanban(null);
      setNome("");
      setDescricao("");
    }
    setErrorMessage(null);
    setModalOpen(true);
  };

  const saveKanban = async () => {
    const token = await getToken();
    if (!token) {
        setErrorMessage("Autenticação necessária.");
        return;
    }

    setErrorMessage(null);

    try {
      if (editingKanban) {
        await api.put(
          `kanbans/${editingKanban.id}/`,
          { nome, descricao },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await api.post(
          "kanbans/",
          { nome, descricao },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      fetchKanbans();
      setModalOpen(false);
    } catch (err) {
        console.error("Erro completo ao salvar kanban:", err);

        if (axios.isAxiosError(err) && err.response) {
            const errorData = err.response.data;
            let message = "Ocorreu um erro desconhecido do servidor.";

            if (Array.isArray(errorData) && errorData.length > 0 && typeof errorData[0] === 'string') {
                message = errorData[0];
            }
            else if (errorData.non_field_errors && errorData.non_field_errors.length > 0) {
                message = errorData.non_field_errors[0];
            } else if (errorData.detail) {
                message = errorData.detail;
            }
            else if (typeof errorData === 'string') {
                message = errorData;
            } else if (errorData.nome) {
                message = `Nome: ${errorData.nome[0]}`;
            }

            setErrorMessage(message);
        } else {
            setErrorMessage("Erro de conexão ou desconhecido.");
        }
    }
  };

  const deleteKanban = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este kanban? Esta ação é irreversível.")) return;
    const token = await getToken();
    if (!token) return;

    try {
      await api.delete(`kanbans/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setKanbans((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error("Erro ao excluir kanban:", err);
      alert("Falha ao excluir o Kanban. Verifique se ele não possui itens associados.");
    }
  };

  const filteredKanbans = useMemo(() => {
    if (!searchTerm) {
      return kanbans;
    }

    const lowerCaseSearch = searchTerm.toLowerCase();

    return kanbans.filter(kanban =>
        kanban.nome.toLowerCase().includes(lowerCaseSearch) ||
        (kanban.descricao && kanban.descricao.toLowerCase().includes(lowerCaseSearch))
    );
  }, [kanbans, searchTerm]);


  if (loading) return (
    <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Carregando Pipelines...</p>
    </Container>
  );

  return (
    <>
      <style>{styles}</style>
      <Container className="py-5 kanbans-container">

        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
            <h1 className="fw-bold mb-3" style={{ color: "#316dbd" }}>
                🎯 Gestão de Pipeline
            </h1>

            <div className="d-flex gap-3 align-items-center mb-3 flex-wrap justify-content-end">

                <InputGroup style={{ maxWidth: '300px' }}>
                    <InputGroup.Text>
                        <FaSearch size={14} />
                    </InputGroup.Text>
                    <Form.Control
                        placeholder="Buscar pelo nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </InputGroup>

                <div className="btn-group view-toggle">
                    <Button
                        variant={viewMode === 'grid' ? 'primary' : 'light'}
                        onClick={() => setViewMode('grid')}
                        title="Visualização em Cartões"
                    >
                        <FaThLarge />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'primary' : 'light'}
                        onClick={() => setViewMode('list')}
                        title="Visualização em Lista"
                    >
                        <FaList />
                    </Button>
                </div>

                <Button
                    className="btn-create-kanban"
                    onClick={() => openModal()}
                >
                    + Criar Kanban
                </Button>
            </div>
        </div>

        {kanbans.length === 0 && !loading && (
            <div className="alert alert-info text-center" role="alert">
                Nenhum Kanban encontrado. Crie um novo para começar!
            </div>
        )}
        {searchTerm && filteredKanbans.length === 0 && kanbans.length > 0 && (
             <div className="alert alert-warning text-center" role="alert">
                Nenhum Kanban encontrado com o termo **"{searchTerm}"**.
            </div>
        )}

        {viewMode === 'grid' && (
            <Row className="g-4">
                {filteredKanbans.map((kanban) => (
                    <Col key={kanban.id} xs={12} md={6} lg={4}>
                        <Card
                            className="kanban-card"
                            onClick={() => window.location.href = `/kanban/${kanban.id}`}
                        >
                            <Card.Body className="d-flex flex-column">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <h5 className="card-title fw-bold mb-0">
                                        {kanban.nome}
                                    </h5>
                                    <Badge bg="secondary" pill>#{kanban.id}</Badge>
                                </div>

                                <p className="card-text text-muted flex-grow-1" style={{ fontSize: '0.9rem' }}>
                                    {kanban.descricao || 'Nenhuma descrição fornecida.'}
                                </p>

                                <div className="d-flex gap-2 mt-auto pt-3 border-top">
                                    <Link
                                        to={`/kanban/${kanban.id}`}
                                        className="btn btn-primary-kanban flex-grow-1"
                                    >
                                        Acessar
                                    </Link>
                                    <Button
                                        variant="warning"
                                        onClick={(e) => { e.stopPropagation(); openModal(kanban); }}
                                        style={{ borderRadius: "8px" }}
                                    >
                                        ✏️
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={(e) => { e.stopPropagation(); deleteKanban(kanban.id); }}
                                        style={{ borderRadius: "8px" }}
                                    >
                                        🗑️
                                    </Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        )}

        {viewMode === 'list' && (
            <div className="kanban-list">
                {filteredKanbans.map((kanban) => (
                    <ListViewKanban
                        key={kanban.id}
                        kanban={kanban}
                        openModal={openModal}
                        deleteKanban={deleteKanban}
                    />
                ))}
            </div>
        )}
      </Container>

      {modalOpen && (
        <Modal
            show={modalOpen}
            onHide={() => setModalOpen(false)}
            centered
            dialogClassName="modal-professional"
        >
          <Modal.Header closeButton closeVariant="white">
            <Modal.Title>
              {editingKanban ? "Editar Kanban" : "Criar Novo Kanban"}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errorMessage && (
                <Alert variant="danger" onClose={() => setErrorMessage(null)} dismissible>
                    ⚠️ <strong>Erro:</strong> {errorMessage}
                </Alert>
            )}
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Nome do Kanban</Form.Label>
                <Form.Control
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Descrição</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="btn-primary-kanban"
              onClick={saveKanban}
            >
              Salvar
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}