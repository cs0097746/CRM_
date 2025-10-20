import React, { useState } from "react";
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import axios from "axios";
import backend_url, { CLIENT_ID, CLIENT_SECRET } from "../config/env.ts";
import { logout } from "../function/validateToken.tsx";

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("username", username);
    params.append("password", password);
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);

    try {
      const res = await axios.post(`${backend_url}o/token/`, params);
      const { access_token, refresh_token, is_chefe } = res.data;

      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("access_token_time", String(Date.now()));
      localStorage.setItem("user", JSON.stringify({ username }));
      localStorage.setItem("is_chefe", is_chefe);

      console.log("✅ Login realizado com sucesso!");
      setSuccess("Login realizado com sucesso!");
      setTimeout(() => onLoginSuccess(), 1000);
    } catch (err: any) {
      console.error("❌ Erro no login:", err);
      setError("Usuário ou senha incorretos, ou falha no servidor.");
      logout();
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${backend_url}auth/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          email,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess("✅ Usuário registrado com sucesso! Faça login.");
        setIsRegisterMode(false);
        setUsername("");
        setPassword("");
        setEmail("");
      } else {
        setError(data.message || "Erro ao registrar usuário");
      }
    } catch (err) {
      console.error("💥 Erro ao registrar usuário:", err);
      setError("Erro ao registrar usuário");
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
              {error && <Alert variant="danger" className="mb-3">❌ {error}</Alert>}
              {success && <Alert variant="success" className="mb-3">{success}</Alert>}

              <Form onSubmit={isRegisterMode ? handleRegister : handleLogin}>
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

                {isRegisterMode && (
                  <Form.Group className="mb-3">
                    <Form.Label>📧 Email</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Digite seu email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </Form.Group>
                )}

                <div className="d-grid gap-2">
                  <Button variant="primary" type="submit" disabled={loading} size="lg">
                    {loading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" className="me-2" />
                        {isRegisterMode ? "Registrando..." : "Entrando..."}
                      </>
                    ) : (
                      isRegisterMode ? "📝 Registrar" : "🔑 Entrar"
                    )}
                  </Button>

                  <Button
                    variant="outline-secondary"
                    onClick={() => setIsRegisterMode(!isRegisterMode)}
                    disabled={loading}
                  >
                    {isRegisterMode ? "🔙 Voltar para Login" : "📝 Registrar-se"}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}