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
  const [contato, setContato] = useState(negocio.contato.nome);
  const [estagio, setEstagio] = useState(negocio.estagio.nome);

  const handleSave = () => {
    console.log("Salvar:", { id: negocio.id, titulo, valor, contato, estagio });
    setShow(false);
  };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <>
      <Draggable draggableId={String(negocio.id)} index={index}>
        {(provided, snapshot) => (
          <div
            className="card mb-3"
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...provided.draggableProps.style,
              cursor: "pointer",
              borderRadius: "1rem",
              backgroundColor: snapshot.isDragging ? "#eef5ff" : "#ffffff",
              boxShadow: snapshot.isDragging
                ? "0 12px 25px rgba(49,109,189,0.25)"
                : "0 6px 18px rgba(0,0,0,0.08)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
            }}
            onClick={() => setShow(true)}
          >
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6
                  style={{
                    color: "#316dbd",
                    fontWeight: 700,
                    fontSize: "1rem",
                    margin: 0,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={negocio.titulo}
                >
                  {negocio.titulo}
                </h6>
                {valor > 0 && (
                  <Badge
                    pill
                    style={{
                      backgroundColor: "#7ed957",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      padding: "0.4rem 0.7rem",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    }}
                  >
                    R${formatCurrency(valor)}
                  </Badge>
                )}
              </div>
              <p style={{ fontSize: "0.85rem", color: "#8c52ff", margin: "4px 0" }}>
                👤 Contato: {negocio.contato.nome}
              </p>
              <p style={{ fontSize: "0.8rem", color: "#6c757d", margin: "4px 0" }}>
                📅 Criado em: {new Date(negocio.criado_em).toLocaleDateString()}
              </p>
              <p style={{ fontSize: "0.85rem", color: "#8c52ff", margin: "4px 0" }}>
                🏷 Estágio: {negocio.estagio.nome}
              </p>
            </div>
          </div>
        )}
      </Draggable>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header
          closeButton
          style={{
            background: "linear-gradient(135deg, #316dbd, #8c52ff)",
            color: "#fff",
            borderBottom: "none",
            borderTopLeftRadius: "1rem",
            borderTopRightRadius: "1rem",
          }}
        >
          <Modal.Title>Editar Negócio</Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ backgroundColor: "#f9fafe", padding: "1.5rem" }}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Título</Form.Label>
              <Form.Control
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Valor</Form.Label>
              <Form.Control
                type="number"
                value={valor}
                onChange={(e) => setValor(Number(e.target.value))}
                style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Contato</Form.Label>
              <Form.Control
                type="text"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Estágio</Form.Label>
              <Form.Control
                type="text"
                value={estagio}
                onChange={(e) => setEstagio(e.target.value)}
                style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Criado em</Form.Label>
              <Form.Control
                type="text"
                value={new Date(negocio.criado_em).toLocaleString()}
                disabled
                style={{
                  borderRadius: "0.6rem",
                  backgroundColor: "#e9ecef",
                  padding: "0.5rem",
                }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer style={{ borderTop: "none" }}>
          <Button
            variant="secondary"
            onClick={() => setShow(false)}
            style={{
              borderRadius: "0.5rem",
              fontWeight: 500,
              backgroundColor: "#e0e0e0",
              border: "none",
              color: "#333",
            }}
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
              padding: "0.45rem 1.2rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#245a9b")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#316dbd")}
          >
            Salvar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
