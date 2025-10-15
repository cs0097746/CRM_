import { useState, useEffect, useCallback, memo } from 'react';
import {
  Form, Button, Card, Row, Col, Alert, FloatingLabel,
  Toast, ToastContainer, Spinner
} from 'react-bootstrap';
import axios from 'axios';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";

interface Estagio {
  id: number;
  nome: string;
}

interface TarefaExistente {
  id: number;
  tipo: 'email' | 'whatsapp' | 'webhook';
  destinatario: string;
  codigo: string;
  descricao: string;
}

const TAREFAS_ENGESSADAS: TarefaExistente[] = [
    {
        id: 1000,
        tipo: 'email',
        destinatario: 'email@do_negocio',
        codigo: 'EMAIL_PADRAO',
        descricao: 'Enviar um Email básico',
    },
    {
        id: 1001,
        tipo: 'whatsapp',
        destinatario: 'numero@do_negocio',
        codigo: 'WHATSAPP_PADRAO',
        descricao: 'Enviar um WhatsApp básico',
    },
    {
        id: 1002,
        tipo: 'webhook',
        destinatario: 'n8n_ou_outro',
        codigo: 'WEBHOOK_PADRAO',
        descricao: 'Disparar um Webhook para fluxo externo',
    },
];


const EVENTO_CHOICES = [
    { value: 'negocio_criado', label: 'Negócio Criado' },
    { value: 'negocio_criado_em_x_estagio', label: 'Negócio Criado em Estágio Específico' },
    { value: 'negocio_estagio_trocado', label: 'Negócio Trocou de Estágio (Qualquer um)' },
    { value: 'negocio_estagio_trocado_de_x_para_y', label: 'Negócio Trocou de Estágio X para Y' },
];

const ACAO_CHOICES = [
    { value: 'criar_tarefa', label: 'Criar Tarefa (Template: Email, WhatsApp ou Webhook)' },
];

interface DadosGatilho {
  nome: string;
  evento: string;
  acao: string;
  ativo: boolean;
  estagioOrigemId: number | '';
  estagioDestinoId: number | '';
  tarefaRelacionadaId: 'email' | 'whatsapp' | 'webhook' | '';
  nota: string;
}

// 1. INTERFACE MODIFICADA: Alterado de link_webhook_n8n para url_n8n
interface TarefaPayload {
    assunto?: string;
    url_n8n?: string;
}

const getTipoLabel = (tipo: string | undefined): string => {
    const safeTipo = (tipo || '').toLowerCase();
    switch (safeTipo) {
      case 'email': return '📧 E-mail';
      case 'whatsapp': return '📱 WhatsApp';
      case 'webhook': return '🔗 Webhook';
      default: return '[??] Tipo Desconhecido';
    }
};

interface TarefaFieldsProps {
    tarefaSelecionada: TarefaExistente;
    tarefaPayload: TarefaPayload;
    handleTarefaPayloadChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const TarefaFields: React.FC<TarefaFieldsProps> = memo(({ tarefaSelecionada, tarefaPayload, handleTarefaPayloadChange }) => {
    const tipo = tarefaSelecionada.tipo;
    const fields = [];

    if (tipo === 'email') {
        fields.push(
            <Col md={12} key="assunto">
                <FloatingLabel label="Assunto do E-mail *Obrigatório*">
                    <Form.Control
                        type="text"
                        name="assunto"
                        value={tarefaPayload.assunto || ''}
                        onChange={handleTarefaPayloadChange}
                        required
                    />
                </FloatingLabel>
                <Form.Text muted>
                    {"Use as variáveis de contexto como `{{negocio.nome}}`."}
                </Form.Text>
            </Col>
        );
    } else if (tipo === 'whatsapp') {
        fields.push(
            <Col md={12} key="mensagem-info">
                 <Alert variant="info" className="p-2 m-0">
                    O **Conteúdo da Mensagem** será o que for preenchido no campo "Nota/Observação" abaixo (último card).
                 </Alert>
            </Col>
        );
    } else if (tipo === 'webhook') {
        // 2. COMPONENTE MODIFICADO: Alterado name e value para url_n8n
        fields.push(
            <Col md={12} key="url_n8n">
                <FloatingLabel label="URL de Disparo do Webhook *Obrigatório*">
                    <Form.Control
                        type="url"
                        name="url_n8n" // Alterado aqui
                        value={tarefaPayload.url_n8n || ''} // Alterado aqui
                        onChange={handleTarefaPayloadChange}
                        required
                        placeholder="Ex: https://webhook.site/abc-123"
                    />
                </FloatingLabel>
                <Form.Text muted>
                    Este link será chamado (POST) ao disparar o gatilho, enviando dados do negócio.
                </Form.Text>
            </Col>,
            <Col md={12} key="webhook-info">
                 <Alert variant="info" className="p-2 m-0">
                    O **Corpo/Payload** adicional do Webhook será o que for preenchido no campo "Nota/Observação" abaixo (último card).
                 </Alert>
            </Col>
        );
    }

    return (
        <Row className="g-3 mt-3">
            <Col md={12}>
                <Card.Subtitle className="mb-2 text-muted">
                    Configuração Específica da Tarefa
                </Card.Subtitle>
            </Col>

            <Col md={6}>
                 <FloatingLabel label="Destinatário (Placeholder)">
                    <Form.Control type="text" value={tarefaSelecionada.destinatario} disabled />
                 </FloatingLabel>
                 <Form.Text className='text-warning'>
                    <strong>Atenção:</strong> O destinatário real será o e-mail/telefone do contato do negócio.
                 </Form.Text>
            </Col>
            <Col md={6}>
                 <FloatingLabel label="Código de Referência">
                    <Form.Control type="text" value={tarefaSelecionada.codigo} disabled />
                 </FloatingLabel>
            </Col>

            {fields}
        </Row>
    );
});


const CriarGatilho = () => {
  const [formData, setFormData] = useState<DadosGatilho>({
    nome: '',
    evento: EVENTO_CHOICES[0].value,
    acao: ACAO_CHOICES[0].value,
    ativo: true,
    estagioOrigemId: '',
    estagioDestinoId: '',
    tarefaRelacionadaId: '',
    nota: '',
  });

  const [tarefaPayload, setTarefaPayload] = useState<TarefaPayload>({});

  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const tarefas = TAREFAS_ENGESSADAS;
  const [tarefaSelecionada, setTarefaSelecionada] = useState<TarefaExistente | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingEstagios, setLoadingEstagios] = useState(true);
  const loadingTarefas = false;

  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState<'success' | 'danger'>('success');


