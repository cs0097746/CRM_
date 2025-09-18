import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import backend_url from "../config/env.ts";

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(backend_url + 'auth/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('📡 Status login:', response.status);
      const data = await response.json();
      console.log('📦 Data login:', data);

      if (response.ok && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
          id: data.user_id,
          username: data.username
        }));
        
        console.log('✅ Token salvo:', data.token);
        setSuccess('Login realizado com sucesso!');
        
        setTimeout(() => {
          onLoginSuccess();
        }, 1000);
      } else {
        setError(data.error || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('💥 Erro no login:', error);
      setError('Erro de conexão com servidor');
    } finally {
      setLoading(false);
    }
  };

  const criarUsuarioTeste = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(backend_url+'auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'testuser',
          password: 'test123',
          email: 'test@test.com'
        }),
      });

      const data = await response.json();
      console.log('📦 Usuário criado:', data);
      
      if (data.success) {
        setUsername('testuser');
        setPassword('test123');
        setSuccess('✅ Usuário teste criado! Use: testuser / test123');
      } else {
        setError(data.message || 'Erro ao criar usuário');
      }
    } catch (error) {
      console.error('💥 Erro ao criar usuário:', error);
      setError('Erro ao criar usuário teste');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="w-100 justify-content-center">
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card className="shadow">
            <Card.Header className="text-center bg-primary text-white">
              <h3 className="mb-0">🚀 Loomie CRM</h3>
              <small>Sistema de Atendimento WhatsApp</small>
            </Card.Header>
            
            <Card.Body className="p-4">
              {error && (
                <Alert variant="danger" className="mb-3">
                  ❌ {error}
                </Alert>
              )}
              
              {success && (
                <Alert variant="success" className="mb-3">
                  {success}
                </Alert>
              )}

              <Form onSubmit={handleLogin}>
                <Form.Group className="mb-3">
                  <Form.Label>👤 Usuário</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>🔐 Senha</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <div className="d-grid gap-2">
                  <Button 
                    variant="primary" 
                    type="submit" 
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          className="me-2"
                        />
                        Entrando...
                      </>
                    ) : (
                      '🔑 Entrar'
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline-secondary" 
                    onClick={criarUsuarioTeste}
                    disabled={loading}
                  >
                    👤 Criar Usuário Teste
                  </Button>
                </div>
              </Form>
              
              <div className="text-center mt-3">
                <small className="text-muted">
                  💡 Primeiro clique em "Criar Usuário Teste"<br/>
                  Depois use: <strong>testuser</strong> / <strong>test123</strong>
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}