// frontend/src/KanbanCard.jsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const KanbanCard = ({ negocio, isOverlay }) => {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition,
    isDragging
  } = useSortable({
    id: negocio.id,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
    // Esconde o cartão original enquanto o "fantasma" está a ser arrastado
    opacity: isDragging ? 0 : 1,
  };

  // Se for o fantasma (overlay), não aplicamos a lógica de esconder
  if (isOverlay) {
    return (
      <div className="card-negocio dragging">
        <p><strong>{negocio.titulo}</strong></p>
        <p>Valor: R$ {negocio.valor}</p>
        <p>Contato: {negocio.contato.nome}</p>
      </div>
    );
  }

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