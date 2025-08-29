import type { Conversa } from '../types/Conversa';
import { Form, Button, InputGroup } from 'react-bootstrap';
import ChatMessage from './ChatMessage';

interface ChatWindowProps {
  conversa: Conversa | null;
}

export default function ChatWindow({ conversa }: ChatWindowProps) {
  if (!conversa) {
    return (
      <div className="d-flex h-100 justify-content-center align-items-center bg-light">
        <div className="text-center text-muted">
          <p>Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column h-100">
      {/* Cabeçalho do Chat */}
      <div className="p-3 border-bottom bg-white">
        <h5 className="m-0">{conversa.contato.nome}</h5>
        <small className="text-muted">Status: {conversa.status}</small>
      </div>

      {/* Corpo do Chat (Histórico de Mensagens) */}
      <div className="flex-grow-1 p-3" style={{ overflowY: 'auto', backgroundColor: '#f4f7fc' }}>
        {conversa.interacoes?.map((msg) => (
          <ChatMessage key={msg.id} mensagem={msg} />
        ))}
      </div>

      {/* Rodapé do Chat (Input para nova mensagem) */}
      <div className="p-3 border-top bg-white">
        <InputGroup>
          <Form.Control
            as="textarea"
            rows={1}
            placeholder="Digite uma mensagem..."
            style={{ resize: 'none' }}
          />
          <Button variant="primary" style={{ backgroundColor: "#316dbd" }}>
            Enviar
          </Button>
        </InputGroup>
      </div>
    </div>
  );
}
