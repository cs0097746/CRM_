import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { User, Lock, Mail, ServerCrash, CheckCircle, Save, Type, Type as IconType, KeyRound, X, Check } from 'lucide-react';
import axios from 'axios';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";


const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+={}\[\]:;<>,.?/~\\-]).{8,}$/;

export default function CriarUsuarioView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const chefeUsername = JSON.parse(localStorage.getItem("user") || "{}").username || 'Chefe';

  const lengthRegex = /^.{8,}$/;
  const uppercaseRegex = /(?=.*[A-Z])/;
  const numberRegex = /(?=.*[0-9])/;
  const specialCharRegex = /(?=.*[!@#$%^&*()_+={}\[\]:;<>,.?/~\\-])/;

  const getPasswordValidationStatus = (pwd: string) => {
    const isLengthValid = lengthRegex.test(pwd);
    const hasUppercase = uppercaseRegex.test(pwd);
    const hasNumber = numberRegex.test(pwd);
    const hasSpecialChar = specialCharRegex.test(pwd);
    const isOverallValid = passwordRegex.test(pwd);

    return {
      isLengthValid,
      hasUppercase,
      hasNumber,
      hasSpecialChar,
      isOverallValid,
      errorMessage: isOverallValid ? null : "A senha não atende a todos os requisitos.",
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!username || !password || !confirmPassword || !email || !firstName || !lastName) {
      setError("Todos os campos (Usuário, Nome, Sobrenome, Senha, Confirmação de Senha, Email) são obrigatórios.");
      setLoading(false);
      return;
    }

    const validationStatus = getPasswordValidationStatus(password);
    if (!validationStatus.isOverallValid) {
      setError("⚠️ Erro na Senha: A senha deve ter no mínimo 8 caracteres, 1 maiúsculo, 1 número e 1 caractere especial.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("A Senha e a Confirmação de Senha não coincidem.");
      setLoading(false);
      return;
    }

    try {
    const token = await getToken();
    if (!token) {
      console.log("Autenticação falhou. Não foi possível salvar.");
      setError("Falha na autenticação. Por favor, faça login novamente.");
      setLoading(false);
      return;
    }

    const chefeUsername = JSON.parse(localStorage.getItem("user") || "{}").username;

      const response = await axios.post(
        `${backend_url}auth/register/subordinado/`,
        {
          username,
          password,
          email,
          first_name: firstName,
          last_name: lastName,
          chefe_username: chefeUsername,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = response.data;

      if (data.success) {
        setSuccess(`✅ Subordinado "${username}" (Nome: ${firstName} ${lastName}) criado com sucesso! User ID: ${data.user_id}`);
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setEmail('');
        setFirstName('');
        setLastName('');
      } else {
        setError(data.message || 'Erro desconhecido ao cadastrar subordinado.');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('💥 Erro na requisição:', err.response?.data || err.message);

        const errorResponse = err.response;

        if (errorResponse) {
            if (errorResponse.status === 400) {
                const errorData = errorResponse.data;
                let errorMessage = "Erro de validação nos dados fornecidos.";

                if (errorData.error && typeof errorData.error === 'string') {
                    const cleanMessage = errorData.error.replace(/Erro interno: \[ErrorDetail\(string='|', code='invalid'\)\]/g, '').trim();
                    errorMessage = cleanMessage;
                }
                else if (typeof errorData === 'string' && errorData) {
                    errorMessage = errorData;
                }
                else if (Array.isArray(errorData) && errorData.length > 0 && typeof errorData[0] === 'string') {
                    errorMessage = errorData[0];
                }
                else if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
                else if (Object.keys(errorData).length > 0) {
                    const firstKey = Object.keys(errorData)[0];
                    const firstError = errorData[firstKey];

                    if (Array.isArray(firstError) && firstError.length > 0) {
                        errorMessage = `Campo "${firstKey}": ${firstError[0]}`;
                    } else if (typeof firstError === 'string') {
                        errorMessage = `Campo "${firstKey}": ${firstError}`;
                    }
                }

                setError(errorMessage);
            }
            else if (errorResponse.status === 401) {
              setError("Não autorizado. Seu token expirou ou você não tem permissão.");
            } else {
              setError(`Erro do servidor (${errorResponse.status}). Tente novamente mais tarde.`);
            }
        } else {
            setError(`Erro de rede ou servidor: ${err.message}.`);
        }
      } else if (err instanceof Error) {
        console.error('💥 Erro genérico:', err);
        setError(`Erro: ${err.message}`);
      } else {
        console.error('💥 Erro desconhecida:', err);
        setError("Erro desconhecido.");
      }
    } finally {
      setLoading(false);
    }
  };

  const validationStatus = getPasswordValidationStatus(password);
  const isPasswordValid = validationStatus.isOverallValid;
  const passwordMatch = password === confirmPassword;

  const ChecklistItem = ({ isValid, children }: { isValid: boolean, children: React.ReactNode }) => (
    <div className={`d-flex align-items-center ${isValid ? 'text-success' : 'text-muted'}`} style={{ fontSize: '0.875em' }}>
      {isValid ? <Check size={14} className="me-2" /> : <X size={14} className="me-2" />}
      {children}
    </div>
  );


  return (
    <Container fluid className="d-flex align-items-center justify-content-center min-vh-100 bg-light p-4">
      <Row className="w-100 justify-content-center">
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card className="shadow-lg rounded-3">
            <Card.Header className="text-center bg-primary text-white p-4 rounded-top">
              <h3 className="mb-1 fw-bold d-flex align-items-center justify-content-center">
                <Save className="me-2" size={24} />
                Cadastro de Subordinado
              </h3>
              <small className="text-white-50">
                Criado por {chefeUsername}
              </small>
            </Card.Header>

            <Card.Body className="p-4">
              {error && (
                <Alert variant="danger" className="d-flex align-items-center mb-3">
                  <ServerCrash size={20} className="me-2" />
                  <span className="fw-medium">Erro:</span> {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" className="d-flex align-items-center mb-3">
                  <CheckCircle size={20} className="me-2" />
                  <span className="fw-medium">Sucesso:</span> {success}
                </Alert>
              )}

              <Form onSubmit={handleSubmit} className="needs-validation">

                <Form.Group className="mb-3" controlId="formFirstName">
                  <Form.Label className="d-flex align-items-center">
                    <Type size={16} className="me-2" /> Primeiro Nome
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ex: João"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="formLastName">
                  <Form.Label className="d-flex align-items-center">
                    <IconType size={16} className="me-2" /> Sobrenome
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ex: da Silva"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="formUsername">
                  <Form.Label className="d-flex align-items-center">
                    <User size={16} className="me-2" /> Usuário
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Nome de usuário do subordinado"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="formPassword">
                  <Form.Label className="d-flex align-items-center">
                    <Lock size={16} className="me-2" /> Senha
                  </Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Defina a senha inicial"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    isInvalid={!!password && !isPasswordValid}
                    isValid={!!password && isPasswordValid}
                    required
                    disabled={loading}
                  />

                  <div className="mt-1">
                    <ChecklistItem isValid={validationStatus.isLengthValid}>
                      Mínimo de **8 caracteres**
                    </ChecklistItem>
                    <ChecklistItem isValid={validationStatus.hasUppercase}>
                      Pelo menos **1 letra maiúscula**
                    </ChecklistItem>
                    <ChecklistItem isValid={validationStatus.hasNumber}>
                      Pelo menos **1 número**
                    </ChecklistItem>
                    <ChecklistItem isValid={validationStatus.hasSpecialChar}>
                      Pelo menos **1 caractere especial**
                    </ChecklistItem>
                  </div>

                </Form.Group>

                <Form.Group className="mb-3" controlId="formConfirmPassword">
                  <Form.Label className="d-flex align-items-center">
                    <KeyRound size={16} className="me-2" /> Confirmar Senha
                  </Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    isInvalid={!!confirmPassword && password.length > 0 && !passwordMatch}
                    isValid={!!confirmPassword && password.length > 0 && passwordMatch}
                    required
                    disabled={loading}
                  />

                  <Form.Control.Feedback type="invalid">
                    As senhas não coincidem.
                  </Form.Control.Feedback>
                  <Form.Control.Feedback type="valid">
                    Senhas coincidem!
                  </Form.Control.Feedback>
                </Form.Group>


                <Form.Group className="mb-4" controlId="formEmail">
                  <Form.Label className="d-flex align-items-center">
                    <Mail size={16} className="me-2" /> Email
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Email do subordinado"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Button
                  variant="success"
                  type="submit"
                  disabled={loading || !isPasswordValid || !passwordMatch}
                  className="w-100 py-2 fw-bold d-flex justify-content-center align-items-center"
                >
                  {loading ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" className="me-2" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <span className="me-2">➕ Cadastrar Subordinado</span>
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}