import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import Select from "react-select";
import { FaPlus } from "react-icons/fa";
import axios from "axios";
import type { Kanban } from "../../types/Kanban.ts";
import type { Contato } from "../../types/Contato.ts";
import backend_url from "../../config/env.ts";

interface CriarNegocioModalProps {
  estagioId: number;
  kanban: Kanban;
  token: string;
  onCreated: () => void;
}

export function CriarNegocioModal({ estagioId, kanban, token, onCreated }: CriarNegocioModalProps) {
  const [show, setShow] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState<number | undefined>();
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [contatoSelecionado, setContatoSelecionado] = useState<Contato | null>(null);

  useEffect(() => {
    if (show) {
      axios
        .get(`${backend_url}contatos/`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setContatos(res.data.results))
        .catch((err) => console.error("Erro ao buscar contatos:", err));
    }
  }, [show, token]);

  const handleSave = async () => {
    if (!contatoSelecionado) {
      alert("Selecione um contato antes de salvar.");
      return;
    }

    try {
      await axios.post(
        `${backend_url}kanbans/${kanban}/negocios/`,
        { titulo, valor, estagio_id: estagioId, contato_id: contatoSelecionado.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTitulo("");
      setValor(undefined);
      setContatoSelecionado(null);
      setShow(false);
      onCreated();
    } catch (err) {
      console.error("Erro ao criar negócio:", err);
    }
  };

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        className="d-inline-flex align-items-center justify-content-center ms-2"
        onClick={() => setShow(true)}
        title="Novo negócio"
      >
        <FaPlus />
      </Button>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton style={{ background: "linear-gradient(135deg, #316dbd, #8c52ff)", color: "#fff" }}>
          <Modal.Title>Novo Negócio</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Título</Form.Label>
              <Form.Control
                type="text"
                placeholder="Digite o título"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Valor (opcional)</Form.Label>
              <Form.Control
                type="number"
                placeholder="Valor"
                value={valor ?? ""}
                onChange={(e) => setValor(Number(e.target.value))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contato</Form.Label>
              <Select
                options={contatos.map((c) => ({ value: c.id, label: c.nome }))}
                value={contatoSelecionado ? { value: contatoSelecionado.id, label: contatoSelecionado.nome } : null}
                onChange={(option) => {
                  const contato = contatos.find((c) => c.id === option?.value) ?? null;
                  setContatoSelecionado(contato);
                }}
                placeholder="Selecione um contato..."
                isClearable
                isSearchable
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer className="d-flex justify-content-between">
          <Button variant="success" onClick={() => alert("Criar novo campo personalizável")}>
            Criar Campo Personalizável
          </Button>

          <div>
            <Button variant="danger" className="me-2" onClick={() => setShow(false)}>
              Excluir
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
}
