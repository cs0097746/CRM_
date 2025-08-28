import type { Negocio } from "../types/Negocio.ts";

interface KanbanCardProps {
  negocio: Negocio;
}

export default function KanbanTask({ negocio }: KanbanCardProps) {
  return (
    <div className="card mb-2 shadow-sm">
      <div className="card-body p-2">
        <h6 className="card-title mb-1">{negocio.titulo}</h6>
        {negocio.valor !== null && (
          <p className="card-text text-muted mb-0">
            Valor: R${negocio.valor}
          </p>
        )}
      </div>
    </div>
  );
}
