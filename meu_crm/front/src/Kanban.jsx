// frontend/src/Kanban.jsx (VERSÃO FINAL E CORRIGIDA)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { KanbanColuna } from './KanbanColuna';
import { KanbanCard } from './KanbanCard';
import NovoNegocioModal from './NovoNegocioModal';
import './Kanban.css';

const Kanban = ({ token }) => {
  // --- Estados do componente ---
  const [negocios, setNegocios] = useState([]);
  const [estagios, setEstagios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNegocio, setActiveNegocio] = useState(null); // Para o drag-and-drop
  const [modalIsOpen, setModalIsOpen] = useState(false);   // Para o modal de novo negócio

  const api = axios.create({
    baseURL: 'http://localhost',
    headers: { 'Authorization': `Token ${token}` }
  });

  // --- Funções ---
  const fetchData = () => {
    const fetchEstagios = api.get('/api/estagios/');
    const fetchNegocios = api.get('/api/negocios/');

    Promise.all([fetchEstagios, fetchNegocios])
      .then(([estagiosRes, negociosRes]) => {
        setEstagios(estagiosRes.data);
        setNegocios(negociosRes.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erro ao buscar dados do Kanban:", error);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const getNegociosPorEstagio = (estagioId) => {
    return negocios.filter(n => n.estagio?.id === estagioId);
  };

  const adicionarNovoNegocio = (novoNegocio) => {
    setNegocios(prevNegocios => [...prevNegocios, novoNegocio]);
  };

  // --- Lógica do Drag-and-Drop ---
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveNegocio(negocios.find(n => n.id === active.id));
  };

  const handleDragEnd = (event) => {
    setActiveNegocio(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const negocioId = active.id;
    const novoEstagioId = over.id;
    const negocioAtual = negocios.find(n => n.id === negocioId);

    if (negocioAtual && negocioAtual.estagio.id !== novoEstagioId) {
      setNegocios(prev => prev.map(n => 
        n.id === negocioId ? { ...n, estagio: { id: parseInt(novoEstagioId) } } : n
      ));
      
      api.patch(`/api/negocios/${negocioId}/`, { estagio_id: novoEstagioId })
         .then(res => fetchData()) // Re-busca os dados para garantir consistência
         .catch(err => {
            console.error("Falha ao atualizar, revertendo.", err);
            fetchData(); // Re-busca os dados para reverter
         });
    }
  };

  // --- Renderização ---
  if (loading) {
    return <p>A carregar Kanban...</p>;
  }

  return (
    <> {/* Fragmento para agrupar múltiplos elementos */}
      <div className="kanban-header">
        <button onClick={() => setModalIsOpen(true)}>+ Novo Negócio</button>
      </div>

      <NovoNegocioModal 
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        token={token}
        onNegocioCriado={adicionarNovoNegocio}
      />

      <DndContext 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd} 
        collisionDetection={closestCorners}
      >
        <div className="kanban-board">
          {estagios.map(estagio => (
            <KanbanColuna
              key={estagio.id}
              id={estagio.id}
              titulo={estagio.nome}
              negocios={getNegociosPorEstagio(estagio.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeNegocio ? <KanbanCard negocio={activeNegocio} isOverlay={true} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

export default Kanban;