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
            className="card mb-3"
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setShow(true)}
            style={{
              ...provided.draggableProps.style,
              cursor: "pointer",
              borderRadius: "0.75rem",
              backgroundColor: snapshot.isDragging ? "#e6efff" : "#ffffff",
              boxShadow: snapshot.isDragging
                ? "0 8px 18px rgba(49,109,189,0.25)"
                : "0 3px 8px rgba(0,0,0,0.08)",
              transition: "all 0.2s ease",
            }}
          >
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6
                  style={{
                    color: "#316dbd",
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {negocio.titulo}
                </h6>
                {valor > 0 && (
                  <Badge
                    style={{
                      backgroundColor: "#7ed957",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      padding: "0.35rem 0.6rem",
                    }}
                    pill
                  >
                    R${valor}
                  </Badge>
                )}
              </div>
              <p style={{ fontSize: "0.85rem", color: "#8c52ff", margin: 0 }}>
                👤 {negocio.contato.nome}
              </p>
            </div>
          </div>
        )}
      </Draggable>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header
          closeButton
          style={{
            backgroundColor: "#316dbd",
            color: "#fff",
            borderBottom: "none",
          }}
        >
          <Modal.Title>Detalhes do Negócio</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: "#f9fafe" }}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 600 }}>Título</Form.Label>
              <Form.Control
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 600 }}>Valor</Form.Label>
              <Form.Control
                type="number"
                value={valor}
                onChange={(e) => setValor(Number(e.target.value))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: "none" }}>
          <Button
            variant="secondary"
            onClick={() => setShow(false)}
            style={{ borderRadius: "0.5rem" }}
          >
            Fechar
          </Button>
          <Button
            onClick={handleSave}
            style={{
              backgroundColor: "#316dbd",
              borderColor: "#316dbd",
              borderRadius: "0.5rem",
              fontWeight: 600,
            }}
          >
            Salvar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
