import { useState } from "react";
import axios from "axios";
import backend_url from "../../config/env.ts";

interface CriarEstagioModalProps {
  kanbanId: number;
  token: string;
  onCreated: () => void;
}

export function CriarEstagioModal({ kanbanId, token, onCreated }: CriarEstagioModalProps) {
  const [show, setShow] = useState(false);
  const [nome, setNome] = useState("");
  const [ordem, setOrdem] = useState(0);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(
        `${backend_url}estagios/${kanbanId}/`,
        { nome, ordem, kanban: kanbanId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      handleClose();
      setNome("");
      setOrdem(0);
      onCreated();
    } catch (err) {
      console.error("Erro ao criar estágio", err);
      alert("Falha ao criar estágio. Verifique os dados e tente novamente.");
    }
  };

  return (
    <>
      <button className="btn btn-success" onClick={handleShow}>
        ➕ Novo Estágio
      </button>

      {show && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: "rgba(0,0,0,0.3)" }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content" style={{ borderRadius: "1rem", boxShadow: "0 8px 25px rgba(0,0,0,0.2)" }}>
              <form onSubmit={handleSubmit}>
                <div
                  className="modal-header"
                  style={{ background: "linear-gradient(135deg, #316dbd, #8c52ff)", color: "#fff", borderBottom: "none", borderTopLeftRadius: "1rem", borderTopRightRadius: "1rem" }}
                >
                  <h5 className="modal-title">Criar Estágio</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={handleClose}></button>
                </div>
                <div className="modal-body" style={{ padding: "1.5rem" }}>
                  <div className="mb-3">
                    <label className="form-label">Nome</label>
                    <input
                      type="text"
                      className="form-control"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      style={{ borderRadius: "0.6rem", padding: "0.5rem" }}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ordem</label>
                    <input
                      type="number"
                      className="form-control"
                      value={ordem}
                      onChange={(e) => setOrdem(Number(e.target.value))}
                      style={{ borderRadius: "0.6rem", padding: "0.5rem" }}
                    />
                  </div>
                </div>
                <div className="modal-footer" style={{ borderTop: "none", justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-secondary" onClick={handleClose}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
