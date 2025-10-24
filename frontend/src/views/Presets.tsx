import { useState } from 'react';
import {
  Button, Card, Alert, Spinner, Row, Col, Form
} from 'react-bootstrap';
import { Trash, PlusCircle, CheckCircle } from 'react-bootstrap-icons';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ATTRIBUTE_TYPES = [
    { value: 'string', label: 'String (Texto Curto)' },
    { value: 'text', label: 'Text (Texto Longo)' },
    { value: 'integer', label: 'Integer (Número Inteiro)' },
    { value: 'float', label: 'Float (Número Decimal)' },
    { value: 'boolean', label: 'Boolean (Verdadeiro/Falso)' },
    { value: 'date', label: 'Date (Data)' },
    { value: 'datetime', label: 'DateTime (Data e Hora)' },
    { value: 'time', label: 'Time (Hora)' },
    { value: 'file', label: 'File (Arquivo)' },
];

interface NovoAtributo {
    tempId: number;
    label: string;
    type: string;
}

const CriarPreset = () => {
  const [nome, setNome] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [atributos, setAtributos] = useState<NovoAtributo[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const API_ENDPOINT = 'presets/create/';

  const handleAddAtributo = () => {
    const newTempId = Date.now();
    setAtributos(prev => [
      ...prev,
      { tempId: newTempId, label: '', type: 'string' }
    ]);
  };

  const handleRemoveAtributo = (tempId: number) => {
    setAtributos(prev => prev.filter(attr => attr.tempId !== tempId));
  };

  const handleAtributoChange = (tempId: number, field: keyof NovoAtributo, value: string) => {
    setAtributos(prev =>
      prev.map(attr =>
        attr.tempId === tempId ? { ...attr, [field]: value } : attr
      )
    );
  };

  const validateForm = (): boolean => {
    if (!nome.trim()) {
      setError("O nome do Preset é obrigatório.");
      return false;
    }

    const labels = atributos.map(a => a.label.trim());
    if (labels.some(l => l === '')) {
        setError("Todos os rótulos (Labels) dos atributos são obrigatórios.");
        return false;
    }

    const uniqueLabels = new Set(labels);
    if (uniqueLabels.size !== labels.length) {
        setError("Os rótulos (Labels) dos atributos devem ser únicos.");
        return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (!validateForm()) {
        return;
    }

    setLoading(true);

    const payload = {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      atributos: atributos.map(attr => ({
        label: attr.label.trim(),
        type: attr.type,
        valor: "",
        arquivo: null
      })),
    };

    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação. Não foi possível obter o token.");

      const apiUrl = `${backend_url}${API_ENDPOINT}`;

      const response = await axios.post(apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setSuccess(`Preset "${response.data.nome}" (ID: ${response.data.id}) criado com sucesso!`);
      setTimeout(() => navigate('/presets/'), 3000);

    } catch (err: any) {
      console.error('Erro ao criar preset:', err.response?.data || err);
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor.';
      setError(`Falha na criação do Preset. Erro: ${errorDetail}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Row className="mb-4">
        <Col>
          <h2 style={{ fontWeight: 600 }}>✨ Criar Novo Preset de Atributos</h2>
        </Col>
      </Row>

      {success && <Alert variant="success" className="mt-3"><CheckCircle className="me-2" />{success}</Alert>}
      {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={handleSubmit}>

            <Row className="mb-4">
              <Col md={6}>
                <Form.Group controlId="formNome" className="mb-3">
                  <Form.Label>Nome do Preset <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    placeholder="Ex: Dados Pessoais Básicos"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="formDescricao" className="mb-3">
                  <Form.Label>Descrição</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={1}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Breve explicação sobre quando usar este preset."
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
            </Row>

            <h4 className="mt-3 mb-3">Definição dos Atributos</h4>

            {atributos.length === 0 && (
                <Alert variant="warning" className="text-center">
                    Nenhum atributo adicionado.
                </Alert>
            )}

            {atributos.map((atributo, index) => (
                <Card key={atributo.tempId} className="mb-3 border-secondary">
                    <Card.Body className="p-3">
                        <Row className="align-items-center">
                            <Col xs={1} className="text-center text-muted">
                                <strong>#{index + 1}</strong>
                            </Col>
                            <Col md={5}>
                                <Form.Group controlId={`attrLabel-${atributo.tempId}`}>
                                    <Form.Label className="small mb-1">Rótulo (Label) <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={atributo.label}
                                        onChange={(e) => handleAtributoChange(atributo.tempId, 'label', e.target.value)}
                                        placeholder="Ex: nome_completo"
                                        required
                                        disabled={loading}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group controlId={`attrType-${atributo.tempId}`}>
                                    <Form.Label className="small mb-1">Tipo de Dado <span className="text-danger">*</span></Form.Label>
                                    <Form.Select
                                        value={atributo.type}
                                        onChange={(e) => handleAtributoChange(atributo.tempId, 'type', e.target.value)}
                                        required
                                        disabled={loading}
                                    >
                                        {ATTRIBUTE_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={2} className="text-end">
                                <Button
                                    variant="danger"
                                    onClick={() => handleRemoveAtributo(atributo.tempId)}
                                    className="mt-3"
                                    disabled={loading}
                                    title="Remover Atributo"
                                >
                                    <Trash /> Remover
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            ))}

            <Button
                variant="outline-secondary"
                onClick={handleAddAtributo}
                className="mb-4 mt-2"
                disabled={loading}
            >
                <PlusCircle className="me-2" /> Adicionar Novo Atributo
            </Button>

            <hr />

            <div className="d-flex justify-content-end">
              <Button
                variant="success"
                type="submit"
                size="lg"
                disabled={loading || atributos.length === 0}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Criando...
                  </>
                ) : (
                  'Salvar Preset'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CriarPreset;