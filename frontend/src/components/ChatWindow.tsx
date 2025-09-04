import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import axios from 'axios';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import type { Conversa } from '../types/Conversa';
import type { Interacao } from '../types/Interacao';
import type { ChatMensagem } from '../types/Chat';
import { useNotificationSound } from '../hooks/useNotificationSound';

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

  const api = axios.create({ baseURL: "http://localhost:8000" });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const USERNAME = "admin";
  const PASSWORD = "admin";
  const CLIENT_ID = "KpkNSgZswIS1axx3fwpzNqvGKSkf6udZ9QoD3Ulz";
  const CLIENT_SECRET = "q828o8DwBwuM1d9XMNZ2KxLQvCmzJgvRnb0I1TMe0QwyVPNB7yA1HRyie45oubSQbKucq6YR3Gyo9ShlN1L0VsnEgKlekMCdlKRkEK4x1760kzgPbqG9mtzfMU4BjXvG";

  const getToken = async () => {
    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("username", USERNAME);
    params.append("password", PASSWORD);
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);

    try {
      const res = await axios.post("http://localhost:8000/o/token/", params);
      return res.data.access_token;
    } catch (err) {
      console.error(err);
    }
  };

  // Enviar mensagem
  const enviarMensagem = async () => {
    if (!novaMensagem.trim() || enviando) return;

    setEnviando(true);

    const token = await getToken();
    try {
      await api.post(
        `/api/conversas/${conversa.id}/mensagens/`,
        {
          mensagem: novaMensagem,
          remetente: 'operador'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setNovaMensagem('');
      playSound('success');
      
      if (onNewMessageSent) {
        await onNewMessageSent();
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      playSound('alert');
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

  // Função para converter Interacao para ChatMensagem
  const adaptarMensagem = (interacao: Interacao): ChatMensagem => {
    const remetente = interacao.remetente || interacao.autor || 'cliente';
    
    return {
      id: interacao.id,
      mensagem: interacao.mensagem,
      timestamp: interacao.timestamp,
      tipo: remetente === 'operador' ? 'operador' : 'cliente',
      operador: interacao.operador ? {
        id: interacao.operador.id,
        user: {
          username: interacao.operador.user.username
        }
      } : undefined,
      anexo: interacao.anexo ? {
        tipo: 'arquivo',
        url: interacao.anexo,
        nome: 'Anexo'
      } : undefined
    };
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

        .chat-header .subtitle {
          font-size: 14px;
          color: #65676b;
          margin-top: 2px;
        }

        .chat-status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-entrada {
          background: #fee;
          color: #d73527;
        }

        .status-atendimento {
          background: #fff3cd;
          color: #856404;
        }

        .status-resolvida {
          background: #d1e7dd;
          color: #0f5132;
        }

        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          background: #ffffff;
          min-height: 0;
        }

        .messages-area::-webkit-scrollbar {
          width: 6px;
        }

        .messages-area::-webkit-scrollbar-track {
          background: #f1f3f4;
          border-radius: 3px;
        }

        .messages-area::-webkit-scrollbar-thumb {
          background: #c1c8cd;
          border-radius: 3px;
        }

        .messages-area::-webkit-scrollbar-thumb:hover {
          background: #a8b3ba;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #65676b;
          text-align: center;
        }

        .empty-state-icon {
          width: 64px;
          height: 64px;
          background: #f0f2f5;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          font-size: 24px;
          color: #8a8d91;
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
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .typing-indicator {
          font-size: 12px;
          color: #1877f2;
          font-style: italic;
        }

        .compose-input {
          border: 1px solid #e1e5e9;
          border-radius: 20px;
          padding: 12px 16px;
          resize: none;
          outline: none;
          font-size: 14px;
          line-height: 1.4;
          transition: border-color 0.2s ease;
          width: 100%;
          font-family: inherit;
        }

        .compose-input:focus {
          border-color: #1877f2;
          box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.1);
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
          font-size: 12px;
          color: #8a8d91;
        }

        .char-count {
          font-size: 12px;
          color: #65676b;
        }

        .char-count.warning {
          color: #fa7970;
        }

        .send-button {
          background: #1877f2;
          border: none;
          border-radius: 20px;
          padding: 8px 20px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 80px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .send-button:hover:not(:disabled) {
          background: #166fe5;
          transform: translateY(-1px);
        }

        .send-button:disabled {
          background: #e4e6ea;
          color: #8a8d91;
          cursor: not-allowed;
          transform: none;
        }

        .send-button:active {
          transform: translateY(0);
        }

        .online-indicator {
          width: 8px;
          height: 8px;
          background: #42b883;
          border-radius: 50%;
          display: inline-block;
          margin-right: 6px;
        }

        .compose-container {
          position: relative;
        }

        .send-button-inline {
          position: absolute;
          bottom: 8px;
          right: 8px;
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