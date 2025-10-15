import { useState } from "react";
import axios from "axios";
import backend_url from "../config/env.ts";
import { Modal, Button, Spinner, Alert } from "react-bootstrap";
import { Trash } from "react-bootstrap-icons";

interface RemoverEstagioButtonProps {
  estagioId: number;
  estagioNome: string;
  token: string;
}

export function RemoverEstagioButton({ estagioId, estagioNome, token }: RemoverEstagioButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setShowModal(false);
    setError(null);
  }
  const handleShow = () => setShowModal(true);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await axios.delete(
        `${backend_url}estagios/${estagioId}/detail/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLoading(false);
      handleClose();

    } catch (err: any) {
      console.error("Erro ao remover estágio", err.response?.data || err);
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor.';
      setError(`Falha ao remover estágio. Erro: ${errorDetail}`);
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={handleShow}
        className="ms-2"
      >
        <Trash />
      </Button>

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Remover Estágio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <p>Você tem certeza que deseja **remover permanentemente** o estágio **{estagioNome}**?</p>
          <p className="text-danger small">Esta ação não pode ser desfeita.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Removendo...
              </>
            ) : (
              <>
                <Trash className="me-2" />
                Remover
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}