import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import type { Kanban } from "../types/Kanban.ts";
import backend_url from "../config/env.ts";
import { Container, Row, Col, Card, Button, Modal, Form, Badge, Spinner, Alert } from 'react-bootstrap';
import {getToken} from "../function/validateToken.tsx";

const styles = `
    .kanbans-container {
        min-height: 100vh;
        background-color: #f8f9fa; /* Fundo cinza claro */
    }

    /* Estilo do Card Kanban */
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

    /* Estilo do Modal Profissional */
    .modal-professional .modal-content {
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    .modal-professional .modal-header {
        background-color: #316dbd; /* Cabeçalho azul primário sólido */
        color: white;
        border-bottom: none;
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
    }
    .modal-professional .form-control {
        border-radius: 8px;
    }

    /* Botões de Ação */
    .btn-create-kanban {
        background-color: #7ed957; /* Verde suave */
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
`;


export default function Kanbans() {
  const [kanbans, setKanbans] = useState<Kanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKanban, setEditingKanban] = useState<Kanban | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const api = axios.create({ baseURL: `${backend_url}` });

  const fetchKanbans = async () => {
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
  };

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
    if (!token) throw new Error("Autenticação falhou.");

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

        setErrorMessage(null);

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
            }

            setErrorMessage(message);
        } else {
            setErrorMessage("Erro de conexão ou desconhecido.");
        }
    }
  };

  const deleteKanban = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este kanban?")) return;
    const token = await getToken();
    if (!token) throw new Error("Autenticação falhou.");

    try {
      await api.delete(`kanbans/${id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setKanbans((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error("Erro ao excluir kanban:", err);
    }
  };

  if (loading) return (
    <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Carregando Kanbans...</p>
    </Container>
  );

  return (
    <>
      <style>{styles}</style>
      <Container className="py-5 kanbans-container">
        <div className="d-flex justify-content-between align-items-center mb-5">
          <h1 className="fw-bold" style={{ color: "#316dbd" }}>
            🎯 Gestão de Pipeline
          </h1>
          <Button
            className="btn-create-kanban"
            onClick={() => openModal()}
          >
            + Criar Kanban
          </Button>
        </div>

        {kanbans.length === 0 && (
            <div className="alert alert-info text-center" role="alert">
                Nenhum Kanban encontrado. Crie um novo para começar!
            </div>
        )}

        <Row className="g-4">
          {kanbans.map((kanban) => (
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
                    ⚠️ **Erro:** {errorMessage}
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