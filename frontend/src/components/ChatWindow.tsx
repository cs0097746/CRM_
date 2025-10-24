// frontend/src/components/ChatWindow.tsx - CORRIGIR IMPORTS E TIPOS:

import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import type { Conversa, Interacao } from '../types/Conversa';
import type { ChatMensagem } from '../types/Chat';
import { useNotificationSound } from '../hooks/useNotificationSound';
import backend_url from "../config/env.ts";
import './ChatWindow.css';

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
    <div className="chat-container">
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
              disabled={enviando || conversa.status === 'finalizada'}
              maxLength={1000}
            />
            
            <button
              className="send-button-inline"
              onClick={enviarMensagem}
              disabled={!novaMensagem.trim() || enviando || conversa.status === 'finalizada'}
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
  );
};

export default ChatWindow;