  useEffect(() => {
    const fetchEstagios = async () => {
      setLoadingEstagios(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) throw new Error("Token de autenticação não encontrado.");

        const headers = { Authorization: `Bearer ${token}` };

        const estagioUrl = `${backend_url}listar_estagios/`;
        // @ts-ignore
        const estagioResponse = await axios.get<Estagio[]>(estagioUrl, { headers });
        // @ts-ignore
          setEstagios(estagioResponse.data.results || estagioResponse.data);

      } catch (err: any) {
        console.error("Erro ao carregar estágios:", err);
        setError("Falha ao carregar estágios. Verifique a conexão com o backend.");
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

  const resetForm = () => {
    setFormData({
      nome: '',
      evento: EVENTO_CHOICES[0].value,
      acao: ACAO_CHOICES[0].value,
      ativo: true,
      estagioOrigemId: '',
      estagioDestinoId: '',
      tarefaRelacionadaId: '',
      nota: '',
    });
    setTarefaPayload({});
    setTarefaSelecionada(null);
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const type = (e.target as HTMLInputElement).type;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => {
        let newState = {
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        };

        if (name === 'tarefaRelacionadaId') {
            const selectedTipo = value;
            const tarefa = TAREFAS_ENGESSADAS.find(t => t.tipo === selectedTipo) || null;
            setTarefaSelecionada(tarefa);
            setTarefaPayload({});
        }

        if (name === 'evento') {
            const isOrigemNeeded = ['negocio_criado_em_x_estagio', 'negocio_estagio_trocado_de_x_para_y'].includes(value);
            const isDestinoNeeded = ['negocio_estagio_trocado_de_x_para_y'].includes(value);

            if (!isOrigemNeeded) newState.estagioOrigemId = '';
            if (!isDestinoNeeded) newState.estagioDestinoId = '';
        }

        return newState;
    });
  };

  const handleTarefaPayloadChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setTarefaPayload(prev => ({
          ...prev,
          [name]: value,
      }));
  }, []);


