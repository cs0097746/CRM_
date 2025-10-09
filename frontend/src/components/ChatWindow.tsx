// frontend/src/components/ChatWindow.tsx - CORRIGIR IMPORTS E TIPOS:

import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import type { Conversa, Interacao } from '../types/Conversa';
import type { ChatMensagem } from '../types/Chat';
import { useNotificationSound } from '../hooks/useNotificationSound';
import backend_url from "../config/env.ts";

interface ChatWindowProps {
  mensagens?: Interacao[];
  conversa: Conversa;
  onNewMessageSent?: () => Promise<void>;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  mensagens = [], 
  conversa,
  onNewMessageSent
}) => {
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [digitando, setDigitando] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { playSound } = useNotificationSound();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  // ✅ FUNÇÃO PARA ADAPTAR MENSAGEM (CORRIGIDA):
  const adaptarMensagem = (interacao: Interacao): ChatMensagem => {
    console.log("🚀 ~ adaptarMensagem ~ interacao:", interacao)
    const remetente = interacao.remetente || interacao.autor || 'cliente';
    
    return {
      id: interacao.id,
      mensagem: interacao.mensagem,
      timestamp: interacao.timestamp || interacao.criado_em, // ✅ CORRIGIDO
      tipo: remetente === 'operador' ? 'operador' : 'cliente',
      // ✅ PROTEÇÃO CONTRA UNDEFINED:
      operador: (interacao.operador && interacao.operador.user) ? {
        id: interacao.operador.id,
        user: {
          username: interacao.operador.user.username
        }
      } : undefined,
      // ✅ CAMPOS DE MÍDIA:
      media_type: interacao.tipo as ChatMensagem['media_type'], // ✅ CORRIGIDO
      media_url: interacao.media_url, // ✅ CORRIGIDO
      media_filename: interacao.media_filename, // ✅ CORRIGIDO
      media_size: interacao.media_size, // ✅ CORRIGIDO
      media_duration: interacao.media_duration // ✅ CORRIGIDO
    };
  };

  // Enviar mensagem
  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || enviando) return;
  
    setEnviando(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Debug: verificar dados antes do envio
      console.log('🔍 Debug envio mensagem:');
      console.log('  - Conversa:', conversa);
      console.log('  - Contato:', conversa.contato);
      console.log('  - Telefone:', conversa.contato?.telefone);
      console.log('  - Mensagem:', novaMensagem);
      console.log('  - ID Conversa:', conversa.id);
      
      const payload = {
        numero: conversa.contato?.telefone || conversa.contato_telefone,
        mensagem: novaMensagem,
        conversa_id: conversa.id
      };
      
      console.log('📦 Payload final:', payload);
      
      const response = await fetch(`${backend_url}whatsapp/enviar/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
  
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Mensagem enviada para WhatsApp:', result);
        setNovaMensagem('');
        playSound('success');
        
        if (onNewMessageSent) {
          await onNewMessageSent();
        }
      } else {
        console.error('❌ Erro ao enviar:', result.error);
        alert(`Erro: ${result.error}`);
      }
      
    } catch (error) {
      console.error('💥 Erro na requisição:', error);
      playSound('alert');
      alert('Erro ao enviar mensagem');
    } finally {
      setEnviando(false);
    }
  };

  // Enter para enviar
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensagem();
    }
  };

  // Detectar quando está digitando
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNovaMensagem(e.target.value);
    
    if (e.target.value.length > 0 && !digitando) {
      setDigitando(true);
      setTimeout(() => setDigitando(false), 1000);
    }
  };

  return (
    <>
      <style>{`
        .chat-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e1e5e9;
          overflow: hidden;
        }

        .chat-header {
          background: #f8f9fa;
          padding: 16px 20px;
          border-bottom: 1px solid #e1e5e9;
          flex-shrink: 0;
        }

        .chat-header h6 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1d2129;
        }

        .subtitle {
          font-size: 13px;
          color: #65676b;
          margin-top: 4px;
        }

        .online-indicator {
          width: 8px;
          height: 8px;
          background: #42b883;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
        }

        .chat-status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 500;
        }

        .status-entrada { 
          background: #ffebee; 
          color: #c62828; 
        }

        .status-atendimento { 
          background: #fff3e0; 
          color: #ef6c00; 
        }

        .status-resolvida { 
          background: #e8f5e8; 
          color: #2e7d32; 
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          background: #f8f9fa;
        }

        .messages-area::-webkit-scrollbar {
          width: 6px;
        }

        .messages-area::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-area::-webkit-scrollbar-thumb {
          background: #c1c8cd;
          border-radius: 3px;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: #8a8d91;
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .compose-area {
          background: #ffffff;
          border-top: 1px solid #e1e5e9;
          padding: 16px 20px;
          flex-shrink: 0;
        }

        .compose-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .compose-status {
          font-size: 12px;
          color: #65676b;
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: #1877f2;
        }

        .compose-container {
          position: relative;
          display: flex;
          align-items: flex-end;
          gap: 12px;
        }

        .compose-input {
          flex: 1;
          border: 1px solid #e1e5e9;
          border-radius: 20px;
          padding: 12px 16px;
          font-size: 14px;
          resize: none;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .compose-input:focus {
          border-color: #1877f2;
        }

        .compose-input:disabled {
          background: #f0f2f5;
          color: #8a8d91;
          cursor: not-allowed;
        }

        .compose-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }

        .compose-hint {
          font-size: 11px;
          color: #8a8d91;
        }

        .char-count {
          font-size: 11px;
          color: #8a8d91;
        }

        .char-count.warning {
          color: #fa7970;
          font-weight: 500;
        }

        .send-button-inline {
          position: absolute;
          right: 8px;
          bottom: 8px;
          background: #1877f2;
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .send-button-inline:hover:not(:disabled) {
          background: #166fe5;
          transform: scale(1.1);
        }

        .send-button-inline:disabled {
          background: #e4e6ea;
          color: #8a8d91;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>

      <div className="chat-container">
        {/* Header do chat */}
        <div className="chat-header">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h6>{conversa?.contato?.nome || 'Conversa'}</h6>
              <div className="subtitle">
                <span className="online-indicator"></span>
                {conversa?.contato?.telefone}
              </div>
            </div>
            <div>
              <span className={`chat-status status-${conversa.status}`}>
                {conversa.status === 'entrada' && 'Aguardando'}
                {conversa.status === 'atendimento' && 'Em Atendimento'}
                {conversa.status === 'resolvida' && 'Resolvida'}
              </span>
            </div>
          </div>
        </div>

        {/* Área das mensagens */}
        <div className="messages-area">
          {mensagens.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="bi bi-chat-text"></i>
              </div>
              <h6 style={{ color: '#1d2129', marginBottom: '8px' }}>
                Nenhuma mensagem ainda
              </h6>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Envie uma mensagem para iniciar a conversa
              </p>
            </div>
          ) : (
            <>
              {mensagens.map((interacao) => (
                <ChatMessage 
                  key={interacao.id} 
                  mensagem={adaptarMensagem(interacao)}
                  onCopiar={(texto) => {
                    navigator.clipboard.writeText(texto);
                    playSound('success');
                  }}
                />
              ))}
              <TypingIndicator isTyping={digitando} username="Você" />
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Área de composição */}
        <div className="compose-area">
          <div className="compose-header">
            <div className="compose-status">
              <span>Status: {conversa.status}</span>
              {enviando && (
                <span className="typing-indicator">
                  <Spinner animation="border" size="sm" style={{ width: '12px', height: '12px' }} />
                  <span style={{ marginLeft: '6px' }}>Enviando...</span>
                </span>
              )}
            </div>
          </div>

          <div className="compose-container">
            <textarea
              className="compose-input"
              rows={3}
              placeholder="Digite sua mensagem..."
              value={novaMensagem}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              disabled={enviando || conversa.status === 'resolvida'}
              maxLength={1000}
            />
            
            <button
              className="send-button-inline"
              onClick={enviarMensagem}
              disabled={!novaMensagem.trim() || enviando || conversa.status === 'resolvida'}
            >
              {enviando ? (
                <Spinner animation="border" size="sm" style={{ width: '14px', height: '14px' }} />
              ) : (
                <i className="bi bi-send-fill"></i>
              )}
            </button>
          </div>

          <div className="compose-actions">
            <div className="compose-hint">
              Enter para enviar • Shift+Enter para nova linha
            </div>
            <div className={`char-count ${novaMensagem.length > 900 ? 'warning' : ''}`}>
              {novaMensagem.length}/1000
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatWindow;