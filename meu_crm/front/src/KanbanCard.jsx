// frontend/src/KanbanCard.jsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const KanbanCard = ({ negocio }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: negocio.id,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card-negocio"
    >
      <p><strong>{negocio.titulo}</strong></p>
      <p>Valor: R$ {negocio.valor}</p>
      <p>Contato: {negocio.contato.nome}</p>
    </div>
  );
};