  useEffect(() => {
    const selectedTipo = formData.tarefaRelacionadaId;
    if (selectedTipo) {
        const tarefa = TAREFAS_ENGESSADAS.find(t => t.tipo === selectedTipo) || null;
        setTarefaSelecionada(tarefa);
    } else {
        setTarefaSelecionada(null);
        setTarefaPayload({});
    }
  }, [formData.tarefaRelacionadaId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.tarefaRelacionadaId) {
        const errorMessage = "O Template da Tarefa (Email, WhatsApp ou Webhook) é obrigatório.";
        setError(errorMessage);
        showNotification(errorMessage, 'danger');
        setLoading(false);
        return;
    }

    let validationError = null;
    const tipo = formData.tarefaRelacionadaId;

    if (tipo === 'email' && (!tarefaPayload.assunto || !formData.nota)) {
        validationError = "Assunto e o campo Nota (mensagem) são obrigatórios para E-mail.";
    } else if (tipo === 'whatsapp' && !formData.nota) {
        validationError = "O campo Nota (mensagem) é obrigatório para WhatsApp.";
    } else if (tipo === 'webhook' && !tarefaPayload.url_n8n) { // 3. VALIDAÇÃO MODIFICADA: Usando url_n8n
        validationError = "O Link do Webhook é obrigatório.";
    }

    if (validationError) {
        setError(validationError);
        showNotification(validationError, 'danger');
        setLoading(false);
        return;
    }

    // O spread já funcionará pois o estado tarefaPayload agora usa 'url_n8n'
    let dadosAdicionaisTarefa: TarefaPayload & { mensagem?: string } = { ...tarefaPayload };

    if (tipo === 'email' || tipo === 'whatsapp') {
        dadosAdicionaisTarefa.mensagem = formData.nota;
    } else if (tipo === 'webhook' && formData.nota) {
         dadosAdicionaisTarefa.mensagem = formData.nota;
    }

    // 4. PAYLOAD FINAL: O objeto dadosAdicionaisTarefa agora contém 'url_n8n' se for um webhook.
    const payload = {
      nome: formData.nome,
      evento: formData.evento,
      acao: formData.acao,
      ativo: formData.ativo,
      estagio_origem: formData.estagioOrigemId || null,
      estagio_destino: formData.estagioDestinoId || null,
      tarefa_relacionada: formData.tarefaRelacionadaId,
      nota: formData.nota,
      dados_adicionais_tarefa: dadosAdicionaisTarefa,
    };

    console.log("Payload de Submissão:", payload);

    try {
      const token = await getToken();
      if (!token) throw new Error("Falha na autenticação.");

      const apiUrl = `${backend_url}criar_gatilho/`;

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
                    placeholder="Ex: Disparar WhatsApp de Boas-vindas"
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
                        value={ACAO_CHOICES[0].label}
                        disabled
                        style={{ backgroundColor: '#f8f9fa' }}
                    />
                </FloatingLabel>
                <Form.Text muted>
                    A ação padrão é criar uma tarefa assíncrona (Celery).
                </Form.Text>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="shadow-sm mb-4 border-primary">
            <Card.Header style={{ fontWeight: 600, backgroundColor: '#eef7ff' }}>
                Selecione e Configure o Template da Tarefa
            </Card.Header>
            <Card.Body>
                <FloatingLabel label="Selecione o Tipo de Tarefa *Obrigatório*">
                    <Form.Select
                        name="tarefaRelacionadaId"
                        value={formData.tarefaRelacionadaId}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Selecione um template de tarefa...</option>
                        {tarefas.map(tarefa => (
                            // O valor enviado é o TIPO (string)
                            <option key={tarefa.id} value={tarefa.tipo}>
                                {`${getTipoLabel(tarefa.tipo)} ${tarefa.codigo ? '(' + tarefa.codigo + ') ' : ''} - ${tarefa.descricao}`}
                            </option>
                        ))}
                    </Form.Select>
                </FloatingLabel>
                <Form.Text muted>
                    Selecione qual das tarefas base este gatilho deve disparar.
                </Form.Text>

                {tarefaSelecionada && (
                    <div className="mt-3 p-3 border rounded bg-light">
                        <h6 className="mb-2">Template Selecionado: {getTipoLabel(tarefaSelecionada.tipo)}</h6>
                        <p className="mb-0 text-truncate">
                            Descrição: *{tarefaSelecionada.descricao}*
                        </p>
                    </div>
                )}

                {tarefaSelecionada && (
                    <TarefaFields
                        tarefaSelecionada={tarefaSelecionada}
                        tarefaPayload={tarefaPayload}
                        handleTarefaPayloadChange={handleTarefaPayloadChange}
                    />
                )}

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
                    <FloatingLabel label="Estágio de Origem *Obrigatório*">
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
                    <FloatingLabel label="Estágio de Destino *Obrigatório*">
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
            <Card.Header style={{ fontWeight: 600 }}>Conteúdo da Tarefa (Nota/Observação)</Card.Header>
            <Card.Body>
                <FloatingLabel label="Mensagem/Corpo do E-mail/WhatsApp/Webhook">
                    <Form.Control
                        as="textarea"
                        name="nota"
                        value={formData.nota}
                        onChange={handleChange}
                        style={{ height: '180px' }}
                        placeholder='Preencha aqui o conteúdo da mensagem ou o corpo do webhook. Use variáveis de contexto.'
                        required={formData.tarefaRelacionadaId !== 'webhook'}
                    />
                </FloatingLabel>
                <Form.Text muted>
                    {"Este conteúdo será usado como a mensagem real do E-mail/WhatsApp ou como o corpo/payload do Webhook. Use variáveis como `{{negocio.nome}}`."}
                </Form.Text>
            </Card.Body>
        </Card>

        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        <div className="d-grid gap-2 mt-4">
          <Button
            variant="primary"
            type="submit"
            disabled={loading || loadingEstagios || loadingTarefas}
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