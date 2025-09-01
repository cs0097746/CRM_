import React, { useState } from 'react';
import { Badge, Dropdown, Button } from 'react-bootstrap';
import type { ChatMensagem } from '../types/Chat';

interface ChatMessageProps {
  mensagem: ChatMensagem;
  onCopiar?: (texto: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ mensagem, onCopiar }) => {
  const [showTime, setShowTime] = useState(false);
  
  const isOperator = mensagem.tipo === 'operador';
  const messageTime = new Date(mensagem.timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const fullDateTime = new Date(mensagem.timestamp).toLocaleString('pt-BR');

  const handleCopiar = () => {
    navigator.clipboard.writeText(mensagem.mensagem);
    if (onCopiar) onCopiar(mensagem.mensagem);
  };

  const renderAnexo = () => {
    if (!mensagem.anexo) return null;

    switch (mensagem.anexo.tipo) {
      case 'imagem':
        return (
          <div className="mt-2">
            <img 
              src={mensagem.anexo.url} 
              alt={mensagem.anexo.nome}
              style={{ maxWidth: '200px', borderRadius: '8px', cursor: 'pointer' }}
              onClick={() => window.open(mensagem.anexo!.url, '_blank')}
            />
          </div>
        );
      case 'arquivo':
        return (
          <div className="mt-2">
            <Button 
              variant="outline-primary" 
              size="sm"
              href={mensagem.anexo.url}
              target="_blank"
            >
              📎 {mensagem.anexo.nome}
            </Button>
          </div>
        );
      case 'audio':
        return (
          <div className="mt-2">
            <audio controls style={{ maxWidth: '200px' }}>
              <source src={mensagem.anexo.url} type="audio/mpeg" />
            </audio>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`d-flex mb-3 ${isOperator ? 'justify-content-end' : 'justify-content-start'}`}>
      <div style={{ maxWidth: '70%' }}>
        {/* Header da mensagem */}
        <div className="d-flex align-items-center mb-1">
          {isOperator ? (
            <>
              <small className="text-muted me-2">
                {mensagem.operador?.user.username || 'Operador'}
              </small>
              <Badge bg="primary" style={{ fontSize: '0.7rem' }}>Você</Badge>
            </>
          ) : (
            <Badge bg="success" style={{ fontSize: '0.7rem' }}>Cliente</Badge>
          )}
          
          {/* Menu de ações */}
          <Dropdown className="ms-auto">
            <Dropdown.Toggle 
              variant="link" 
              size="sm" 
              className="p-0 border-0 text-muted"
              style={{ fontSize: '0.8rem' }}
            >
              ⋮
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={handleCopiar}>
                📋 Copiar mensagem
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setShowTime(!showTime)}>
                🕐 {showTime ? 'Ocultar' : 'Ver'} horário
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {/* Conteúdo da mensagem */}
        <div
          style={{
            backgroundColor: isOperator ? '#316dbd' : '#f8f9fa',
            color: isOperator ? 'white' : '#333',
            padding: '0.75rem 1rem',
            borderRadius: isOperator ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            wordWrap: 'break-word',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <p className="m-0" style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>
            {mensagem.mensagem}
          </p>
          
          {/* Anexos */}
          {renderAnexo()}
          
          {/* Timestamp */}
          <small 
            className="d-block text-end mt-1"
            style={{ 
              fontSize: '0.7rem', 
              color: isOperator ? 'rgba(255,255,255,0.8)' : '#6c757d',
              opacity: 0.8
            }}
          >
            {messageTime}
          </small>
        </div>

        {/* Timestamp expandido */}
        {showTime && (
          <small className="text-muted d-block mt-1" style={{ fontSize: '0.7rem' }}>
            📅 {fullDateTime}
          </small>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;