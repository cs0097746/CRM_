import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import type { Kanban } from "../types/Kanban.ts";
import backend_url from "../config/env.ts";

export default function Kanbans() {
  const [kanbans, setKanbans] = useState<Kanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKanban, setEditingKanban] = useState<Kanban | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [token, setToken] = useState<string | null>(null);

  const USERNAME = "admin";
  const PASSWORD = "admin";
  const CLIENT_ID = "KpkNSgZswIS1axx3fwpzNqvGKSkf6udZ9QoD3Ulz";
  const CLIENT_SECRET =
    "q828o8DwBwuM1d9XMNZ2KxLQvCmzJgvRnb0I1TMe0QwyVPNB7yA1HRyie45oubSQbKucq6YR3Gyo9ShlN1L0VsnEgKlekMCdlKRkEK4x1760kzgPbqG9mtzfMU4BjXvG";

  const api = axios.create({ baseURL: `${backend_url}` });

  // ===== Token =====
  const getToken = async () => {
    if (token) return token;
    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("username", USERNAME);
    params.append("password", PASSWORD);
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);

    try {
      const res = await axios.post(`${backend_url}o/token/`, params);
      setToken(res.data.access_token);
      return res.data.access_token;
    } catch (err) {
      console.error("Erro ao buscar token:", err);
    }
  };

  // ===== Buscar Kanbans =====
  const fetchKanbans = async () => {
    try {
      const t = await getToken();
      if (!t) return;

      const res = await api.get<Kanban[]>("kanbans/", {
        headers: { Authorization: `Bearer ${t}` },
      });

      // @ts-ignore
      setKanbans(res.data.results || res.data);
    } catch (err) {
      console.error("Erro ao buscar kanbans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanbans();
  }, []);

  // ===== Abrir modal =====
  const openModal = (kanban?: Kanban) => {
    if (kanban) {
      setEditingKanban(kanban);
      setNome(kanban.nome);
      setDescricao(kanban.descricao);
    } else {
      setEditingKanban(null);
      setNome("");
      setDescricao("");
    }
    setModalOpen(true);
  };

  // ===== Salvar Kanban =====
  const saveKanban = async () => {
    const t = await getToken();
    if (!t) return;

    try {
      if (editingKanban) {
        await api.put(
          `kanbans/${editingKanban.id}/`,
          { nome, descricao },
          { headers: { Authorization: `Bearer ${t}` } }
        );
      } else {
        await api.post(
          "kanbans/",
          { nome, descricao },
          { headers: { Authorization: `Bearer ${t}` } }
        );
      }
      fetchKanbans();
      setModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar kanban:", err);
    }
  };

  // ===== Excluir Kanban =====
  const deleteKanban = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este kanban?")) return;
    const t = await getToken();
    if (!t) return;

    try {
      await api.delete(`kanbans/${id}/`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      setKanbans((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      console.error("Erro ao excluir kanban:", err);
    }
  };

  if (loading) return <p>Carregando kanbans...</p>;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Kanbans</h1>
        <button className="btn btn-success" onClick={() => openModal()}>
          + Criar Kanban
        </button>
      </div>

      {kanbans.length === 0 && <p>Nenhum kanban encontrado.</p>}

      <div className="row g-3">
        {kanbans.map((kanban) => (
          <div key={kanban.id} className="col-12 col-md-6 col-lg-4">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{kanban.nome}</h5>
                <p className="card-text text-muted flex-grow-1">
                  {kanban.descricao}
                </p>
                <div className="d-flex gap-2 mt-auto">
                  <Link
                    to={`/kanban/${kanban.id}`}
                    className="btn btn-primary flex-grow-1"
                  >
                    Ir para o kanban
                  </Link>
                  <button
                    className="btn btn-warning flex-grow-1"
                    onClick={() => openModal(kanban)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger flex-grow-1"
                    onClick={() => deleteKanban(kanban.id)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingKanban ? "Editar Kanban" : "Criar Kanban"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Nome</label>
                  <input
                    type="text"
                    className="form-control"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Descrição</label>
                  <textarea
                    className="form-control"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={saveKanban}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
