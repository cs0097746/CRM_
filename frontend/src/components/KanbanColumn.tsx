import type { Estagio } from "../types/Estagio.ts";
import type { Negocio } from "../types/Negocio.ts";
import KanbanTask from "./KanbanTask.tsx";
import { Droppable } from "@hello-pangea/dnd";
import { Badge } from "react-bootstrap";
import { CriarNegocioModal} from "./modal/CriarNegocio.tsx";

interface KanbanColumnProps {
  estagio: Estagio;
  negocios: Negocio[];
  token: string;
  onNegocioCreated: () => void;
}

export default function KanbanColumn({ estagio, negocios, token, onNegocioCreated }: KanbanColumnProps) {
    console.log("Kanban", estagio.kanban);
    return (
    <div className="col-12 col-sm-6 col-md-4 col-lg-3 mb-3">
      <div
        className="card h-100 border-0"
        style={{
          borderRadius: "1.5rem",
          backgroundColor: "#ffffff",
          boxShadow: "0 12px 25px rgba(0,0,0,0.08)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        <div
          className="card-header d-flex justify-content-between align-items-center"
          style={{
            background: "linear-gradient(135deg, #316dbd, #8c52ff)",
            borderTopLeftRadius: "1.5rem",
            borderTopRightRadius: "1.5rem",
            padding: "1rem 1.2rem",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.15rem",
            letterSpacing: "0.4px",
            boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.15)",
          }}
        >
          <div className="d-flex align-items-center gap-2">
              <span>{estagio.nome}</span>
                {token && (
                    <div className="text-center mt-3">
                        <CriarNegocioModal estagioId={estagio.id} kanban={estagio.kanban} token={token} onCreated={onNegocioCreated}/>
                    </div>
                  )}
          </div>
          <Badge
            pill
            style={{
              backgroundColor: "#7ed957",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.85rem",
              padding: "0.45rem 0.8rem",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
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
                minHeight: "250px",
                backgroundColor: snapshot.isDraggingOver ? "#eef5ff" : "#ffffff",
                transition: "background-color 0.25s ease, transform 0.2s ease",
                borderRadius: "0 0 1.5rem 1.5rem",
                overflowY: "auto",
              }}
            >
              {negocios.length > 0 ? (
                negocios.map((negocio, index) => (
                  <KanbanTask key={negocio.id} negocio={negocio} index={index} />
                ))
              ) : (
                <p
                  className="text-center mt-3"
                  style={{
                    fontSize: "0.9rem",
                    fontStyle: "italic",
                    color: "#8c52ff",
                  }}
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
