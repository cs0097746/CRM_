import { useState } from 'react';
import type { Conversa } from '../types/Conversa';
import type { Interacao } from '../types/Interacao'; // Importando o tipo
import { Form, Button, InputGroup } from 'react-bootstrap';
import ChatMessage from './ChatMessage';
import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({ baseURL: "http://localhost:8000" });

// 1. ADICIONAMOS A NOVA PROP AQUI
interface ChatWindowProps {
  conversa: Conversa | null;
  onNewMessageSent: (novaMensagem: Interacao) => void; 
}

// 2. RECEBEMOS A NOVA PROP AQUI
export default function ChatWindow({ conversa, onNewMessageSent }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!conversa) {
    return (
      <div className="d-flex h-100 justify-content-center align-items-center bg-light">
        <div className="text-center text-muted">
          <p>Selecione uma conversa para começar</p>
        </div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const payload = { mensagem: newMessage };

    try {
      const response = await api.post<Interacao>(
        `/api/conversas/${conversa.id}/mensagens/`, 
        payload
      );
      
      // 3. USAMOS A PROP PARA ATUALIZAR A TELA
      onNewMessageSent(response.data); 
      setNewMessage('');
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Falha ao enviar mensagem.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="d-flex flex-column h-100">
      <div className="p-3 border-bottom bg-white">
        <h5 className="m-0">{conversa.contato.nome}</h5>
        <small className="text-muted">Status: {conversa.status}</small>
      </div>

      <div className="flex-grow-1 p-3" style={{ overflowY: 'auto', backgroundColor: '#f4f7fc' }}>
        {conversa.interacoes?.map((msg) => (
          <ChatMessage key={msg.id} mensagem={msg} />
        ))}
      </div>

      <div className="p-3 border-top bg-white">
        <InputGroup>
          <Form.Control
            as="textarea"
            rows={1}
            placeholder="Digite uma mensagem..."
            style={{ resize: 'none' }}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending}
          />
          <Button 
            variant="primary" 
            style={{ backgroundColor: "#316dbd" }}
            onClick={handleSendMessage}
            disabled={isSending}
          >
            {isSending ? 'Enviando...' : 'Enviar'}
          </Button>
        </InputGroup>
      </div>
    </div>
  );
}

