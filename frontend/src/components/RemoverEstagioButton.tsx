import { useState } from "react";
import axios from "axios";
import backend_url from "../config/env.ts";
import { Modal, Button, Spinner, Alert } from "react-bootstrap";
import { Trash } from "react-bootstrap-icons";

interface RemoverEstagioButtonProps {
  estagioId: number;
  estagioNome: string;
  token: string;
  onRemoved?: () => void;
}

export function RemoverEstagioButton({ estagioId, estagioNome, token, onRemoved }: RemoverEstagioButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setShowModal(false);
    setError(null);
  };
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

      onRemoved?.();

    } catch (err: unknown) {
      let errorDetail = "Erro de rede ou servidor.";

      if (axios.isAxiosError(err)) {
        errorDetail = err.response?.data ? JSON.stringify(err.response.data) : errorDetail;
      }

      console.error("Erro ao remover estágio", err);
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
          <p>Você tem certeza que deseja <strong>remover permanentemente</strong> o estágio <strong>{estagioNome}</strong>?</p>
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
