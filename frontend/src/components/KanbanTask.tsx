import type { Negocio } from "../types/Negocio.ts";
import { Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import { Modal, Button, Form, Badge } from "react-bootstrap";

interface KanbanCardProps {
  negocio: Negocio;
  index: number;
}

export default function KanbanTask({ negocio, index }: KanbanCardProps) {
  const [show, setShow] = useState(false);
  const [titulo, setTitulo] = useState(negocio.titulo);
  const [valor, setValor] = useState(negocio.valor ?? 0);

  const handleSave = () => {
    console.log("Salvar:", { id: negocio.id, titulo, valor });
    setShow(false);
  };

  return (
    <>
      <Draggable draggableId={String(negocio.id)} index={index}>
        {(provided, snapshot) => (
          <div
            className={`card mb-3 shadow-sm border-0 ${
              snapshot.isDragging ? "border-primary" : ""
            }`}
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setShow(true)}
            style={{
              ...provided.draggableProps.style,
              cursor: "pointer",
              borderRadius: "0.75rem",
              backgroundColor: snapshot.isDragging ? "#e3f2fd" : "white",
              transition: "background-color 0.2s, transform 0.2s",
            }}
          >
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6 className="card-title mb-0">{negocio.titulo}</h6>
                {valor > 0 && (
                  <Badge bg="success" pill>
                    R${valor}
                  </Badge>
                )}
              </div>
              <p className="card-text text-muted mb-0">
                Cliente: {negocio.contato.nome}
              </p>
            </div>
          </div>
        )}
      </Draggable>

      <Modal show={show} onHide={() => setShow(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Detalhes do Negócio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Título</Form.Label>
              <Form.Control
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Valor</Form.Label>
              <Form.Control
                type="number"
                value={valor}
                onChange={(e) => setValor(Number(e.target.value))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShow(false)}>
            Fechar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Salvar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
