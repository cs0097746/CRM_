import type { Estagio } from "../types/Estagio.ts";
import type { Negocio } from "../types/Negocio.ts";
import { useState, useEffect } from "react";
import axios from "axios";
import KanbanColumn from "../components/KanbanColumn.tsx";

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

  return (
    <div className="container mt-4">
      <div className="row flex-row flex-nowrap overflow-auto">
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
    </div>
  );
}
