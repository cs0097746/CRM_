import type { Estagio } from "../types/Estagio.ts";
import type { Negocio } from "../types/Negocio.ts";
import { useState, useEffect } from "react";
import axios from "axios";
import KanbanColumn from "../components/KanbanColumn.tsx";
import { DragDropContext } from "@hello-pangea/dnd";
import type { DropResult } from "@hello-pangea/dnd";
import backend_url from "../config/env.ts";
import { useParams } from "react-router-dom";
import {CriarEstagioModal} from "../components/modal/CriarEstagio.tsx";
import {getToken} from "../function/validateToken.tsx";

export default function Kanban() {
  const { id } = useParams<{ id: string }>();
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [token, setToken] = useState<string | null>(null);

  const api = axios.create({ baseURL: `${backend_url}` });

  const fetchData = async () => {
    try {

      const token = await getToken();
      if (!token) throw new Error("Autenticação falhou.");
      setToken(token);

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
    (async () => {
        fetchData();
    })();
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
      const novoEstagio = estagios.find(e => e.id === novoEstagioId);
      const originalNegocio = negocios.find(n => n.id === negocioId);

      setNegocios((prev) =>
        prev.map((n) =>
          n.id === negocioId
            ? {
                ...n,
                estagio: {
                    ...n.estagio,
                    id: novoEstagioId,
                    nome: novoEstagio ? novoEstagio.nome : n.estagio.nome
                }
              }
            : n
        )
      );

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

        if(originalNegocio) {
             setNegocios((prev) =>
                prev.map((n) => (n.id === negocioId ? originalNegocio : n))
            );
        } else {
            fetchData();
        }
      }
    };

    const handleNegocioUpdate = (updatedNegocio: Negocio) => {
        setNegocios((prev) =>
            prev.map((n) => (n.id === updatedNegocio.id ? updatedNegocio : n))
        );
    };

    const handleNegocioDelete = (negocioId: number) => {
        setNegocios((prev) => prev.filter((n) => n.id !== negocioId));

        api.delete(`negocios/${negocioId}/`, {
            headers: { Authorization: `Bearer ${token}` }
        }).catch(error => {
            console.error("Erro ao deletar negócio:", error);
            fetchData();
        });
    };

    const handleNativeAttributeChange = (negocioId: number, attribute: string, value: any) => {
        setNegocios((prev) =>
            prev.map((n) =>
                n.id === negocioId
                    ? { ...n, [attribute as keyof Negocio]: value }
                    : n
            )
        );

        api.patch(`negocios/${negocioId}/`, {
            [attribute]: value,
        }, {
            headers: { Authorization: `Bearer ${token}` }
        }).catch(error => {
            console.error(`Erro ao atualizar atributo ${attribute}:`, error);
            fetchData();
        });
    };


  // @ts-ignore
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

        {token && (
          <div className="mb-3 text-center">
            <CriarEstagioModal kanbanId={Number(id)} token={token} onCreated={() => fetchData()} />
          </div>
        )}


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
                token={token!}
                negocios={negociosDoEstagio}
                onNegocioCreated={fetchData}
                onNegocioUpdate={handleNegocioUpdate}
                onNegocioDelete={handleNegocioDelete}
                onCustomAttributeChange={handleNativeAttributeChange}
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