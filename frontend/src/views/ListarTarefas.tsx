import { useState, useEffect } from 'react';
import {
  Table, Button, Card, Alert, Spinner, Row, Col
} from 'react-bootstrap';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface Agendamento {
  nome_task: string;
  ativo: boolean;
  tipo: string;
  start_time: string | null;
  args: string;
  recorrencia: string;
}

interface TarefaData {
  id: number;
  tipo: 'email' | 'whatsapp';
  destinatario: string;
  assunto: string;
  mensagem: string;
  criada_em: string;
  precisar_enviar: boolean;
  codigo: string;
}

interface ItemLista {
  tarefa: TarefaData;
  agendamentos: Agendamento[];
}

const ListarTarefas = () => {
  const [tarefas, setTarefas] = useState<ItemLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const fetchTarefas = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação. Não foi possível obter o token.");

      const apiUrl = `${backend_url}listar_tarefas/`;

      const response = await axios.get<ItemLista[]>(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTarefas(response.data);

    } catch (err: any) {
      console.error('Erro ao buscar tarefas:', err);
      const errorMessage = err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor.';
      setError(`Não foi possível carregar as tarefas. Erro: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tarefaId: number) => {
    setDeletingId(tarefaId);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação. Não foi possível obter o token.");

      const apiUrl = `${backend_url}excluir_tarefa/${tarefaId}/`;

      const response = await axios.delete(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 204 || response.status === 200) {
        setTarefas(prev => prev.filter(item => item.tarefa.id !== tarefaId));
      } else {
        throw new Error("Resposta inesperada do servidor ao tentar excluir.");
      }

    } catch (err: any) {
      console.error(`Erro ao excluir tarefa ${tarefaId}:`, err);
      const errorMessage = err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor.';
      setError(`Falha ao excluir Tarefa ID ${tarefaId}. Erro: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchTarefas();
  }, []);

  const formatData = (isoString: string | null) => {
    if (!isoString) return "N/A";
    try {
      return new Date(isoString).toLocaleString('pt-BR');
    } catch {
      return isoString;
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Spinner animation="border" role="status" className="me-2" />
        <p>Carregando tarefas...</p>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 style={{ fontWeight: 600 }}>📋 Tarefas Agendadas</h2>
        </Col>
        <Col xs="auto">
          <Button
            variant="success"
            size="lg"
            onClick={() => handleNavigation('/criar_tarefas/')}
          >
            + Criar Nova Tarefa
          </Button>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {tarefas.length === 0 && !loading ? (
        <Alert variant="info">
          Nenhuma tarefa agendada encontrada. Clique em "Criar Nova Tarefa" para começar.
        </Alert>
      ) : (
        <Card className="shadow-sm">
          <Card.Body>
            <Table striped bordered hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Destinatário</th>
                  <th>Assunto / Mensagem</th>
                  <th>Agendamento (PeriodicTask)</th>
                  <th>Recorrência</th>
                  <th>Enviar pelo CRM?</th>
                  <th>Código</th>
                  <th>Ativo</th>
                  <th>Criação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {tarefas.map((item) => (
                  <tr key={item.tarefa.id}>
                    <td>{item.tarefa.id}</td>
                    <td>
                        <span className={`badge ${item.tarefa.tipo === 'email' ? 'bg-primary' : 'bg-success'}`}>
                            {item.tarefa.tipo?.toUpperCase()}
                        </span>
                    </td>
                    <td>{item.tarefa.destinatario}</td>
                    <td>
                      {item.tarefa.assunto && <strong>Assunto: </strong>}
                      {item.tarefa.assunto || 'N/A'}
                      <br />
                      <small className="text-muted">Mensagem: {item.tarefa.mensagem.substring(0, 50)}...</small>
                    </td>
                    <td>
                      {item.agendamentos.length > 0 ? (
                        <ul className="list-unstyled mb-0 small">
                            {item.agendamentos.slice(0, 1).map((agendamento, index) => (
                                <li key={index}>
                                    <strong>Task:</strong> {agendamento.nome_task.split('_')[0]}
                                    <br />
                                    <strong>Início:</strong> {formatData(agendamento.start_time)}
                                </li>
                            ))}
                        </ul>
                      ) : (
                        <span className="text-danger">Nenhum Agendamento Ativo</span>
                      )}
                    </td>
                    <td>
                        {item.agendamentos.length > 0 ? (
                            <span className="badge bg-secondary">
                                {item.agendamentos[0].recorrencia}
                            </span>
                        ) : 'N/A'}
                    </td>

                    {/* EXIBIÇÃO DOS NOVOS DADOS */}
                    <td>
                      <span className={`badge ${item.tarefa.precisar_enviar ? 'bg-info' : 'bg-warning'}`}>
                        {item.tarefa.precisar_enviar ? 'SIM' : 'NÃO'}
                      </span>
                    </td>
                    <td>
                        <span className="badge bg-light text-dark border">
                            {item.tarefa.codigo || 'N/A'}
                        </span>
                    </td>
                    {/* FIM EXIBIÇÃO DOS NOVOS DADOS */}

                    <td>
                      {item.agendamentos.length > 0 ? (
                        <span className={`badge ${item.agendamentos[0].ativo ? 'bg-success' : 'bg-danger'}`}>
                            {item.agendamentos[0].ativo ? 'SIM' : 'NÃO'}
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td>{formatData(item.tarefa.criada_em)}</td>
                    <td>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(item.tarefa.id)}
                        disabled={deletingId === item.tarefa.id || loading}
                      >
                        {deletingId === item.tarefa.id ? (
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

export default ListarTarefas;
