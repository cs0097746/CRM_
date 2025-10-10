import { useState, useEffect, useCallback } from 'react';
import { Alert, Spinner, Button, Modal, Form } from 'react-bootstrap';
import axios from 'axios';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";

const api = axios.create({ baseURL:`${backend_url}` });

interface Contato {
  id: number;
  nome: string;
  telefone: string;
  email: string | null;
  criado_em: string;
  empresa: string | null;
  cargo: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  data_nascimento: string | null;
  observacoes: string | null;
}

const styles = `
    .professional-layout {
      height: 100vh;
      overflow: hidden;
      background: #f8f9fa;
      display: flex;
      flex-direction: column;
    }

    .top-bar {
      background: #ffffff;
      border-bottom: 1px solid #e1e5e9;
      padding: 12px 20px;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 30px;
    }

    .card-list {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      overflow: hidden;
    }
    
    .list-header {
        padding: 20px;
        border-bottom: 1px solid #e1e5e9;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8f9fa;
    }
    
    .list-header-controls {
        display: flex;
        gap: 15px;
        align-items: center;
    }


    .contact-item {
      border-bottom: 1px solid #f0f2f5;
      padding: 15px 20px;
      transition: background 0.2s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .contact-item:last-child {
        border-bottom: none;
    }

    .contact-item:hover {
      background: #f8f9fa;
    }
    
    .contact-details {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-grow: 1;
    }

    .contact-info strong {
        font-weight: 600;
        font-size: 15px;
        color: #1d2129;
    }

    .contact-info small {
        display: block;
        color: #65676b;
        font-size: 13px;
        margin-top: 2px;
    }

    .contact-actions {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-shrink: 0;
    }

    .contact-actions small {
        color: #8a8d91; 
        font-size: 11px;
    }
    
    .remove-btn {
        margin-left: 10px;
    }

    .search-input {
      border: 1px solid #e1e5e9;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 14px;
      transition: border-color 0.2s ease;
      width: 250px;
      font-family: inherit;
    }

    .search-input:focus {
      outline: none;
      border-color: #1877f2;
      box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.1);
    }
`;

interface CreateContactModalProps {
    show: boolean;
    onHide: () => void;
    onContactCreated: (newContact: Contato) => void;
}

