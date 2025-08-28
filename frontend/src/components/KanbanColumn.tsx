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
      <div className="card h-100 shadow-sm border-0">

        <div
          className="card-header d-flex justify-content-between align-items-center text-white fw-bold"
          style={{
            background: "linear-gradient(90deg, #4e73df, #224abe)",
            borderTopLeftRadius: "0.75rem",
            borderTopRightRadius: "0.75rem",
          }}
        >
          <span>{estagio.nome}</span>
          <Badge bg="light" text="dark" pill>
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
                minHeight: "150px",
                backgroundColor: snapshot.isDraggingOver ? "#f1f3f7" : "#f8f9fc",
                transition: "background-color 0.2s",
                borderRadius: "0 0 0.75rem 0.75rem",
                overflowY: "auto",
              }}
            >
              {negocios.length > 0 ? (
                negocios.map((negocio, index) => (
                  <KanbanTask key={negocio.id} negocio={negocio} index={index} />
                ))
              ) : (
                <p className="text-muted text-center mt-3">Nenhum negócio</p>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}
