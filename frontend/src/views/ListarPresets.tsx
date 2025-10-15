import { useState, useEffect } from 'react';
import {
  Table, Button, Card, Alert, Spinner, Row, Col, ListGroup
} from 'react-bootstrap';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type {AtributoPersonalizavel} from "../types/AtributoPersonalizavel.ts";

interface PresetAtributosData {
  id: number;
  nome: string;
  descricao: string | null;
  atributos: AtributoPersonalizavel[];
}

const ListarPresets = () => {
  const [presets, setPresets] = useState<PresetAtributosData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const API_ENDPOINT = 'presets/';

  const fetchPresets = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação. Não foi possível obter o token.");

      const apiUrl = `${backend_url}${API_ENDPOINT}`;

      const response = await axios.get<PresetAtributosData[]>(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // @ts-ignore
      const data = response.data.results;
      setPresets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Erro ao buscar presets:', err);
      const errorMessage = err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor.';
      setError(`Não foi possível carregar os Presets. Erro: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  const renderAtributoItem = (atributo: AtributoPersonalizavel) => {
    return (
      <>
        <strong>{atributo.label}</strong>
        <span className="text-secondary ms-2 me-1">({atributo.type})</span>
      </>
    );
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const totalAtributos = (Array.isArray(presets) ? presets : []).reduce(
    (acc, p) => acc + (p.atributos && Array.isArray(p.atributos) ? p.atributos.length : 0),
    0
  );

  console.log("Preset", presets)

  if (loading) {
    return (
      <div className="p-4 text-center">
        <Spinner animation="border" role="status" className="me-2" />
        <p>Carregando Presets...</p>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 style={{ fontWeight: 600 }}>🛠️ Presets de Atributos</h2>
        </Col>
        <Col xs="auto">
          <Button
            variant="primary"
            size="lg"
            onClick={() => handleNavigation('/criar_preset/')}
          >
            + Criar Novo Preset
          </Button>
        </Col>
      </Row>

      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      {presets.length === 0 && !loading ? (
        <Alert variant="info">
          Nenhum Preset encontrado.
        </Alert>
      ) : (
        <Card className="shadow-sm">
          <Card.Body>
            <Table striped bordered hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Descrição</th>
                  <th>Atributos ({totalAtributos})</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {presets.map((preset) => (
                  <tr key={preset.id}>
                    <td>{preset.id}</td>
                    <td>
                      <strong className="text-primary">{preset.nome}</strong>
                    </td>
                    <td>{preset.descricao || <span className="text-muted">Sem descrição</span>}</td>
                    <td>
                      {(!Array.isArray(preset.atributos) || preset.atributos.length === 0) ? (
                        <span className="text-danger">Nenhum Atributo</span>
                      ) : (
                        <ListGroup variant="flush" className="small">
                            {preset.atributos.slice(0, 3).map((atributo) => (
                                <ListGroup.Item key={atributo.id} className="p-1">
                                    {renderAtributoItem(atributo)}
                                </ListGroup.Item>
                            ))}
                            {preset.atributos.length > 3 && (
                                <ListGroup.Item className="p-1 text-info">
                                    E mais {preset.atributos.length - 3} atributo(s)...
                                </ListGroup.Item>
                            )}
                        </ListGroup>
                      )}
                    </td>
                    <td>
                      <Button
                        variant="info"
                        size="sm"
                        className="me-2"
                        onClick={() => handleNavigation(`/presets/${preset.id}/editar`)}
                      >
                        Visualizar / Editar
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

export default ListarPresets;