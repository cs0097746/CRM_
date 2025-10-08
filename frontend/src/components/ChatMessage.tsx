// frontend/src/components/ChatMessage.tsx - MELHORAR suporte a mídias:

import React, { useState } from 'react';
import { Badge, Dropdown, Button, Modal } from 'react-bootstrap';
import type { ChatMensagem } from '../types/Chat';

interface ChatMessageProps {
  mensagem: ChatMensagem;
  onCopiar?: (texto: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ mensagem, onCopiar }) => {
  const [showTime, setShowTime] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  
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

  // ✅ RENDERIZAR DIFERENTES TIPOS DE MÍDIA:
  const renderMedia = () => {
    console.log("🚀 ~ renderMedia ~ mensagem:", mensagem)
    if (!mensagem.media_url) return null;

    const commonStyle = {
      maxWidth: '250px',
      borderRadius: '8px',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    };

    switch (mensagem.media_type) {
      case 'imagem':
        return (
          <div className="mt-2">
            <img 
              src={mensagem.media_url} 
              alt="Imagem enviada"
              style={commonStyle}
              onClick={() => setShowMediaModal(true)}
              onError={(e) => {
                e.currentTarget.src = '/placeholder-image.png'; // Imagem de fallback
              }}
            />
          </div>
        );

      case 'video':
        return (
          <div className="mt-2">
            <video 
              controls 
              style={commonStyle}
              onError={() => console.log('Erro ao carregar vídeo')}
            >
              <source src={mensagem.media_url} type="video/mp4" />
              Seu navegador não suporta reprodução de vídeo.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="mt-2" style={{ padding: '10px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
            <div className="d-flex align-items-center">
              <span style={{ marginRight: '10px', fontSize: '1.2rem' }}>🎵</span>
              <audio 
                controls 
                style={{ maxWidth: '200px' }}
                onError={() => console.log('Erro ao carregar áudio')}
              >
                <source src={mensagem.media_url} type="audio/mpeg" />
                <source src={mensagem.media_url} type="audio/ogg" />
                Seu navegador não suporta reprodução de áudio.
              </audio>
            </div>
            {mensagem.media_duration && (
              <small className="text-muted">Duração: {mensagem.media_duration}s</small>
            )}
          </div>
        );

      case 'documento':
        return (
          <div className="mt-2">
            <Button 
              variant="outline-primary" 
              size="sm"
              href={mensagem.media_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              📎 {mensagem.media_filename || 'Documento'}
              {mensagem.media_size && (
                <small className="ms-2">({(mensagem.media_size / 1024).toFixed(1)} KB)</small>
              )}
            </Button>
          </div>
        );

      case 'sticker':
        return (
          <div className="mt-2">
            <img 
              src={mensagem.media_url} 
              alt="Figurinha"
              style={{ ...commonStyle, maxWidth: '120px' }}
              onClick={() => setShowMediaModal(true)}
            />
          </div>
        );

      case 'localizacao':
        return (
          <div className="mt-2">
            <Button 
              variant="outline-success" 
              size="sm"
              href={mensagem.media_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              📍 Ver Localização
            </Button>
          </div>
        );

      default:
        return (
          <div className="mt-2">
            <small className="text-muted">
              [Mídia não suportada: {mensagem.media_type}]
            </small>
          </div>
        );
    }
  };

  return (
    <>
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
                {mensagem.media_url && (
                  <Dropdown.Item onClick={() => window.open(mensagem.media_url, '_blank')}>
                    🔗 Abrir mídia
                  </Dropdown.Item>
                )}
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
            
            {/* ✅ RENDERIZAR MÍDIA */}
            {renderMedia()}
            
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

      {/* ✅ MODAL PARA VISUALIZAR MÍDIA EM TELA CHEIA */}
      <Modal 
        show={showMediaModal} 
        onHide={() => setShowMediaModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Visualizar Mídia</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {mensagem.media_type === 'imagem' && mensagem.media_url && (
            <img 
              src={mensagem.media_url} 
              alt="Imagem em tela cheia"
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
          )}
          {mensagem.media_type === 'sticker' && mensagem.media_url && (
            <img 
              src={mensagem.media_url} 
              alt="Figurinha em tela cheia"
              style={{ maxWidth: '300px', objectFit: 'contain' }}
            />
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ChatMessage;