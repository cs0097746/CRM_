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
    <div className="container py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="text-primary fw-bold">Kanbans</h1>
        <button
          className="btn btn-success"
          onClick={() => openModal()}
          style={{
            borderRadius: "0.6rem",
            padding: "0.5rem 1rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          + Criar Kanban
        </button>
      </div>

      {kanbans.length === 0 && <p>Nenhum kanban encontrado.</p>}

      <div className="row g-4">
        {kanbans.map((kanban) => (
          <div key={kanban.id} className="col-12 col-md-6 col-lg-4">
            <div
              className="card h-100"
              style={{
                borderRadius: "1rem",
                boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 25px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)";
              }}
            >
              <div className="card-body d-flex flex-column">
                <h5 className="card-title fw-bold">{kanban.nome}</h5>
                <small className="text-muted">#{kanban.id}</small>
                <p className="card-text text-muted flex-grow-1">{kanban.descricao}</p>
                <div className="d-flex gap-2 mt-auto">
                  <Link
                    to={`/kanban/${kanban.id}`}
                    className="btn btn-primary flex-grow-1"
                    style={{
                      background: "linear-gradient(135deg, #316dbd, #8c52ff)",
                      border: "none",
                    }}
                  >
                    Ir para o kanban
                  </Link>
                  <button
                    className="btn btn-warning flex-grow-1"
                    style={{ borderRadius: "0.6rem" }}
                    onClick={() => openModal(kanban)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-danger flex-grow-1"
                    style={{ borderRadius: "0.6rem" }}
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

      {modalOpen && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content"
              style={{
                borderRadius: "1rem",
                boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
              }}
            >
              <div
                className="modal-header"
                style={{
                  background: "linear-gradient(135deg, #316dbd, #8c52ff)",
                  color: "#fff",
                  borderBottom: "none",
                  borderTopLeftRadius: "1rem",
                  borderTopRightRadius: "1rem",
                }}
              >
                <h5 className="modal-title">
                  {editingKanban ? "Editar Kanban" : "Criar Kanban"}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setModalOpen(false)}
                />
              </div>

              <div className="modal-body" style={{ padding: "1.5rem" }}>
                <div className="mb-3">
                  <label className="form-label">Nome</label>
                  <input
                    type="text"
                    className="form-control"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    style={{ borderRadius: "0.6rem", padding: "0.5rem" }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Descrição</label>
                  <textarea
                    className="form-control"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    style={{ borderRadius: "0.6rem", padding: "0.5rem" }}
                  />
                </div>
              </div>

              <div
                className="modal-footer"
                style={{ borderTop: "none", justifyContent: "flex-end" }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveKanban}
                  style={{
                    backgroundColor: "#316dbd",
                    borderColor: "#316dbd",
                    borderRadius: "0.6rem",
                  }}
                >
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
