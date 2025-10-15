import { useState, useEffect } from 'react';
import {
  Table, Button, Card, Alert, Spinner, Row, Col
} from 'react-bootstrap';
import backend_url from "../config/env.ts"; // Supondo que você tenha este arquivo de configuração
import {getToken} from "../function/validateToken.tsx"; // Supondo que você tenha esta função
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Interface para representar os dados de um Estágio (se vierem aninhados)
interface Estagio {
  id: number;
  nome: string;
}

// Interface para representar os dados de um Gatilho, baseada no seu modelo Django
interface Gatilho {
  id: number;
  nome: string;
  evento: string;
  acao: string;
  ativo: boolean;
  estagio_origem: Estagio | null;
  estagio_destino: Estagio | null;
  parametros: Record<string, any>; // Para o JSONField
}

const ListarGatilhos = () => {
  const [gatilhos, setGatilhos] = useState<Gatilho[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchGatilhos = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação. Não foi possível obter o token.");

      // Endpoint para listar os gatilhos (ajuste se for diferente)
      const apiUrl = `${backend_url}listar_gatilhos/`;

      const response = await axios.get<Gatilho[]>(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setGatilhos(response.data);

    } catch (err: any) {
      console.error('Erro ao buscar gatilhos:', err);
      const errorMessage = err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor.';
      setError(`Não foi possível carregar os gatilhos. Erro: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (gatilhoId: number) => {
    setDeletingId(gatilhoId);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação. Não foi possível obter o token.");

      // Endpoint para excluir um gatilho (ajuste se for diferente)
      const apiUrl = `${backend_url}excluir_gatilho/${gatilhoId}/`;

      await axios.delete(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove o gatilho da lista no estado local após a exclusão bem-sucedida
      setGatilhos(prev => prev.filter(g => g.id !== gatilhoId));

    } catch (err: any) {
      console.error(`Erro ao excluir gatilho ${gatilhoId}:`, err);
      const errorMessage = err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor.';
      setError(`Falha ao excluir Gatilho ID ${gatilhoId}. Erro: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchGatilhos();
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Spinner animation="border" role="status" className="me-2" />
        <p>Carregando gatilhos...</p>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 style={{ fontWeight: 600 }}>⚙️ Gatilhos Automáticos</h2>
        </Col>
        <Col xs="auto">
          <Button
            variant="success"
            size="lg"
            onClick={() => handleNavigation('/criar_gatilho/')} // Rota para a página de criação
          >
            + Criar Novo Gatilho
          </Button>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {gatilhos.length === 0 && !loading ? (
        <Alert variant="info">
          Nenhum gatilho encontrado. Clique em "Criar Novo Gatilho" para começar.
        </Alert>
      ) : (
        <Card className="shadow-sm">
          <Card.Body>
            <Table striped bordered hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Evento</th>
                  <th>Ação</th>
                  <th>Estágio Origem</th>
                  <th>Estágio Destino</th>
                  <th>Parâmetros</th>
                  <th>Ativo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {gatilhos.map((gatilho) => (
                  <tr key={gatilho.id}>
                    <td>{gatilho.id}</td>
                    <td>{gatilho.nome}</td>
                    <td><span className="badge bg-secondary">{gatilho.evento}</span></td>
                    <td><code>{gatilho.acao}</code></td>
                    <td>{gatilho.estagio_origem ? gatilho.estagio_origem.nome : 'N/A'}</td>
                    <td>{gatilho.estagio_destino ? gatilho.estagio_destino.nome : 'N/A'}</td>
                    <td>
                      <small>
                        <pre style={{ margin: 0, background: '#f1f1f1', padding: '5px' }}>
                          {JSON.stringify(gatilho.parametros, null, 2)}
                        </pre>
                      </small>
                    </td>
                    <td>
                      <span className={`badge ${gatilho.ativo ? 'bg-success' : 'bg-danger'}`}>
                        {gatilho.ativo ? 'SIM' : 'NÃO'}
                      </span>
                    </td>
                    <td>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(gatilho.id)}
                        disabled={deletingId === gatilho.id}
                      >
                        {deletingId === gatilho.id ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          'Excluir'
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default ListarGatilhos;