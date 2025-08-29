import type { Conversa } from '../types/Conversa';
import { ListGroup, Badge } from 'react-bootstrap';

interface ConversaListItemProps {
  conversa: Conversa;
  isActive: boolean;
  onSelect: () => void;
}

export default function ConversaListItem({ conversa, isActive, onSelect }: ConversaListItemProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'entrada': return <Badge bg="primary">Nova</Badge>;
      case 'atendimento': return <Badge bg="warning">Atendendo</Badge>;
      case 'resolvida': return <Badge bg="success">Resolvida</Badge>;
      default: return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <ListGroup.Item
      action
      active={isActive}
      onClick={onSelect}
      className="d-flex justify-content-between align-items-start"
    >
      <div className="ms-2 me-auto">
        <div className="fw-bold">{conversa.contato.nome}</div>
        <div className="text-muted text-truncate" style={{ fontSize: '0.9rem' }}>
          {conversa.ultima_mensagem || 'Nenhuma mensagem'}
        </div>
      </div>
      <div className="d-flex flex-column align-items-end">
        {getStatusBadge(conversa.status)}
        <small className="text-muted mt-1">
          {new Date(conversa.atualizado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </small>
      </div>
    </ListGroup.Item>
  );
}
