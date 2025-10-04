// frontend/src/views/ConfiguracaoWhatsApp.tsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
import backend_url from "../config/env.ts";

const ConfiguracaoWhatsApp: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const verificarStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backend_url}/whatsapp/status/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const obterQRCode = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backend_url}/whatsapp/qr-code/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        if (data.connected) {
          alert('✅ WhatsApp já está conectado!');
        } else {
          setQrCode(data.qr_code);
          setShowQR(true);
        }
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      alert('Erro ao obter QR Code');
    } finally {
      setLoading(false);
    }
  };

  const reconectar = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backend_url}/whatsapp/restart/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        alert('✅ WhatsApp reconectado!');
        await verificarStatus();
      } else {
        alert(`❌ Erro: ${data.error}`);
      }
    } catch (error) {
      alert('Erro ao reconectar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verificarStatus();
  }, []);

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h2>📱 Configuração WhatsApp</h2>
          <p className="text-muted">Gerencie a conexão WhatsApp da sua empresa</p>
        </Col>
      </Row>

      {/* Status Atual */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Header>
              <h5>📊 Status da Conexão</h5>
            </Card.Header>
            <Card.Body>
              {status ? (
                <div>
                  <Row>
                    <Col md={6}>
                      <p><strong>Instância:</strong> {status.instance_name}</p>
                      <p><strong>Status:</strong> 
                        <Badge bg={status.connected ? 'success' : 'danger'} className="ms-2">
                          {status.connected ? 'Conectado' : 'Desconectado'}
                        </Badge>
                      </p>
                    </Col>
                    <Col md={6}>
                      <p><strong>API URL:</strong> {status.api_url}</p>
                      <p><strong>Última verificação:</strong> {new Date().toLocaleTimeString()}</p>
                    </Col>
                  </Row>
                  
                  <Alert variant={status.connected ? 'success' : 'warning'}>
                    {status.connected ? 
                      '✅ WhatsApp conectado e funcionando normalmente!' : 
                      '⚠️ WhatsApp desconectado. Use as opções abaixo para conectar.'
                    }
                  </Alert>
                </div>
              ) : (
                <div className="text-center">Carregando status...</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Ações */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">🔄 Atualizar Status</h6>
            </Card.Header>
            <Card.Body className="text-center">
              <p>Verificar status atual da conexão</p>
              <Button variant="primary" onClick={verificarStatus} disabled={loading}>
                {loading ? 'Verificando...' : '🔍 Verificar Status'}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100">
            <Card.Header className="bg-success text-white">
              <h6 className="mb-0">📱 Conectar WhatsApp</h6>
            </Card.Header>
            <Card.Body className="text-center">
              <p>Gerar QR Code para conectar</p>
              <Button variant="success" onClick={obterQRCode} disabled={loading}>
                {loading ? 'Gerando...' : '📱 Gerar QR Code'}
              </Button>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="h-100">
            <Card.Header className="bg-warning text-dark">
              <h6 className="mb-0">🔄 Reconectar</h6>
            </Card.Header>
            <Card.Body className="text-center">
              <p>Reiniciar conexão WhatsApp</p>
              <Button variant="warning" onClick={reconectar} disabled={loading}>
                {loading ? 'Reconectando...' : '🔄 Reconectar'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal QR Code */}
      {showQR && qrCode && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📱 Conectar WhatsApp</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowQR(false)}
                ></button>
              </div>
              <div className="modal-body text-center">
                <img src={qrCode} alt="QR Code WhatsApp" className="img-fluid mb-3" />
                <p><strong>Como conectar:</strong></p>
                <ol className="text-start">
                  <li>Abra o WhatsApp no celular da empresa</li>
                  <li>Toque em "Mais opções" (⋮) → "WhatsApp Web"</li>
                  <li>Aponte a câmera para este código</li>
                  <li>Aguarde a confirmação de conexão</li>
                </ol>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setShowQR(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instruções */}
      <Row>
        <Col>
          <Alert variant="info">
            <h6>💡 Dicas importantes:</h6>
            <ul className="mb-0">
              <li>Use o celular oficial da empresa para conectar</li>
              <li>Mantenha o celular sempre conectado à internet</li>
              <li>Se desconectar, use "Reconectar" antes de gerar novo QR Code</li>
              <li>Em caso de problemas, acesse as <strong>Configurações do Sistema</strong> primeiro</li>
            </ul>
          </Alert>
        </Col>
      </Row>
    </Container>
  );
};

export default ConfiguracaoWhatsApp;