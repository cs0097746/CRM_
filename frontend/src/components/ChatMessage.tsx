import type { Interacao } from '../types/Interacao';

interface ChatMessageProps {
  mensagem: Interacao;
}

export default function ChatMessage({ mensagem }: ChatMessageProps) {
  const isOperator = mensagem.remetente === 'operador';
  const messageTime = new Date(mensagem.criado_em).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`d-flex ${isOperator ? 'justify-content-end' : 'justify-content-start'} mb-3`}>
      <div 
        className="p-3" 
        style={{
          borderRadius: '1rem',
          maxWidth: '70%',
          backgroundColor: isOperator ? '#316dbd' : '#e9ecef',
          color: isOperator ? 'white' : 'black',
        }}
      >
        <p className="m-0">{mensagem.mensagem}</p>
        <small 
          className="d-block text-end mt-1"
          style={{ fontSize: '0.75rem', color: isOperator ? '#e0e0e0' : '#6c757d' }}
        >
          {messageTime}
        </small>
      </div>
    </div>
  );
}
