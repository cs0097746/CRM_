// frontend/src/KanbanColuna.jsx
import React from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard'; // Vamos criar este a seguir

export const KanbanColuna = ({ id, titulo, negocios }) => {
  const { setNodeRef } = useSortable({ id: id.toString() });

  return (
    <div className="kanban-coluna">
      <h2>{titulo}</h2>
      <SortableContext id={id.toString()} items={negocios} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="card-container">
          {negocios.map(negocio => (
            <KanbanCard key={negocio.id} negocio={negocio} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};