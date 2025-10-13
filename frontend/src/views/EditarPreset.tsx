import { useState, useEffect, useCallback } from 'react';
import {
  Button, Card, Alert, Spinner, Row, Col, Form, Modal
} from 'react-bootstrap';
import { Trash, PlusCircle, CheckCircle, PencilSquare } from 'react-bootstrap-icons';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

interface AtributoExistente {
    id: number | null;
    tempId: number;
    label: string;
    type: string;
}

interface PresetData {
    id: number;
    nome: string;
    descricao: string;
    atributos: AtributoExistente[];
}

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


const EditarPreset = () => {
  const { presetId } = useParams<{ presetId: string }>();
  const navigate = useNavigate();

  const [preset, setPreset] = useState<PresetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const API_ENDPOINT = `presets/${presetId}/`;

  const fetchPreset = useCallback(async () => {
    if (!presetId) {
        setError("ID do Preset não fornecido na URL.");
        setLoading(false);
        return;
    }
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação.");

      const apiUrl = `${backend_url}${API_ENDPOINT}`;
      const response = await axios.get<PresetData>(apiUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const atributosMapeados: AtributoExistente[] = response.data.atributos.map(attr => ({
        ...attr,
        tempId: attr.id || Date.now() + Math.random(),
      }));

      setPreset({ ...response.data, atributos: atributosMapeados });

    } catch (err: any) {
      console.error('Erro ao carregar preset:', err.response?.data || err);
      const errorDetail = err.response?.status === 404 ?
        `Preset com ID ${presetId} não encontrado.` :
        (err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor ao carregar.');
      setError(`Falha ao carregar o Preset. Erro: ${errorDetail}`);
    } finally {
      setLoading(false);
    }
  }, [presetId, API_ENDPOINT]);

  useEffect(() => {
    fetchPreset();
  }, [fetchPreset]);

  const handleUpdateField = (field: 'nome' | 'descricao', value: string) => {
    setPreset(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleAddAtributo = () => {
    if (!preset) return;
    const newTempId = Date.now();
    const novoAtributo: AtributoExistente = {
        id: null,
        tempId: newTempId,
        label: '',
        type: 'string'
    };
    setPreset(prev => prev ? { ...prev, atributos: [...prev.atributos, novoAtributo] } : null);
  };

  const handleRemoveAtributo = (tempId: number) => {
    if (!preset) return;
    setPreset(prev =>
      prev ? { ...prev, atributos: prev.atributos.filter(attr => attr.tempId !== tempId) } : null
    );
  };

  const handleAtributoChange = (tempId: number, field: 'label' | 'type', value: string) => {
    if (!preset) return;
    setPreset(prev =>
      prev ? {
        ...prev,
        atributos: prev.atributos.map(attr =>
          attr.tempId === tempId ? { ...attr, [field]: value } : attr
        )
      } : null
    );
  };

  const validateForm = (): boolean => {
    if (!preset) return false;

    if (!preset.nome.trim()) {
      setError("O nome do Preset é obrigatório.");
      return false;
    }

    const labels = preset.atributos.map(a => a.label.trim());
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

    if (!validateForm() || !preset) {
        return;
    }

    setSaving(true);

    const payload = {
      nome: preset.nome.trim(),
      descricao: preset.descricao.trim() || null,
      atributos: preset.atributos.map(attr => ({
        id: attr.id,
        label: attr.label.trim(),
        type: attr.type,
      })),
    };

    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação. Não foi possível obter o token.");

      const apiUrl = `${backend_url}${API_ENDPOINT}`;

      const response = await axios.put(apiUrl, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const atributosAtualizados = response.data.atributos.map((attr: any) => ({
          ...attr,
          tempId: attr.id,
      }));
      setPreset({ ...response.data, atributos: atributosAtualizados });

      setSuccess(`Preset "${response.data.nome}" (ID: ${response.data.id}) atualizado com sucesso!`);

    } catch (err: any) {
      console.error('Erro ao atualizar preset:', err.response?.data || err);
      const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor.';
      setError(`Falha na atualização do Preset. Erro: ${errorDetail}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePreset = async () => {
    if (!presetId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
        const token = await getToken();
        if (!token) throw new Error("Falha na autenticação.");

        const apiUrl = `${backend_url}${API_ENDPOINT}`;

        await axios.delete(apiUrl, {
            headers: { Authorization: `Bearer ${token}` }
        });

        setSuccess(`Preset excluído com sucesso! Redirecionando...`);
        setShowDeleteModal(false);
        setTimeout(() => navigate('/presets/'), 2000);

    } catch (err: any) {
        console.error('Erro ao excluir preset:', err.response?.data || err);
        const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor.';
        setError(`Falha ao excluir o Preset. Erro: ${errorDetail}`);
    } finally {
        setSaving(false);
    }
  };

  if (loading) {
    return (
        <div className="text-center p-5">
            <Spinner animation="border" className="me-2" />
            Carregando Preset...
        </div>
    );
  }

  if (error && !preset) {
      return <Alert variant="danger" className="m-4">{error}</Alert>;
  }

  if (!preset) {
      return <Alert variant="warning" className="m-4">Dados do preset não disponíveis.</Alert>;
  }

  return (
    <div className="p-4" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Row className="mb-4 align-items-center">
        <Col>
          <h2 style={{ fontWeight: 600 }}><PencilSquare className="me-2" /> Editar Preset: {preset.nome}</h2>
        </Col>
        <Col xs="auto">
            <Button
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                disabled={saving}
            >
                <Trash /> Excluir Preset
            </Button>
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
                    value={preset.nome}
                    onChange={(e) => handleUpdateField('nome', e.target.value)}
                    required
                    placeholder="Ex: Dados Pessoais Básicos"
                    disabled={saving}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="formDescricao" className="mb-3">
                  <Form.Label>Descrição</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={1}
                    value={preset.descricao || ''}
                    onChange={(e) => handleUpdateField('descricao', e.target.value)}
                    placeholder="Breve explicação sobre quando usar este preset."
                    disabled={saving}
                  />
                </Form.Group>
              </Col>
            </Row>

            <h4 className="mt-3 mb-3">Definição dos Atributos</h4>

            {preset.atributos.length === 0 && (
                <Alert variant="warning" className="text-center">
                    Nenhum atributo definido.
                </Alert>
            )}

            {preset.atributos.map((atributo, index) => (
                <Card key={atributo.tempId} className="mb-3 border-secondary">
                    <Card.Body className="p-3">
                        <Row className="align-items-center">
                            <Col xs={1} className="text-center text-muted">
                                <strong>#{index + 1}</strong>
                                {atributo.id && <span className="d-block small text-success">Existente</span>}
                                {!atributo.id && <span className="d-block small text-primary">Novo</span>}
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
                                        disabled={saving}
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
                                        disabled={saving}
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
                                    variant="outline-danger"
                                    onClick={() => handleRemoveAtributo(atributo.tempId)}
                                    className="mt-3"
                                    disabled={saving}
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
                disabled={saving}
            >
                <PlusCircle className="me-2" /> Adicionar Novo Atributo
            </Button>

            <hr />

            <div className="d-flex justify-content-end">
              <Button
                variant="success"
                type="submit"
                size="lg"
                disabled={saving || preset.atributos.length === 0}
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmação de Exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Tem certeza de que deseja **excluir permanentemente** o Preset:
          <span className="fw-bold d-block mt-2">{preset.nome}</span>?
          Esta ação não pode ser desfeita.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeletePreset} disabled={saving}>
            {saving ? <Spinner animation="border" size="sm" className="me-2" /> : <Trash className="me-2" />}
            Excluir
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default EditarPreset;