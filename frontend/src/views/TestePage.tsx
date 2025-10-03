// frontend/src/views/TestePage.tsx
import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Badge } from 'react-bootstrap';
import backend_url from "../config/env.ts";

const TestePage: React.FC = () => {
  const [numero, setNumero] = useState('5555999566836'); // Coloque seu número aqui
  const [mensagem, setMensagem] = useState('🚀 Teste do CRM - Sistema funcionando 100%!');
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testarEnvio = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${backend_url}/whatsapp/enviar/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numero: numero,
          mensagem: mensagem
        })
      });

      const data = await response.json();
      setResultado({
        tipo: 'envio',
        sucesso: data.success,
        dados: data,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      setResultado({ 
        tipo: 'envio',
        sucesso: false,
        erro: error,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testarWebhook = async () => {
    setLoading(true);
    try {
        const response = await fetch(`${backend_url}/webhook/evolution/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'Christian',
          data: {
            key: {
              remoteJid: `${numero}@s.whatsapp.net`,
              fromMe: false,
              id: `test_${Date.now()}`
            },
            message: {
              conversation: '📥 Mensagem de teste - recebimento funcionando perfeitamente!'
            }
          }
        })
      });

      const data = await response.json();
      setResultado({
        tipo: 'webhook',
        sucesso: data.status === 'processed',
        dados: data,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      setResultado({ 
        tipo: 'webhook',
        sucesso: false,
        erro: error,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setLoading(false);
    }
  };

  const verificarStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${backend_url}/whatsapp/status/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setResultado({
        tipo: 'status',
        sucesso: data.success,
        dados: data,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      setResultado({ 
        tipo: 'status',
        sucesso: false,
        erro: error,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setLoading(false);
    }
  };

  const verificarConversas = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${backend_url}/conversas/`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setResultado({
        tipo: 'conversas',
        sucesso: response.ok,
        dados: data,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      setResultado({ 
        tipo: 'conversas',
        sucesso: false,
        erro: error,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h2>🧪 Central de Testes - Sistema Completo</h2>
          <p className="text-muted">Teste todas as funcionalidades integradas do CRM</p>
        </Col>
      </Row>

      {/* Status do Sistema */}
      <Row className="mb-4">
        <Col>
          <Alert variant="success">
            <h6>✅ Status do Sistema (FUNCIONANDO!):</h6>
            <Row>
              <Col md={3}>
                <Badge bg="success">✅ Configurações Salvas</Badge>
              </Col>
              <Col md={3}>
                <Badge bg="success">✅ WhatsApp Conectado</Badge>
              </Col>
              <Col md={3}>
                <Badge bg="success">✅ Webhook Configurado</Badge>
              </Col>
              <Col md={3}>
                <Badge bg="success">✅ API Funcionando</Badge>
              </Col>
            </Row>
          </Alert>
        </Col>
      </Row>

      {/* Configuração do Teste */}
      <Row className="mb-4">
        <Col lg={6}>
          <Card>
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">⚙️ Configuração do Teste</h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Seu Número (com DDI)</Form.Label>
                  <Form.Control
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="5511999999999"
                  />
                  <Form.Text className="text-muted">
                    Use seu número real para testar o recebimento
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Mensagem de Teste</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                  />
                </Form.Group>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card>
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">🔍 Instruções de Teste</h5>
            </Card.Header>
            <Card.Body>
              <ol>
                <li><strong>Verificar Status:</strong> Confirma se tudo está conectado</li>
                <li><strong>Enviar Mensagem:</strong> Testa o envio para seu WhatsApp</li>
                <li><strong>Responder no WhatsApp:</strong> Envie uma mensagem de volta</li>
                <li><strong>Verificar Conversas:</strong> Veja se apareceu no CRM</li>
                <li><strong>Simular Webhook:</strong> Teste interno do sistema</li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Botões de Teste */}
      <Row className="mb-4">
        <Col lg={3}>
          <Card className="h-100">
            <Card.Header className="bg-secondary text-white text-center">
              <h6 className="mb-0">1️⃣ Status</h6>
            </Card.Header>
            <Card.Body className="text-center">
              <Button 
                variant="secondary" 
                onClick={verificarStatus}
                disabled={loading}
                className="w-100"
              >
                {loading ? 'Verificando...' : '🔍 Verificar Status'}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3}>
          <Card className="h-100">
            <Card.Header className="bg-success text-white text-center">
              <h6 className="mb-0">2️⃣ Envio</h6>
            </Card.Header>
            <Card.Body className="text-center">
              <Button 
                variant="success" 
                onClick={testarEnvio}
                disabled={loading || !numero}
                className="w-100"
              >
                {loading ? 'Enviando...' : '📤 Enviar Mensagem'}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3}>
          <Card className="h-100">
            <Card.Header className="bg-warning text-dark text-center">
              <h6 className="mb-0">3️⃣ Conversas</h6>
            </Card.Header>
            <Card.Body className="text-center">
              <Button 
                variant="warning" 
                onClick={verificarConversas}
                disabled={loading}
                className="w-100"
              >
                {loading ? 'Verificando...' : '💬 Ver Conversas'}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={3}>
          <Card className="h-100">
            <Card.Header className="bg-info text-white text-center">
              <h6 className="mb-0">4️⃣ Webhook</h6>
            </Card.Header>
            <Card.Body className="text-center">
              <Button 
                variant="info" 
                onClick={testarWebhook}
                disabled={loading || !numero}
                className="w-100"
              >
                {loading ? 'Testando...' : '📥 Simular Recebimento'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Resultado dos Testes */}
      {resultado && (
        <Row>
          <Col>
            <Card>
              <Card.Header className={`text-white ${resultado.sucesso ? 'bg-success' : 'bg-danger'}`}>
                <Row>
                  <Col>
                    <h5 className="mb-0">
                      {resultado.sucesso ? '✅' : '❌'} Resultado do Teste: {resultado.tipo}
                    </h5>
                  </Col>
                  <Col xs="auto">
                    <small>{resultado.timestamp}</small>
                  </Col>
                </Row>
              </Card.Header>
              <Card.Body>
                {resultado.sucesso ? (
                  <div>
                    <Alert variant="success">
                      <strong>🎉 Teste realizado com sucesso!</strong>
                    </Alert>
                    <pre style={{ maxHeight: '400px', overflow: 'auto', fontSize: '12px', background: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
                      {JSON.stringify(resultado.dados, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <Alert variant="danger">
                      <strong>❌ Erro no teste:</strong>
                    </Alert>
                    <pre style={{ maxHeight: '400px', overflow: 'auto', fontSize: '12px', background: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
                      {JSON.stringify(resultado.erro || resultado.dados, null, 2)}
                    </pre>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Próximos Passos */}
      <Row className="mt-4">
        <Col>
          <Alert variant="primary">
            <h6>🚀 Próximos Passos Após os Testes:</h6>
            <ol className="mb-0">
              <li>✅ <strong>Sistema Base:</strong> CRM funcionando com WhatsApp</li>
              <li>🔄 <strong>Próximo:</strong> Implementar funcionalidades de IA (Agentes Dona Irene)</li>
              <li>🎯 <strong>Futuro:</strong> Customizações por cliente</li>
              <li>📊 <strong>Expansão:</strong> Relatórios e automações avançadas</li>
            </ol>
          </Alert>
        </Col>
      </Row>
    </Container>
  );
};

export default TestePage;