function CreateContactModal({ show, onHide, onContactCreated }: CreateContactModalProps) {
    const [formData, setFormData] = useState({
        nome: '',
        telefone: '',
        email: '',
        empresa: '',
        cargo: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        data_nascimento: '',
        observacoes: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!formData.nome || !formData.telefone) {
            setError('Nome e Telefone são campos obrigatórios.');
            setLoading(false);
            return;
        }

        try {
            const token = await getToken();
            if (!token) throw new Error("Autenticação falhou.");

            const payload = {
                nome: formData.nome,
                telefone: formData.telefone,
                email: formData.email || null,
                empresa: formData.empresa || null,
                cargo: formData.cargo || null,
                endereco: formData.endereco || null,
                cidade: formData.cidade || null,
                estado: formData.estado || null,
                cep: formData.cep || null,
                data_nascimento: formData.data_nascimento || null,
                observacoes: formData.observacoes || null,
            };

            const response = await api.post<Contato>('contatos/', payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            onContactCreated(response.data);
            handleHide();
            alert(`Contato "${response.data.nome}" criado com sucesso! 🎉`);

        } catch (err) {
            const errorMessage = axios.isAxiosError(err) && err.response?.data?.detail
                ? err.response.data.detail
                : 'Não foi possível criar o contato. Verifique os dados e a conexão com a API.';
            setError(errorMessage);
            console.error('Erro ao criar contato:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleHide = () => {
        setFormData({
            nome: '', telefone: '', email: '', empresa: '', cargo: '', endereco: '',
            cidade: '', estado: '', cep: '', data_nascimento: '', observacoes: '',
        });
        setError(null);
        setLoading(false);
        onHide();
    }


    return (
        <Modal show={show} onHide={handleHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title style={{ fontSize: '1.25rem', fontWeight: 600 }}>Criar Novo Contato</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}

                    <div className="row">
                        <Form.Group className="mb-3 col-md-6" controlId="formContactName">
                            <Form.Label style={{ fontWeight: 500 }}>Nome Completo <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nome do Cliente/Contato"
                                name="nome"
                                value={formData.nome}
                                onChange={handleChange}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3 col-md-6" controlId="formContactPhone">
                            <Form.Label style={{ fontWeight: 500 }}>Telefone <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="(99) 99999-9999"
                                name="telefone"
                                value={formData.telefone}
                                onChange={handleChange}
                                required
                            />
                        </Form.Group>
                    </div>

                    <div className="row">
                        <Form.Group className="mb-3 col-md-6" controlId="formContactEmail">
                            <Form.Label style={{ fontWeight: 500 }}>E-mail</Form.Label>
                            <Form.Control
                                type="email"
                                placeholder="email@exemplo.com"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3 col-md-6" controlId="formContactBirthDate">
                            <Form.Label style={{ fontWeight: 500 }}>Data de Nascimento</Form.Label>
                            <Form.Control
                                type="date"
                                name="data_nascimento"
                                value={formData.data_nascimento}
                                onChange={handleChange}
                            />
                        </Form.Group>
                    </div>

                    <div className="row">
                        <Form.Group className="mb-3 col-md-6" controlId="formContactCompany">
                            <Form.Label style={{ fontWeight: 500 }}>Empresa</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nome da empresa"
                                name="empresa"
                                value={formData.empresa}
                                onChange={handleChange}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3 col-md-6" controlId="formContactPosition">
                            <Form.Label style={{ fontWeight: 500 }}>Cargo</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Ex: Gerente, Vendedor"
                                name="cargo"
                                value={formData.cargo}
                                onChange={handleChange}
                            />
                        </Form.Group>
                    </div>

                    <Form.Group className="mb-3" controlId="formContactAddress">
                        <Form.Label style={{ fontWeight: 500 }}>Endereço</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            placeholder="Rua, número, complemento..."
                            name="endereco"
                            value={formData.endereco}
                            onChange={handleChange}
                        />
                    </Form.Group>

                    <div className="row">
                        <Form.Group className="mb-3 col-md-6" controlId="formContactCity">
                            <Form.Label style={{ fontWeight: 500 }}>Cidade</Form.Label>
                            <Form.Control
                                type="text"
                                name="cidade"
                                value={formData.cidade}
                                onChange={handleChange}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3 col-md-3" controlId="formContactState">
                            <Form.Label style={{ fontWeight: 500 }}>Estado</Form.Label>
                            <Form.Control
                                type="text"
                                name="estado"
                                placeholder="Ex: SP, RJ"
                                value={formData.estado}
                                onChange={handleChange}
                                maxLength={2}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3 col-md-3" controlId="formContactZip">
                            <Form.Label style={{ fontWeight: 500 }}>CEP</Form.Label>
                            <Form.Control
                                type="text"
                                name="cep"
                                value={formData.cep}
                                onChange={handleChange}
                            />
                        </Form.Group>
                    </div>

                    <Form.Group className="mb-3" controlId="formContactNotes">
                        <Form.Label style={{ fontWeight: 500 }}>Observações</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Notas importantes sobre o contato, preferências, etc."
                            name="observacoes"
                            value={formData.observacoes}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleHide} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button variant="success" type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                <span className="ms-2">Salvando...</span>
                            </>
                        ) : (
                            'Salvar Contato'
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

export default function Contatos() {
    const [contatos, setContatos] = useState<Contato[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [deleteStatus, setDeleteStatus] = useState<{ id: number; loading: boolean } | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const fetchContatos = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = await getToken();
            if (!token) throw new Error("Autenticação falhou.");

            const response = await api.get<{ results: Contato[] }>('contatos/', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setContatos(response.data.results);

        } catch (err) {
            setError('Não foi possível carregar a lista de contatos.');
            console.error('Erro ao buscar contatos:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContatos();
    }, [fetchContatos]);

    const removeContato = async (id: number) => {
        if (!window.confirm("Tem certeza que deseja remover este contato?")) {
            return;
        }

        setDeleteStatus({ id, loading: true });

        try {
            const token = await getToken();
            if (!token) throw new Error("Autenticação falhou.");

            await api.delete(`contatos/${id}/`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setContatos(contatos.filter(c => c.id !== id));
            alert("Contato removido com sucesso! 🗑️");

        } catch (err) {
            setError('Não foi possível remover o contato.');
            console.error('Erro ao remover contato:', err);
        } finally {
            setDeleteStatus(null);
        }
    };

    const handleContactCreated = (newContact: Contato) => {
        setContatos([newContact, ...contatos]);
    };

    const contatosFiltrados = contatos.filter(contato => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();

        const nomeMatch = contato.nome.toLowerCase().includes(searchLower);

        const telefoneMatch = contato.telefone.includes(searchTerm);

        const emailMatch = contato.email && contato.email.toLowerCase().includes(searchLower);

        return nomeMatch || telefoneMatch || emailMatch;
    });

    return (
        <>
            <style>{styles}</style>

            <div className="professional-layout">
                <div className="top-bar">
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <img src="/Loomie.svg" alt="Logo" style={{ width: "28px", height: "28px" }} />
                            <div>
                                <h5 className="mb-0" style={{ fontWeight: 600, fontSize: '18px' }}>
                                    Lista de Contatos
                                </h5>
                                <small style={{ color: '#65676b' }}>Gerenciamento de Clientes</small>
                            </div>
                        </div>
                        <div className="d-flex gap-2">
                            <Button variant="outline-primary" href="/atendimento" size="sm">
                                Atendimento
                            </Button>
                            <Button variant="outline-success" href="/dashboard-atendimento" size="sm">
                                Dashboard
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="main-content">
                    <div className="card-list" style={{ maxWidth: '800px', margin: '0 auto' }}>

                        <div className="list-header">
                            <h5 className="mb-0" style={{ fontWeight: 600 }}>Contatos Cadastrados ({contatos.length})</h5>

                            <div className="list-header-controls">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Buscar por nome, tel ou e-mail..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                                    + Novo Contato
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <Alert variant="danger" className="m-3">
                                {error}
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => {
                                        setError(null);
                                        fetchContatos();
                                    }}
                                >
                                    Tentar novamente
                                </Button>
                            </Alert>
                        )}

                        {loading ? (
                            <div className="text-center p-5">
                                <Spinner animation="border" />
                                <div className="mt-2" style={{ fontSize: '14px', color: '#65676b' }}>
                                    Carregando contatos...
                                </div>
                            </div>
                        ) : (
                            <>
                                {contatosFiltrados.length === 0 ? (
                                    <div className="text-center p-5" style={{ color: '#8a8d91' }}>
                                        <div style={{ fontSize: '16px' }}>Nenhum contato encontrado</div>
                                        {searchTerm && (
                                            <small style={{ fontSize: '13px' }}>
                                                Nenhum resultado para "{searchTerm}".
                                            </small>
                                        )}
                                    </div>
                                ) : (
                                    contatosFiltrados.map((contato) => (
                                        <div key={contato.id} className="contact-item">
                                            <div className="contact-info">
                                                <strong>{contato.nome}</strong>
                                                <small>
                                                    Telefone: {contato.telefone}
                                                    {contato.email && ` | E-mail: ${contato.email}`}
                                                </small>
                                            </div>

                                            <div className="contact-actions">
                                                <small>
                                                    Criado em: {new Date(contato.criado_em).toLocaleDateString('pt-BR')}
                                                </small>

                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => removeContato(contato.id)}
                                                    disabled={deleteStatus?.loading && deleteStatus.id === contato.id}
                                                    className="remove-btn"
                                                >
                                                    {deleteStatus?.loading && deleteStatus.id === contato.id ? (
                                                        <Spinner
                                                            as="span"
                                                            animation="border"
                                                            size="sm"
                                                            role="status"
                                                            aria-hidden="true"
                                                        />
                                                    ) : 'Remover'}
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <CreateContactModal
                show={showCreateModal}
                onHide={() => setShowCreateModal(false)}
                onContactCreated={handleContactCreated}
            />
        </>
    );
}