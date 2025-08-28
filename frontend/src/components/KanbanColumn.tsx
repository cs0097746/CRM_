import type { Estagio } from "../types/Estagio.ts";
import type { Negocio } from "../types/Negocio.ts";
import KanbanTask from "./KanbanTask.tsx";
import { Droppable } from "@hello-pangea/dnd";

interface KanbanColumnProps {
  estagio: Estagio;
  negocios: Negocio[];
}

export default function KanbanColumn({ estagio, negocios }: KanbanColumnProps) {
  return (
    <div className="col-12 col-sm-6 col-md-4 col-lg-3 mb-3">
      <div className="card h-100">
        <div className="card-header bg-primary text-white">{estagio.nome}</div>
        <Droppable droppableId={String(estagio.id)}>
          {(provided) => (
            <div
              className="card-body"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {negocios.length > 0 ? (
                negocios.map((negocio, index) => (
                  <KanbanTask key={negocio.id} negocio={negocio} index={index} />
                ))
              ) : (
                <p className="text-muted">Nenhum negócio</p>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}
