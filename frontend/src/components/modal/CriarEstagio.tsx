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
      onCreated();
    } catch (err) {
      console.error("Erro ao criar estágio", err);
    }
  };

  return (
    <>
      <button className="btn btn-success" onClick={handleShow}>
        ➕ Novo Estágio
      </button>

      {show && (
        <div className="modal fade show d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">Criar Estágio</h5>
                  <button type="button" className="btn-close" onClick={handleClose}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nome</label>
                    <input
                      type="text"
                      className="form-control"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ordem</label>
                    <input
                      type="number"
                      className="form-control"
                      value={ordem}
                      onChange={(e) => setOrdem(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="modal-footer">
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
