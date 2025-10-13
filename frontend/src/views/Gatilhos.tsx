import { useState, useEffect } from 'react';
import {
  Form, Button, Card, Row, Col, Alert, FloatingLabel,
  Toast, ToastContainer, Spinner
} from 'react-bootstrap';
import axios from 'axios';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";

// Interface para os estágios que serão carregados
interface Estagio {
  id: number;
  nome: string;
}

// Opções de evento, espelhando o EVENTO_CHOICES do Django
const EVENTO_CHOICES = [
    { value: 'negocio_criado', label: 'Negócio Criado' },
    { value: 'negocio_criado_em_x_estagio', label: 'Negócio Criado em Estágio Específico' },
    { value: 'negocio_estagio_trocado', label: 'Negócio Trocou de Estágio (Qualquer um)' },
    { value: 'negocio_estagio_trocado_de_x_para_y', label: 'Negócio Trocou de Estágio X para Y' },
];

// Interface para o estado do formulário
interface DadosGatilho {
  nome: string;
  evento: string;
  acao: string;
  ativo: boolean;
  estagioOrigemId: number | '';
  estagioDestinoId: number | '';
  parametros: string; // Armazenaremos como string e validaremos/converteremos para JSON no envio
}

const CriarGatilho = () => {
  const [formData, setFormData] = useState<DadosGatilho>({
    nome: '',
    evento: EVENTO_CHOICES[0].value,
    acao: '',
    ativo: true,
    estagioOrigemId: '',
    estagioDestinoId: '',
    parametros: '{}', // Iniciar com um JSON vazio e válido
  });

  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEstagios, setLoadingEstagios] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'danger'>('success');


  // Efeito para buscar os estágios da API quando o componente é montado
  useEffect(() => {
    const fetchEstagios = async () => {
      setLoadingEstagios(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Token de autenticação não encontrado.");

        const apiUrl = `${backend_url}listar_estagios/`; // Ajuste este endpoint se necessário
        const response = await axios.get<Estagio[]>(apiUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEstagios(response.data);
      } catch (err) {
        setError("Falha ao carregar a lista de estágios. Verifique a conexão com o backend.");
      } finally {
        setLoadingEstagios(false);
      }
    };
    fetchEstagios();
  }, []);

  const showNotification = (message: string, variant: 'success' | 'danger') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const type = (e.target as HTMLInputElement).type;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      evento: EVENTO_CHOICES[0].value,
      acao: '',
      ativo: true,
      estagioOrigemId: '',
      estagioDestinoId: '',
      parametros: '{}',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let parametrosJson;
    try {
      parametrosJson = JSON.parse(formData.parametros);
    } catch (jsonError) {
      const errorMessage = "O formato dos Parâmetros não é um JSON válido. Verifique a sintaxe, ex: {\"chave\": \"valor\"}.";
      setError(errorMessage);
      showNotification(errorMessage, 'danger');
      setLoading(false);
      return;
    }

    const payload = {
      nome: formData.nome,
      evento: formData.evento,
      acao: formData.acao,
      ativo: formData.ativo,
      estagio_origem: formData.estagioOrigemId || null,
      estagio_destino: formData.estagioDestinoId || null,
      parametros: parametrosJson,
    };

    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação.");

      const apiUrl = `${backend_url}criar_gatilho/`; // Ajuste este endpoint se necessário

      await axios.post(apiUrl, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showNotification('Gatilho criado com sucesso!', 'success');
      resetForm();

    } catch (err: any) {
      console.error('Erro ao criar gatilho:', err);
      const errorMessage = err.response?.data ? JSON.stringify(err.response.data) : 'Erro de rede ou servidor.';
      setError(`Erro ao criar gatilho: ${errorMessage}`);
      showNotification('Erro ao criar gatilho. Verifique os dados.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Lógica para exibir condicionalmente os campos de estágio
  const showOrigemField = ['negocio_criado_em_x_estagio', 'negocio_estagio_trocado_de_x_para_y'].includes(formData.evento);
  const showDestinoField = ['negocio_estagio_trocado_de_x_para_y'].includes(formData.evento);

  return (
    <div className="p-4" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h2 className="mb-4" style={{ fontWeight: 600 }}>
        ⚙️ Criar Novo Gatilho
      </h2>

      <Form onSubmit={handleSubmit}>
        <Card className="shadow-sm mb-4">
          <Card.Header style={{ fontWeight: 600 }}>
            Informações Gerais do Gatilho
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={8}>
                <FloatingLabel label="Nome do Gatilho">
                  <Form.Control
                    type="text"
                    placeholder="Ex: Enviar email de boas-vindas"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                  />
                </FloatingLabel>
              </Col>
              <Col md={4} className="d-flex align-items-center justify-content-center">
                 <Form.Check
                    type="switch"
                    id="ativoSwitch"
                    label={<span style={{ fontWeight: 500 }}>Gatilho Ativo</span>}
                    name="ativo"
                    checked={formData.ativo}
                    onChange={handleChange}
                    className="pt-2 pb-2"
                  />
              </Col>
               <Col md={12}>
                <FloatingLabel label="Ação a ser executada">
                  <Form.Control
                    type="text"
                    placeholder="Ex: enviar_email, criar_tarefa, etc."
                    name="acao"
                    value={formData.acao}
                    onChange={handleChange}
                    required
                  />
                </FloatingLabel>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="shadow-sm mb-4">
          <Card.Header style={{ fontWeight: 600 }}>
            Condição do Evento
          </Card.Header>
          <Card.Body>
             {loadingEstagios ? <div className="text-center"><Spinner animation="border" size="sm" /> Carregando estágios...</div> :
             <Row className="g-3">
              <Col md={12}>
                <FloatingLabel label="Quando este gatilho deve disparar? (Evento)">
                  <Form.Select
                    name="evento"
                    value={formData.evento}
                    onChange={handleChange}
                  >
                    {EVENTO_CHOICES.map(choice => (
                        <option key={choice.value} value={choice.value}>{choice.label}</option>
                    ))}
                  </Form.Select>
                </FloatingLabel>
              </Col>

              {showOrigemField && (
                <Col md={showDestinoField ? 6 : 12}>
                    <FloatingLabel label="Estágio de Origem">
                        <Form.Select name="estagioOrigemId" value={formData.estagioOrigemId} onChange={handleChange} required>
                            <option value="">Selecione um estágio...</option>
                            {estagios.map(estagio => (
                                <option key={estagio.id} value={estagio.id}>{estagio.nome}</option>
                            ))}
                        </Form.Select>
                    </FloatingLabel>
                </Col>
              )}

              {showDestinoField && (
                <Col md={6}>
                    <FloatingLabel label="Estágio de Destino">
                        <Form.Select name="estagioDestinoId" value={formData.estagioDestinoId} onChange={handleChange} required>
                            <option value="">Selecione um estágio...</option>
                            {estagios.map(estagio => (
                                <option key={estagio.id} value={estagio.id}>{estagio.nome}</option>
                            ))}
                        </Form.Select>
                    </FloatingLabel>
                </Col>
              )}
            </Row>}
          </Card.Body>
        </Card>

        <Card className="shadow-sm mb-4">
            <Card.Header style={{ fontWeight: 600 }}>Parâmetros da Ação (Formato JSON)</Card.Header>
            <Card.Body>
                <FloatingLabel label="Parâmetros Adicionais">
                    <Form.Control
                        as="textarea"
                        name="parametros"
                        value={formData.parametros}
                        onChange={handleChange}
                        style={{ height: '120px', fontFamily: 'monospace' }}
                        placeholder='{ "template_id": 123, "assunto": "Bem-vindo!" }'
                    />
                </FloatingLabel>
                <Form.Text muted>
                    Insira um objeto JSON válido. Ex: <code>{"{\"chave\": \"valor\", \"numero\": 100}"}</code>
                </Form.Text>
            </Card.Body>
        </Card>

        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        <div className="d-grid gap-2 mt-4">
          <Button
            variant="primary"
            type="submit"
            disabled={loading || loadingEstagios}
            style={{ padding: '10px 20px', fontSize: '16px', fontWeight: 600 }}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Criando Gatilho...
              </>
            ) : (
              'Criar Gatilho'
            )}
          </Button>
        </div>
      </Form>

      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={4000}
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

export default CriarGatilho;