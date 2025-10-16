import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import Select from "react-select";
import { FaPlus } from "react-icons/fa";
import axios from "axios";
import type { Kanban } from "../../types/Kanban.ts";
import type { Contato } from "../../types/Contato.ts";
import backend_url from "../../config/env.ts";
import type {AtributoPersonalizavel} from "../../types/AtributoPersonalizavel.ts";

interface PresetAtributos {
  id: number;
  nome: string;
  descricao: string;
  atributos: AtributoPersonalizavel[];
}

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
  const [presets, setPresets] = useState<PresetAtributos[]>([]);
  const [contatoSelecionado, setContatoSelecionado] = useState<Contato | null>(null);
  const [presetSelecionado, setPresetSelecionado] = useState<PresetAtributos | null>(null);
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);

  useEffect(() => {
    if (show) {
      axios
        .get(`${backend_url}contatos/`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setContatos(res.data.results))
        .catch((err) => console.error("Erro ao buscar contatos:", err));

      setIsLoadingPresets(true);
      axios
        .get(`${backend_url}presets/`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          setPresets(res.data.results);
          setIsLoadingPresets(false);
        })
        .catch((err) => {
          console.error("Erro ao buscar presets:", err);
          setIsLoadingPresets(false);
        });
    }
  }, [show, token]);

  const handleSave = async () => {
    if (!contatoSelecionado) {
      alert("Selecione um contato antes de salvar.");
      return;
    }

    const negocioData = {
      titulo,
      valor,
      estagio_id: estagioId,
      contato_id: contatoSelecionado.id,
      preset_id: presetSelecionado ? presetSelecionado.id : undefined,
    };

    try {
      await axios.post(
        `${backend_url}kanbans/${kanban}/negocios/`,
        negocioData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTitulo("");
      setValor(undefined);
      setContatoSelecionado(null);
      setPresetSelecionado(null);
      setShow(false);
      onCreated();
    } catch (err) {
      console.error("Erro ao criar negócio:", err);
      alert("Falha ao criar negócio. Verifique o console para detalhes.");
    }
  };

  console.log("Presets: ", presets);

  const formatPresetOptions = presets.map((p) => ({
    value: p.id,
    label: p.nome,
    preset: p,
  }));

  const handlePresetChange = (option: any) => {
    setPresetSelecionado(option ? option.preset : null);
  };

  const handleClose = () => {
    setTitulo("");
    setValor(undefined);
    setContatoSelecionado(null);
    setPresetSelecionado(null);
    setShow(false);
  };

  return (
    <>
     <Button
        variant="light"
        size="sm"
        className="d-inline-flex align-items-center justify-content-center ms-2"
        onClick={() => setShow(true)}
        title="Novo negócio"
      >
        <FaPlus />
      </Button>

      <Modal show={show} onHide={handleClose} centered>
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

            <Form.Group className="mb-3">
              <Form.Label>Preset de Atributos (opcional)</Form.Label>
              <Select
                options={formatPresetOptions}
                value={presetSelecionado ? { value: presetSelecionado.id, label: presetSelecionado.nome } : null}
                onChange={handlePresetChange}
                placeholder={isLoadingPresets ? "Carregando presets..." : "Selecione um preset..."}
                isClearable
                isSearchable
                isDisabled={isLoadingPresets}
              />
            </Form.Group>

            {presetSelecionado && (
              <div className="mt-3 p-3 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                <h6 className="text-primary">Atributos do Preset: <strong>{presetSelecionado.nome}</strong></h6>
                <small className="text-muted">{presetSelecionado.descricao}</small>

                <ul className="list-unstyled mt-2 small">
                  {presetSelecionado.atributos.map((atributo, index) => (
                    <li key={index} className="mb-1">
                      <strong className="text-dark">{atributo.label}:</strong> (Tipo: *{atributo.type}*)
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </Form>
        </Modal.Body>

        <Modal.Footer className="d-flex justify-content-between">
          <div>
            <Button variant="danger" className="me-2" onClick={handleClose}>
              Cancelar
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