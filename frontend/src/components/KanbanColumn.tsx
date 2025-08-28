import type { Estagio } from "../types/Estagio.ts";
import type { Negocio } from "../types/Negocio.ts";
import KanbanTask from "./KanbanTask.tsx";
import { Droppable } from "@hello-pangea/dnd";
import { Badge } from "react-bootstrap";

interface KanbanColumnProps {
  estagio: Estagio;
  negocios: Negocio[];
}

export default function KanbanColumn({ estagio, negocios }: KanbanColumnProps) {
return (
    <div className="col-12 col-sm-6 col-md-4 col-lg-3 mb-3">
      <div
        className="card h-100 border-0"
        style={{
          borderRadius: "1rem",
          backgroundColor: "#ffffff",
          boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
        }}
      >
        <div
          className="card-header d-flex justify-content-between align-items-center"
          style={{
            background: "#316dbd",
            borderTopLeftRadius: "1rem",
            borderTopRightRadius: "1rem",
            padding: "0.75rem 1rem",
            color: "#fff",
            fontWeight: 600,
            fontSize: "1.1rem",
            letterSpacing: "0.3px",
          }}
        >
          <span>{estagio.nome}</span>
          <Badge
            style={{
              backgroundColor: "#7ed957",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.85rem",
              padding: "0.4rem 0.7rem",
            }}
            pill
          >
            {negocios.length}
          </Badge>
        </div>

        <Droppable droppableId={String(estagio.id)}>
          {(provided, snapshot) => (
            <div
              className="card-body p-3"
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                minHeight: "220px",
                backgroundColor: snapshot.isDraggingOver ? "#e6efff" : "#fafbfe",
                transition: "background-color 0.25s ease",
                borderRadius: "0 0 1rem 1rem",
                overflowY: "auto",
              }}
            >
              {negocios.length > 0 ? (
                negocios.map((negocio, index) => (
                  <KanbanTask key={negocio.id} negocio={negocio} index={index} />
                ))
              ) : (
                <p
                  className="text-muted text-center mt-3"
                  style={{ fontSize: "0.9rem", fontStyle: "italic" }}
                >
                  Nenhum negócio
                </p>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
);
}
