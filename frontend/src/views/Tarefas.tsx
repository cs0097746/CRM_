import { useState } from 'react';
import {
  Form, Button, Card, Row, Col, Alert, FloatingLabel,
  Toast, ToastContainer, Spinner, ButtonGroup
} from 'react-bootstrap';
import axios from 'axios';
import backend_url from "../config/env.ts"; // Assumindo que este caminho é válido

// Definições de Tipo (ajuste conforme sua API)
type TipoTarefa = 'email' | 'whatsapp';
type RecorrenciaTipo = 'unica' | 'horas' | 'diaria' | 'dias';

interface DadosTarefa {
  tipo: TipoTarefa;
  destinatario: string; // Ex: Email para email, Telefone para whatsapp
  assunto: string;      // Apenas para Email
  mensagem: string;
  recorrencia: {
    tipo: RecorrenciaTipo;
    valor1: number | string; // Valor principal (Ex: X horas, Dia da semana/hora)
    valor2?: number | string; // Valor secundário (Ex: Y horas para 'dias')
  };
}

// const api = axios.create({
//   baseURL: backend_url
// });

// Mock de função de autenticação
// Você precisará adaptar o getToken do seu Atendimento.tsx aqui ou usar um hook de auth global
const getToken = async () => {
    // Implementação de getToken (copiar de Atendimento.tsx ou refatorar para um hook)
    const USERNAME = "admin";
    const PASSWORD = "admin";
    const CLIENT_ID = "KpkNSgZswIS1axx3fwpzNqvGKSkf6udZ9QoD3Ulz";
    const CLIENT_SECRET = "q828o8DwBwuM1d9XMNZ2KxLQvCmzJgvRnb0I1TMe0QwyVPNB7yA1HRiie45oubSQbKucq6YR3Gyo9ShlN1L0VsnEgKlekMCdlKRkEK4x1760kzgPbqG9mtzfMU4BjXvG";
    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("username", USERNAME);
    params.append("password", PASSWORD);
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    try {
      const res = await axios.post(`${backend_url}o/token/`, params);
      return res.data.access_token;
    } catch (err) {
      console.error(err);
      return null;
    }
};

const CriarTarefa = () => {
  const [formData, setFormData] = useState<DadosTarefa>({
    tipo: 'email',
    destinatario: '',
    assunto: '',
    mensagem: '',
    recorrencia: {
      tipo: 'unica',
      valor1: 1,
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
        recorrencia: {
          tipo: 'unica',
          valor1: 1,
          valor2: undefined,
        },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulação da estrutura que a API deve esperar
    const payload = {
      tipo_tarefa: formData.tipo,
      destinatario: formData.destinatario,
      assunto: formData.tipo === 'email' ? formData.assunto : undefined,
      mensagem: formData.mensagem,
      config_recorrencia: formData.recorrencia,
    };

    console.log("Payload de envio:", payload);

    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação.");

      // Substitua '/tarefas/criar' pelo endpoint real da sua API
      // const response = await api.post('/tarefas/criar', payload, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });

      // Simulação de sucesso
      await new Promise(resolve => setTimeout(resolve, 1500));

      // if (response.status === 201) {
        showNotification(`Tarefa de ${formData.tipo.toUpperCase()} criada com sucesso!`, 'success');
        resetForm();
      // }
    } catch (err) {
      console.error('Erro ao criar tarefa:', err);
      setError('Erro ao criar tarefa. Verifique o console.');
      showNotification('Erro ao criar tarefa. Tente novamente.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // --- Renderização da Recorrência ---
  const renderRecorrenciaCampos = () => {
    const { tipo, valor1, valor2 } = formData.recorrencia;

    switch (tipo) {
      case 'unica':
        return (
          <Col md={12}>
            <FloatingLabel label="Data e Hora do Envio">
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

      {/* Botões de Ação Rápida no topo */}
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
            </Row>
          </Card.Body>
        </Card>

        {/* Configuração de Recorrência */}
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
                      // Resetar valores ao trocar o tipo
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

      {/* Toast de Notificação */}
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