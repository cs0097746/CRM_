import { useState } from 'react';
import {
  Form, Button, Card, Row, Col, Alert, FloatingLabel,
  Toast, ToastContainer, Spinner, ButtonGroup
} from 'react-bootstrap';
import axios from 'axios';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";

type TipoTarefa = 'email' | 'whatsapp';
type RecorrenciaTipo = 'unica' | 'horas' | 'diaria' | 'dias';

interface RecorrenciaConfig {
  tipo: RecorrenciaTipo;
  valor1: number | string; // X horas / Data/Hora / X dias / Hora do dia
  valor2?: number | string; // Y horas (apenas para 'dias')
}

interface DadosTarefa {
  tipo: TipoTarefa;
  destinatario: string;
  assunto: string;
  mensagem: string;
  linkWebhookN8n: string;
  recorrencia: RecorrenciaConfig;
}

const CriarTarefa = () => {
  const [formData, setFormData] = useState<DadosTarefa>({
    tipo: 'email',
    destinatario: '',
    assunto: '',
    mensagem: '',
    linkWebhookN8n: '',
    recorrencia: {
      tipo: 'unica',
      valor1: '',
      valor2: undefined,
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'danger'>('success');

  const showNotification = (message: string, variant: 'success' | 'danger') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRecorrenciaChange = (name: keyof DadosTarefa['recorrencia'], value: any) => {
    setFormData(prev => ({
      ...prev,
      recorrencia: {
        ...prev.recorrencia,
        [name]: value,
      },
    }));
  };

  const resetForm = () => {
    setFormData({
        tipo: 'email',
        destinatario: '',
        assunto: '',
        mensagem: '',
        linkWebhookN8n: '',
        recorrencia: {
          tipo: 'unica',
          valor1: '',
          valor2: undefined,
        },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { recorrencia } = formData;

    const config_recorrencia_formatada = {
        tipo: recorrencia.tipo,
        valor1: String(recorrencia.valor1),
        ...(recorrencia.valor2 !== undefined && { valor2: String(recorrencia.valor2) })
    };

    const payload = {
      tipo_tarefa: formData.tipo,
      destinatario: formData.destinatario,
      assunto: formData.tipo === 'email' ? formData.assunto : undefined,
      mensagem: formData.mensagem,
      link_webhook_n8n: formData.linkWebhookN8n || undefined,
      config_recorrencia: config_recorrencia_formatada,
    };

    console.log("Payload de envio:", payload);

    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação. Verifique as credenciais no getToken.");

      const apiUrl = `${backend_url}criar_tarefas/`;

      const response = await axios.post(apiUrl, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 201 || response.status === 200) {
        showNotification(`Tarefa de ${formData.tipo.toUpperCase()} criada com sucesso!`, 'success');
        resetForm();
      }

    } catch (err: any) {
      console.error('Erro ao criar tarefa:', err);
      const errorMessage = err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor.';
      setError(`Erro ao criar tarefa: ${errorMessage}`);
      showNotification('Erro ao criar tarefa. Verifique o console para detalhes.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const renderRecorrenciaCampos = () => {
    const { tipo, valor1, valor2 } = formData.recorrencia;

    switch (tipo) {
      case 'unica':
        return (
          <Col md={12}>
            <FloatingLabel label="Data e Hora do Envio (YYYY-MM-DDTHH:MM)">
              <Form.Control
                type="datetime-local"
                name="valor1"
                value={typeof valor1 === 'string' ? valor1 : ''}
                onChange={(e) => handleRecorrenciaChange('valor1', e.target.value)}
                required
              />
            </FloatingLabel>
          </Col>
        );
      case 'horas':
        return (
          <Col md={6}>
            <FloatingLabel label="A cada X horas">
              <Form.Control
                type="number"
                name="valor1"
                min="1"
                value={valor1}
                onChange={(e) => handleRecorrenciaChange('valor1', parseInt(e.target.value) || 1)}
                required
              />
            </FloatingLabel>
          </Col>
        );
      case 'diaria':
        return (
          <Col md={6}>
            <FloatingLabel label="Todo dia às (HH:MM)">
              <Form.Control
                type="time"
                name="valor1"
                value={typeof valor1 === 'string' ? valor1 : '09:00'}
                onChange={(e) => handleRecorrenciaChange('valor1', e.target.value)}
                required
              />
            </FloatingLabel>
          </Col>
        );
      case 'dias':
        return (
          <>
            <Col md={6}>
              <FloatingLabel label="A cada X dias">
                <Form.Control
                  type="number"
                  name="valor1"
                  min="1"
                  value={valor1}
                  onChange={(e) => handleRecorrenciaChange('valor1', parseInt(e.target.value) || 1)}
                  required
                />
              </FloatingLabel>
            </Col>
            <Col md={6}>
              <FloatingLabel label="Horário de envio (HH:MM)">
                <Form.Control
                  type="time"
                  name="valor2"
                  value={typeof valor2 === 'string' ? valor2 : '09:00'}
                  onChange={(e) => handleRecorrenciaChange('valor2', e.target.value)}
                  required
                />
              </FloatingLabel>
            </Col>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2 className="mb-4" style={{ fontWeight: 600 }}>
        📅 Criar Tarefa Recorrente
      </h2>

      <div className="d-flex mb-4">
        <ButtonGroup size="lg">
          <Button
            variant={formData.tipo === 'email' ? 'primary' : 'outline-primary'}
            onClick={() => setFormData(prev => ({ ...prev, tipo: 'email', assunto: '' }))}
          >
            📧 Envio de E-mail
          </Button>
          <Button
            variant={formData.tipo === 'whatsapp' ? 'success' : 'outline-success'}
            onClick={() => setFormData(prev => ({ ...prev, tipo: 'whatsapp', assunto: 'N/A' }))}
          >
            📱 Envio de WhatsApp
          </Button>
        </ButtonGroup>
      </div>

      <Form onSubmit={handleSubmit}>
        <Card className="shadow-sm mb-4">
          <Card.Header style={{ fontWeight: 600 }}>
            {formData.tipo === 'email' ? 'Configuração do E-mail' : 'Configuração do WhatsApp'}
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={12}>
                <FloatingLabel
                  label={formData.tipo === 'email' ? "Destinatário (Email)" : "Destinatário (Telefone com DDD)"}
                >
                  <Form.Control
                    type={formData.tipo === 'email' ? "email" : "tel"}
                    placeholder={formData.tipo === 'email' ? "exemplo@dominio.com" : "5551987654321"}
                    name="destinatario"
                    value={formData.destinatario}
                    onChange={handleChange}
                    required
                  />
                </FloatingLabel>
              </Col>

              {formData.tipo === 'email' && (
                <Col md={12}>
                  <FloatingLabel label="Assunto do E-mail">
                    <Form.Control
                      type="text"
                      placeholder="Assunto da Mensagem"
                      name="assunto"
                      value={formData.assunto}
                      onChange={handleChange}
                      required
                    />
                  </FloatingLabel>
                </Col>
              )}

              <Col md={12}>
                <FloatingLabel label="Conteúdo da Mensagem">
                  <Form.Control
                    as="textarea"
                    placeholder="Corpo da mensagem ou texto do WhatsApp"
                    name="mensagem"
                    value={formData.mensagem}
                    onChange={handleChange}
                    style={{ height: '100px' }}
                    required
                  />
                </FloatingLabel>
              </Col>

              <Col md={12}>
                <FloatingLabel label="URL do Webhook (Opcional - p/ n8n ou outro)">
                  <Form.Control
                    type="url"
                    placeholder="https://sua.instancia.n8n/webhook/..."
                    name="linkWebhookN8n"
                    value={formData.linkWebhookN8n}
                    onChange={handleChange}
                  />
                </FloatingLabel>
              </Col>

            </Row>
          </Card.Body>
        </Card>

        <Card className="shadow-sm mb-4">
          <Card.Header style={{ fontWeight: 600 }}>
            ⏰ Configuração de Recorrência
          </Card.Header>
          <Card.Body>
            <Row className="g-3 align-items-end">
              <Col md={6}>
                <FloatingLabel label="Tipo de Recorrência">
                  <Form.Select
                    name="recorrenciaTipo"
                    value={formData.recorrencia.tipo}
                    onChange={(e) => {
                      const newType = e.target.value as RecorrenciaTipo;
                      handleRecorrenciaChange('tipo', newType);
                      handleRecorrenciaChange('valor1', newType === 'unica' ? '' : 1);
                      handleRecorrenciaChange('valor2', undefined);
                    }}
                  >
                    <option value="unica">1x - Envio Único (Data/Hora específica)</option>
                    <option value="horas">A cada X horas</option>
                    <option value="diaria">Todo dia X horas (Recorrência diária)</option>
                    <option value="dias">A cada X dias Y horas (Recorrência por múltiplos dias)</option>
                  </Form.Select>
                </FloatingLabel>
              </Col>

              {renderRecorrenciaCampos()}

            </Row>
          </Card.Body>
        </Card>

        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        <div className="d-grid gap-2 mt-4">
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
            style={{ padding: '10px 20px', fontSize: '16px', fontWeight: 600 }}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Criando Tarefa...
              </>
            ) : (
              'Criar Tarefa Agendada'
            )}
          </Button>
        </div>
      </Form>

      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastVariant}
        >
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default CriarTarefa;