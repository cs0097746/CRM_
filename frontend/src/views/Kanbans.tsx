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
        background: #f8f9fa;
        width: 100%;
    }

    .kanbans-content {
        padding: 2rem;
        width: 100%;
    }

    /* Estilo do Card Kanban (Visualização em Grid) - Predominância Azul e Branco */
    .kanban-card {
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(49, 109, 189, 0.08);
        transition: all 0.3s ease;
        border: 1px solid #e1e8ed;
        background: white;
        height: 100%;
        cursor: pointer;
    }
    .kanban-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(49, 109, 189, 0.15);
        border-color: #316dbd;
    }
    .kanban-card .card-title {
        color: #316dbd;
        font-size: 1.1rem;
        font-weight: 600;
    }

    /* Estilo da Visualização em Lista - Simples e Clean */
    .kanban-list-item {
        background-color: white;
        border: 1px solid #e1e8ed;
        border-left: 3px solid #316dbd;
        border-radius: 6px;
        padding: 16px 20px;
        margin-bottom: 10px;
        transition: all 0.2s ease;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .kanban-list-item:hover {
        background-color: #f8f9fa;
        border-left-color: #2557a0;
        box-shadow: 0 2px 8px rgba(49, 109, 189, 0.1);
    }
    .kanban-list-item .list-title {
        color: #316dbd;
        font-weight: 600;
    }

    /* Estilo do Modal - Clean e Profissional */
    .modal-professional .modal-content {
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border: none;
    }
    .modal-professional .modal-header {
        background-color: #316dbd;
        color: white;
        border-bottom: none;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
        padding: 1.2rem 1.5rem;
    }
    .modal-professional .modal-title {
        font-weight: 600;
        font-size: 1.1rem;
    }
    .modal-professional .form-control {
        border-radius: 6px;
        border: 1px solid #dee2e6;
        padding: 0.65rem;
    }
    .modal-professional .form-control:focus {
        border-color: #316dbd;
        box-shadow: 0 0 0 0.2rem rgba(49, 109, 189, 0.1);
    }

    /* Botões - Azul predominante, verde apenas no criar */
    .btn-create-kanban {
        background-color: #7ed957;
        border: none;
        color: white;
        font-weight: 600;
        border-radius: 6px;
        padding: 0.6rem 1.5rem;
        transition: all 0.2s ease;
    }
    .btn-create-kanban:hover {
        background-color: #6bc542;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(126, 217, 87, 0.25);
    }
    .btn-primary-kanban {
        background-color: #316dbd;
        border: none;
        color: white;
        font-weight: 600;
        border-radius: 6px;
        padding: 0.5rem 1rem;
        transition: all 0.2s ease;
    }
    .btn-primary-kanban:hover {
        background-color: #2557a0;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(49, 109, 189, 0.2);
    }
    
    /* Toggle View - Simples */
    .kanbans-header .view-toggle button {
        border: 1px solid rgba(255, 255, 255, 0.4) !important;
        background-color: transparent;
        color: white;
        transition: all 0.2s ease;
        font-weight: 500;
        padding: 0.5rem 0.75rem;
    }
    .kanbans-header .view-toggle button:hover {
        background-color: rgba(255, 255, 255, 0.15);
        border-color: white !important;
    }
    .kanbans-header .view-toggle .active,
    .kanbans-header .view-toggle button.btn-primary {
        background-color: white !important;
        color: #316dbd !important;
        border-color: white !important;
    }

    /* Badge - Azul discreto */
    .badge.bg-secondary {
        background-color: #6c757d !important;
        border: none;
        font-weight: 500;
    }

    /* Input de busca - Clean */
    .kanbans-header .input-group .input-group-text {
        background-color: white;
        border: none;
        color: #6c757d;
        border-radius: 6px 0 0 6px;
    }
    .kanbans-header .input-group .form-control {
        border: none;
        border-radius: 0 6px 6px 0;
        background-color: white;
    }
    .kanbans-header .input-group .form-control:focus {
        border: none;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
    }
    .kanbans-header .input-group .form-control::placeholder {
        color: #999;
    }

    /* Header - Azul sólido simples */
    .kanbans-header {
        background-color: #316dbd;
        padding: 1.5rem 2rem;
        margin: 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    /* Título - Clean */
    .page-title {
        color: white;
        font-weight: 600;
        font-size: 1.5rem;
        margin: 0;
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

  // Criar api fora do componente ou usar useMemo para evitar recriação
  const api = useMemo(() => axios.create({ baseURL: `${backend_url}` }), []);

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
  }, []);

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
    <div className="kanbans-container d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
            <Spinner animation="border" style={{ color: '#316dbd', width: '3rem', height: '3rem' }} />
            <p className="mt-3" style={{ color: '#316dbd', fontSize: '1.1rem', fontWeight: 600 }}>Carregando Pipelines...</p>
        </div>
    </div>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="kanbans-container">
        <div className="kanbans-header">
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <h1 className="page-title">
              🎯 Gestão de Pipeline
            </h1>

            <div className="d-flex gap-3 align-items-center flex-wrap">

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
        </div>

        <div className="kanbans-content">
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
        </div>
      </div>

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