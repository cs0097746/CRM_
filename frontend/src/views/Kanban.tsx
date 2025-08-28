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
        background: "#f5f8fc",
        padding: "2rem",
        boxSizing: "border-box",
      }}
    >
      <h2
        className="mb-4 text-center"
        style={{
          color: "#316dbd",
          fontWeight: 700,
          fontSize: "1.8rem",
          letterSpacing: "0.5px",
        }}
      >
        LoomieCRM
      </h2>

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
    </div>
  );
}