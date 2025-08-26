// frontend/src/KanbanCard.jsx (VERSÃO FINAL COM "PEGA" DE ARRASTO)

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import './Kanban.css';

// Um ícone simples para a "pega" de arrasto
const DragHandle = () => (
  <svg className="drag-handle-icon" viewBox="0 0 20 20" width="16">
    <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
  </svg>
);

export const KanbanCard = ({ negocio, isOverlay }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: negocio.id,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const cardContent = (
    <div className={isOverlay ? "card-negocio dragging" : "card-negocio"}>
      <div className="card-header">
        <Link to={`/negocios/${negocio.id}`} className="card-title-link">
          <p><strong>{negocio.titulo}</strong></p>
        </Link>
        {/* A "pega" usa os 'listeners' para controlar o arrasto */}
        <div {...listeners} className="drag-handle">
          <DragHandle />
        </div>
      </div>
      <p>Valor: R$ {negocio.valor}</p>
      <p>Contato: {negocio.contato?.nome}</p>
    </div>
  );

  // O ref e os attributes agora ficam no elemento pai
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {cardContent}
    </div>
  );
};