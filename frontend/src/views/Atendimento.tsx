import { useState, useEffect } from 'react';
import { Container, Row, Col, ListGroup, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify'; // Importação adicionada
import 'react-toastify/dist/ReactToastify.css'; // Importa o CSS das notificações

import type { Conversa } from '../types/Conversa';
import ConversaListItem from '../components/ConversaListItem';
import ChatWindow from '../components/ChatWindow';

const api = axios.create({ baseURL: "http://localhost:8000" });

export default function Atendimento() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtiva, setConversaAtiva] = useState<Conversa | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversas = async () => {
      try {
        setLoadingList(true);
        const response = await api.get<Conversa[]>('/api/conversas/');
        setConversas(response.data);
      } catch (err) {
        setError('Não foi possível carregar as conversas.');
        console.error(err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchConversas();
  }, []);

  const handleSelectConversa = async (id: number) => {
    // Se a conversa já estiver ativa, não faz nada para evitar recarregamento
    if (conversaAtiva?.id === id) return;

    try {
      setLoadingChat(true);
      const response = await api.get<Conversa>(`/api/conversas/${id}/`);
      setConversaAtiva(response.data);
    } catch (err) {
      toast.error("Erro ao carregar detalhes da conversa.");
      console.error(err);
    } finally {
      setLoadingChat(false);
    }
  };

  const renderContentList = () => {
    if (loadingList) {
      return <div className="text-center p-5"><Spinner animation="border" /></div>;
    }
    if (error) {
      return <Alert variant="danger">{error}</Alert>;
    }
    if (conversas.length === 0) {
      return <div className="text-center p-5 text-muted">Nenhuma conversa encontrada.</div>;
    }
    return (
      <ListGroup variant="flush">
        {conversas.map((conversa) => (
          <ConversaListItem
            key={conversa.id}
            conversa={conversa}
            isActive={conversa.id === conversaAtiva?.id}
            onSelect={() => handleSelectConversa(conversa.id)}
          />
        ))}
      </ListGroup>
    );
  };

  return (
    <Container fluid className="vh-100 d-flex flex-column p-0">
      <Row className="flex-grow-1 g-0">
        <Col md={4} className="border-end d-flex flex-column bg-white">
          <div className="p-3 border-bottom">
            <h5 className="m-0">Caixa de Entrada</h5>
          </div>
          <div className="flex-grow-1" style={{ overflowY: 'auto' }}>
            {renderContentList()}
          </div>
        </Col>
        <Col md={8}>
          {loadingChat ? (
            <div className="d-flex h-100 justify-content-center align-items-center bg-light">
              <Spinner animation="border" />
            </div>
          ) : (
            <ChatWindow conversa={conversaAtiva} />
          )}
        </Col>
      </Row>
      {/* Componente para exibir as notificações */}
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} />
    </Container>
  );
}

