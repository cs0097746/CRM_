import type { Negocio } from "../types/Negocio.ts";
import { Draggable } from "@hello-pangea/dnd";

interface KanbanCardProps {
  negocio: Negocio;
  index: number;
}

export default function KanbanTask({ negocio, index }: KanbanCardProps) {
  return (
    <Draggable draggableId={String(negocio.id)} index={index}>
      {(provided) => (
        <div
          className="card mb-2 shadow-sm"
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <div className="card-body p-2">
            <h6 className="card-title mb-1">{negocio.titulo}</h6>
            {negocio.valor !== null && (
              <p className="card-text text-muted mb-0">
                Valor: R${negocio.valor}
              </p>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
