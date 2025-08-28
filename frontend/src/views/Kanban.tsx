import type { Estagio } from "../types/Estagio.ts";
import type { Negocio } from "../types/Negocio.ts";
import { useState, useEffect } from "react";
import axios from "axios";
import KanbanColumn from "../components/KanbanColumn.tsx";
import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";

export default function Kanban() {
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [negocios, setNegocios] = useState<Negocio[]>([]);

  const api = axios.create({ baseURL: "http://localhost:8000" });

  const fetchData = async () => {
    try {
      const [estagiosRes, negociosRes] = await Promise.all([
        api.get<Estagio[]>("/api/estagios/"),
        api.get<Negocio[]>("/api/negocios/"),
      ]);
      setEstagios(estagiosRes.data);
      setNegocios(negociosRes.data);
    } catch (error) {
      console.error("Erro ao buscar dados do Kanban:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    setNegocios((prev) =>
      prev.map((n) =>
        n.id.toString() === draggableId
          ? { ...n, estagio: { ...n.estagio, id: Number(destination.droppableId) } }
          : n
      )
    );
  };

  return (
    <div
      className="kanban-container d-flex flex-column"
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #316dbd 0%, #8c52ff 5%, #7ed957 10%, #ffffff 20%, #ffffff 80%, #7ed957 90%, #8c52ff 95%, #316dbd 100%)",
        padding: "2rem",
        boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <header
        style={{
          marginBottom: "2rem",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            color: "#316dbd",
            fontWeight: 800,
            fontSize: "2.2rem",
            letterSpacing: "0.5px",
            marginBottom: "0.5rem",
          }}
        >
          Loomie<span style={{ color: "#7ed957" }}>CRM</span>
        </h1>
        <p style={{ color: "#6c757d", fontSize: "1rem" }}>
          Organize seus negócios de forma fácil e visual
        </p>
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
        🚀 Powered by <span style={{ color: "#316dbd", fontWeight: 600 }}>Loomie</span>
      </footer>
    </div>
  );
}
