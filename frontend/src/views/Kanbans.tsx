import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import type { Kanban } from "../types/Kanban.ts";
import backend_url from "../config/env.ts";

export default function Kanbans() {
  const [kanbans, setKanbans] = useState<Kanban[]>([]);
  const [loading, setLoading] = useState(true);

  const USERNAME = "admin";
  const PASSWORD = "admin";
  const CLIENT_ID = "KpkNSgZswIS1axx3fwpzNqvGKSkf6udZ9QoD3Ulz";
  const CLIENT_SECRET =
    "q828o8DwBwuM1d9XMNZ2KxLQvCmzJgvRnb0I1TMe0QwyVPNB7yA1HRyie45oubSQbKucq6YR3Gyo9ShlN1L0VsnEgKlekMCdlKRkEK4x1760kzgPbqG9mtzfMU4BjXvG";

  const getToken = async () => {
    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("username", USERNAME);
    params.append("password", PASSWORD);
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);

    try {
      const res = await axios.post(`${backend_url}o/token/`, params);
      return res.data.access_token;
    } catch (err) {
      console.error("Erro ao buscar token:", err);
    }
  };

  const api = axios.create({ baseURL: `${backend_url}` });

  const fetchKanbans = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await api.get<Kanban[]>("kanbans/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // @ts-ignore
      setKanbans(res.data.results || res.data);
    } catch (error) {
      console.error("Erro ao buscar kanbans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanbans();
  }, []);

  if (loading) {
    return <p>Carregando kanbans...</p>;
  }

  return (
    <div className="container py-4">
      <h1 className="mb-4">Kanbans</h1>

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
                <Link
                  to={`/kanban/${kanban.id}`}
                  className="btn btn-primary mt-auto"
                >
                  Ir para o kanban
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
