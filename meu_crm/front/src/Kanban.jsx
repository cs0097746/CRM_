// frontend/src/Kanban.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndContext, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanColuna } from './KanbanColuna'; // Vamos criar este componente
import './Kanban.css';

const Kanban = ({ token }) => {
  const [negocios, setNegocios] = useState([]);
  const [estagios, setEstagios] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const negocioId = active.id;
    const novoEstagioId = over.id;

    const negocioAtual = negocios.find(n => n.id === negocioId);
    if (negocioAtual && negocioAtual.estagio.id !== novoEstagioId) {
      // Atualização visual otimista
      setNegocios(prev => prev.map(n => 
        n.id === negocioId ? { ...n, estagio: { id: parseInt(novoEstagioId) } } : n
      ));

      // Envia a atualização para o backend
      api.patch(`/api/negocios/${negocioId}/`, { estagio_id: novoEstagioId })
         .catch(err => {
            console.error("Falha ao atualizar, revertendo.", err);
            setNegocios(negocios); // Reverte em caso de erro
         });
    }
  };

  if (loading) return <p>A carregar Kanban...</p>;

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
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
    </DndContext>
  );
};

export default Kanban;