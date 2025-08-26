// frontend/src/Kanban.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndContext, DragOverlay, closestCorners } from '@dnd-kit/core';
import { KanbanColuna } from './KanbanColuna';
import { KanbanCard } from './KanbanCard'; // Importamos o Card aqui também
import './Kanban.css';

const Kanban = ({ token }) => {
  const [negocios, setNegocios] = useState([]);
  const [estagios, setEstagios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNegocio, setActiveNegocio] = useState(null); // Guarda o negócio que está a ser arrastado

  const api = axios.create({
    baseURL: 'http://localhost',
    headers: { 'Authorization': `Token ${token}` }
  });

  useEffect(() => {
    const fetchEstagios = api.get('/api/estagios/');
    const fetchNegocios = api.get('/api/negocios/');

    Promise.all([fetchEstagios, fetchNegocios])
      .then(([estagiosRes, negociosRes]) => {
        setEstagios(estagiosRes.data);
        setNegocios(negociosRes.data);
        setLoading(false);
      });
  }, [token]);

  const getNegociosPorEstagio = (estagioId) => {
    return negocios.filter(n => n.estagio.id === estagioId);
  }

  const handleDragStart = (event) => {
    const { active } = event;
    // Guarda o objeto completo do negócio que começou a ser arrastado
    setActiveNegocio(negocios.find(n => n.id === active.id));
  };

  const handleDragEnd = (event) => {
    setActiveNegocio(null); // Limpa o negócio ativo
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
         .catch(err => {
            console.error("Falha ao atualizar, revertendo.", err);
            setNegocios(negocios); 
         });
    }
  };

  if (loading) return <p>A carregar Kanban...</p>;

  return (
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

      {/* O "Fantasma" que segue o rato */}
      <DragOverlay>
        {activeNegocio ? <KanbanCard negocio={activeNegocio} isOverlay={true} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Kanban;