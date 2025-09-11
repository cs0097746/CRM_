import type { Estagio } from "../types/Estagio.ts";
import type { Negocio } from "../types/Negocio.ts";
import { useState, useEffect } from "react";
import axios from "axios";
import KanbanColumn from "../components/KanbanColumn.tsx";
import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import backend_url from "../config/env.ts";
import { useParams } from "react-router-dom";

export default function Kanban() {
  const { id } = useParams<{ id: string }>();
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [negocios, setNegocios] = useState<Negocio[]>([]);

   const USERNAME = "admin";
    const PASSWORD = "admin";
    const CLIENT_ID = "KpkNSgZswIS1axx3fwpzNqvGKSkf6udZ9QoD3Ulz";
    const CLIENT_SECRET = "q828o8DwBwuM1d9XMNZ2KxLQvCmzJgvRnb0I1TMe0QwyVPNB7yA1HRyie45oubSQbKucq6YR3Gyo9ShlN1L0VsnEgKlekMCdlKRkEK4x1760kzgPbqG9mtzfMU4BjXvG";

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
        console.error(err);
      }
    };

  const api = axios.create({ baseURL: `${backend_url}` });

  const fetchData = async () => {
    try {

        const token = await getToken();
      const [estagiosRes, negociosRes] = await Promise.all([
        api.get<Estagio[]>(`estagios/${id}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        ),
        api.get<Negocio[]>(`kanbans/${id}/negocios`, {
            headers: {
                Authorization: `Bearer ${token}`
                }
            }
        ),
      ]);
      // @ts-ignore
      setEstagios(estagiosRes.data.results);

      // @ts-ignore
      setNegocios(negociosRes.data.results);
    } catch (error) {
      console.error("Erro ao buscar dados do Kanban:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

    const onDragEnd = async (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;

      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      const negocioId = Number(draggableId);
      const novoEstagioId = Number(destination.droppableId);

      setNegocios((prev) =>
        prev.map((n) =>
          n.id === negocioId
            ? { ...n, estagio: { ...n.estagio, id: novoEstagioId } }
            : n
        )
      );

      console.log("Negócio id", negocioId);
        console.log("Estágio final ", novoEstagioId);

      const token = await getToken();

      try {
        await api.patch(`negocios/${negocioId}/`, {
          estagio_id: novoEstagioId,
        },
        {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
      } catch (error) {
        console.error("Erro ao atualizar estágio no backend:", error);

        setNegocios((prev) =>
          prev.map((n) =>
            n.id === negocioId
              ? { ...n, estagio: { ...n.estagio, id: Number(source.droppableId) } }
              : n
          )
        );
      }
    };

    console.log("Estagios ", estagios);
    console.log("ID DO KANBAN: ", id);

  return (
    <div
      className="kanban-container d-flex flex-column"
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #316dbd 0%, #8c52ff 2%, #7ed957 4%, #ffffff 6%, #ffffff 94%, #7ed957 96%, #8c52ff 98%, #316dbd 100%)",
        padding: "2rem",
        boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <header
        style={{
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <img
          src="/Loomie.svg"
          alt="Loomie Logo"
          style={{
            width: "80px",
            height: "80px",
          }}
        />
        <div style={{ textAlign: "left" }}>
          <h1
            style={{
              color: "#316dbd",
              fontWeight: 800,
              fontSize: "2.2rem",
              letterSpacing: "0.5px",
              margin: 0,
            }}
          >
            loomie<span style={{ color: "#7ed957" }}> CRM</span>
          </h1>
          <p style={{ color: "#6c757d", fontSize: "1rem", margin: 0 }}>
            Organize seus negócios de forma fácil e visual
          </p>
        </div>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <div
          className="d-flex flex-row overflow-auto"
          style={{
            gap: "1.5rem",
            flexGrow: 1,
            paddingBottom: "1rem",
            scrollbarWidth: "thin",
          }}
        >
          {estagios.map((estagio) => {
            const negociosDoEstagio = negocios.filter(
              (negocio) => negocio.estagio.id === estagio.id
            );

            return (
              <KanbanColumn
                key={estagio.id}
                estagio={estagio}
                negocios={negociosDoEstagio}
              />
            );
          })}
        </div>
      </DragDropContext>

      <footer
        style={{
          marginTop: "2rem",
          textAlign: "center",
          fontSize: "0.85rem",
          color: "#8c52ff",
          fontWeight: 500,
        }}
      >
        🚀 Powered by <span style={{ color: "#316dbd", fontWeight: 600 }}>loomie</span>
      </footer>
    </div>
  );
}
