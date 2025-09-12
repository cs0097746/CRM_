import { useState } from "react";
import axios from "axios";
import { FaPlus } from "react-icons/fa";
import type { Kanban } from "../../types/Kanban.ts";
import backend_url from "../../config/env.ts";

interface CriarNegocioModalProps {
  estagioId: number;
  kanban: Kanban;
  token: string;
  onCreated: () => void;
}

export function CriarNegocioModal({ estagioId, kanban, token, onCreated }: CriarNegocioModalProps) {
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState<number | undefined>();
  const [show, setShow] = useState(false);

  const handleSave = async () => {
    try {
      await axios.post(
        `${backend_url}kanbans/${kanban}/negocios/`,
        { titulo, valor, estagio_id: estagioId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTitulo("");
      setValor(undefined);
      setShow(false);
      onCreated();
    } catch (err) {
      console.error("Erro ao criar negócio:", err);
      console.log("Kanban", kanban);
    }
  };

  return (
    <div className="d-inline-block ms-2">
      <button
        className="btn btn-sm btn-outline-light p-1 d-flex align-items-center justify-content-center"
        onClick={() => setShow(true)}
        title="Novo negócio"
        style={{ width: "28px", height: "28px", fontSize: "0.8rem" }}
      >
        <FaPlus />
      </button>

      {show && (
        <div
          className="position-fixed top-50 start-50 translate-middle p-3"
          style={{
            zIndex: 2000,
            width: "300px",
            backgroundColor: "#fff",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
          }}
        >
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="m-0 text-primary">Novo Negócio TEM QUE TRATAR O CONTATO!!!!! TODO</h6>
            <button
              type="button"
              className="btn-close btn-sm"
              onClick={() => setShow(false)}
            ></button>
          </div>
          <div className="mb-2">
            <input
              type="text"
              className="form-control form-control-sm mb-1"
              placeholder="Título do negócio"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder="Valor (opcional)"
              value={valor ?? ""}
              onChange={(e) => setValor(Number(e.target.value))}
            />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button className="btn btn-sm btn-secondary" onClick={() => setShow(false)}>
              Cancelar
            </button>
            <button className="btn btn-sm btn-success" onClick={handleSave}>
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
