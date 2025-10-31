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
    .contatos-container {
      min-height: 100vh;
      background: #f8f9fa;
      width: 100%;
    }

    .contatos-header {
      background-color: #316dbd;
      padding: 1.5rem 2rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .contatos-header-title {
      color: white;
      font-weight: 600;
      font-size: 1.5rem;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .contatos-header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .contatos-content {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .contatos-card {
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(49, 109, 189, 0.08);
      overflow: hidden;
      border: 1px solid #e1e8ed;
    }
    
    .contatos-card-header {
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid #e1e8ed;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: white;
    }
    
    .contatos-card-header-controls {
        display: flex;
        gap: 1rem;
        align-items: center;
    }


    .contato-item {
      border-bottom: 1px solid #e1e8ed;
      padding: 1rem 1.5rem;
      transition: all 0.2s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .contato-item:last-child {
        border-bottom: none;
    }

    .contato-item:hover {
      background: #f8f9fa;
    }

    .contato-info {
        flex: 1;
    }

    .contato-info strong {
        font-weight: 600;
        font-size: 15px;
        color: #316dbd;
        display: block;
        margin-bottom: 0.25rem;
    }

    .contato-info small {
        display: block;
        color: #6c757d;
        font-size: 13px;
    }

    .contato-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-shrink: 0;
    }

    .contato-actions small {
        color: #6c757d; 
        font-size: 12px;
        min-width: 100px;
        text-align: right;
    }

    .search-input {
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 0.5rem 0.75rem;
      font-size: 14px;
      transition: all 0.2s ease;
      width: 250px;
    }

    .search-input:focus {
      outline: none;
      border-color: #316dbd;
      box-shadow: 0 0 0 0.2rem rgba(49, 109, 189, 0.1);
    }

    .btn-create-contact {
        background-color: #7ed957;
        border: none;
        color: white;
        font-weight: 600;
        border-radius: 6px;
        padding: 0.5rem 1.25rem;
        transition: all 0.2s ease;
    }

    .btn-create-contact:hover {
        background-color: #6bc542;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(126, 217, 87, 0.25);
    }

    .btn-header-action {
        background-color: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.4);
        color: white;
        font-weight: 500;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        transition: all 0.2s ease;
        text-decoration: none;
        display: inline-block;
    }

    .btn-header-action:hover {
        background-color: white;
        color: #316dbd;
        border-color: white;
    }

    /* Estilos do Modal */
    .modal-content {
        border: none;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }

    .modal-header .btn-close {
        filter: brightness(0) invert(1);
    }

    .modal-body {
        padding: 1.5rem;
    }

    .form-label {
        font-weight: 500;
        color: #495057;
        margin-bottom: 0.5rem;
    }

    .form-control {
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 0.65rem;
        transition: all 0.2s ease;
    }

    .form-control:focus {
        border-color: #316dbd;
        box-shadow: 0 0 0 0.2rem rgba(49, 109, 189, 0.1);
    }

    /* Estado de loading */
    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 3rem;
    }

    .spinner-border {
        color: #316dbd !important;
    }

    /* Mensagem vazia */
    .empty-state {
        text-align: center;
        padding: 3rem;
        color: #6c757d;
    }

    .empty-state-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }
`;

const initialFormData = {
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
};

interface ContactFormModalProps {
    show: boolean;
    onHide: () => void;
    contactId: number | null;
    onContactSuccess: (contact: Contato, isNew: boolean) => void;
}

// Funções de validação
const validateEmail = (email: string): { valid: boolean; message: string } => {
    if (!email || !email.trim()) {
        return { valid: true, message: '' }; // Email é opcional
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
        return { 
            valid: false, 
            message: '❌ Email inválido. Use o formato: usuario@dominio.com' 
        };
    }
    
    return { valid: true, message: '✓ Email válido' };
};

const validateTelefone = (telefone: string): { valid: boolean; message: string } => {
    if (!telefone || !telefone.trim()) {
        return { valid: false, message: '❌ Telefone é obrigatório' };
    }
    
    // Remove tudo que não é número
    const apenasNumeros = telefone.replace(/\D/g, '');
    
    // Remove código do país se houver
    let numero = apenasNumeros;
    if (numero.startsWith('55') && numero.length > 11) {
        numero = numero.substring(2);
    }
    
    // Valida quantidade de dígitos
    if (numero.length < 10 || numero.length > 11) {
        return { 
            valid: false, 
            message: '❌ Telefone deve ter 10 ou 11 dígitos. Ex: (11) 98765-4321' 
        };
    }
    
    // Valida DDD
    const ddd = parseInt(numero.substring(0, 2));
    if (ddd < 11 || ddd > 99) {
        return { 
            valid: false, 
            message: '❌ DDD inválido. Use um código de área válido (11-99)' 
        };
    }
    
    // Valida celular (se tiver 11 dígitos, o terceiro deve ser 9)
    if (numero.length === 11 && numero[2] !== '9') {
        return { 
            valid: false, 
            message: '❌ Celular deve começar com 9. Ex: (11) 98765-4321' 
        };
    }
    
    return { valid: true, message: '✓ Telefone válido' };
};

function ContactFormModal({ show, onHide, contactId, onContactSuccess }: ContactFormModalProps) {
    const isEditMode = contactId !== null;
    const [formData, setFormData] = useState<typeof initialFormData>(initialFormData);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEditMode);
    const [error, setError] = useState<string | null>(null);
    const [emailValidation, setEmailValidation] = useState<{ valid: boolean; message: string } | null>(null);
    const [telefoneValidation, setTelefoneValidation] = useState<{ valid: boolean; message: string } | null>(null);

    const fetchContactData = useCallback(async (id: number) => {
        setFetching(true);
        setError(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("Autenticação falhou.");

            const response = await api.get<Contato>(`contatos/${id}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const contactData = response.data;
            setFormData({
                nome: contactData.nome,
                telefone: contactData.telefone,
                email: contactData.email || '',
                empresa: contactData.empresa || '',
                cargo: contactData.cargo || '',
                endereco: contactData.endereco || '',
                cidade: contactData.cidade || '',
                estado: contactData.estado || '',
                cep: contactData.cep || '',
                data_nascimento: contactData.data_nascimento ? contactData.data_nascimento.split('T')[0] : '',
                observacoes: contactData.observacoes || '',
            });

        } catch (err) {
            const errorMessage = axios.isAxiosError(err) && err.response?.data?.detail
                ? err.response.data.detail
                : 'Não foi possível carregar os dados para edição.';
            setError(errorMessage);
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        if (show) {
            if (isEditMode && contactId) {
                fetchContactData(contactId);
            } else {
                setFormData(initialFormData);
                setFetching(false);
            }
        }
    }, [show, contactId, isEditMode, fetchContactData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        setFormData({
            ...formData,
            [name]: value,
        });
        
        // Validação em tempo real
        if (name === 'email') {
            setEmailValidation(validateEmail(value));
        } else if (name === 'telefone') {
            setTelefoneValidation(validateTelefone(value));
        }
        
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validações antes de submeter
        if (!formData.nome || !formData.telefone) {
            setError('❌ Nome e Telefone são campos obrigatórios.');
            setLoading(false);
            return;
        }

        const telefoneCheck = validateTelefone(formData.telefone);
        if (!telefoneCheck.valid) {
            setError(telefoneCheck.message);
            setTelefoneValidation(telefoneCheck);
            setLoading(false);
            return;
        }

        if (formData.email && formData.email.trim()) {
            const emailCheck = validateEmail(formData.email);
            if (!emailCheck.valid) {
                setError(emailCheck.message);
                setEmailValidation(emailCheck);
                setLoading(false);
                return;
            }
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

            let response;
            if (isEditMode && contactId) {
                response = await api.put<Contato>(`contatos/${contactId}/`, payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } else {
                response = await api.post<Contato>('contatos/', payload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            onContactSuccess(response.data, !isEditMode);
            handleHide();
            alert(`Contato "${response.data.nome}" ${isEditMode ? 'atualizado' : 'criado'} com sucesso! ${isEditMode ? '✏️' : '🎉'}`);

        } catch (err) {
            const defaultMessage = isEditMode ? 'Não foi possível atualizar o contato.' : 'Não foi possível criar o contato.';
            let errorMessage = defaultMessage + ' Verifique os dados e a conexão com a API.';

            if (axios.isAxiosError(err) && err.response) {
                const errorData = err.response.data;

                if (Array.isArray(errorData) && errorData.length > 0 && typeof errorData[0] === 'string') {
                    errorMessage = errorData[0];
                }
                else if (errorData.detail) {
                    errorMessage = errorData.detail;
                }
                else if (errorData.non_field_errors && errorData.non_field_errors.length > 0) {
                    errorMessage = errorData.non_field_errors[0];
                }
            }

            setError(errorMessage);
            console.error(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} contato:`, err);
        } finally {
            setLoading(false);
        }
    };

    const handleHide = () => {
        setFormData(initialFormData);
        setError(null);
        setLoading(false);
        setFetching(isEditMode);
        onHide();
    }

    const modalTitle = isEditMode ? '✏️ Editar Contato' : '➕ Criar Novo Contato';
    const submitText = isEditMode ? 'Salvar Alterações' : 'Salvar Contato';


    return (
        <Modal show={show} onHide={handleHide} centered size="lg">
            <Modal.Header closeButton style={{ backgroundColor: '#316dbd', color: 'white', borderBottom: 'none' }}>
                <Modal.Title style={{ fontSize: '1.1rem', fontWeight: 600 }}>{modalTitle}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                {fetching && isEditMode ? (
                    <div className="loading-container">
                        <Spinner animation="border" />
                        <div className="mt-3" style={{ fontSize: '14px', color: '#6c757d' }}>
                            Carregando dados do contato...
                        </div>
                    </div>
                ) : (
                    <>
                        <Modal.Body>
                            {error && <Alert variant="danger">{error}</Alert>}

                            <div className="row">
                                <Form.Group className="mb-3 col-md-6" controlId="formContactName">
                                    <Form.Label style={{ fontWeight: 500 }}>Nome Completo <span className="text-danger">*</span></Form.Label>
                                    <Form.Control type="text" placeholder="Nome do Cliente/Contato" name="nome" value={formData.nome} onChange={handleChange} required/>
                                </Form.Group>
                                <Form.Group className="mb-3 col-md-6" controlId="formContactPhone">
                                    <Form.Label style={{ fontWeight: 500 }}>Telefone <span className="text-danger">*</span></Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="(11) 98765-4321" 
                                        name="telefone" 
                                        value={formData.telefone} 
                                        onChange={handleChange} 
                                        required
                                        isInvalid={telefoneValidation ? !telefoneValidation.valid : false}
                                        isValid={telefoneValidation ? telefoneValidation.valid && formData.telefone.length > 0 : false}
                                    />
                                    {telefoneValidation && (
                                        <Form.Control.Feedback type={telefoneValidation.valid ? 'valid' : 'invalid'}>
                                            {telefoneValidation.message}
                                        </Form.Control.Feedback>
                                    )}
                                </Form.Group>
                            </div>
                            <div className="row">
                                <Form.Group className="mb-3 col-md-6" controlId="formContactEmail">
                                    <Form.Label style={{ fontWeight: 500 }}>E-mail</Form.Label>
                                    <Form.Control 
                                        type="email" 
                                        placeholder="usuario@dominio.com" 
                                        name="email" 
                                        value={formData.email || ''} 
                                        onChange={handleChange}
                                        isInvalid={emailValidation ? !emailValidation.valid : false}
                                        isValid={emailValidation ? emailValidation.valid && formData.email && formData.email.length > 0 : false}
                                    />
                                    {emailValidation && emailValidation.message && (
                                        <Form.Control.Feedback type={emailValidation.valid ? 'valid' : 'invalid'}>
                                            {emailValidation.message}
                                        </Form.Control.Feedback>
                                    )}
                                </Form.Group>
                                <Form.Group className="mb-3 col-md-6" controlId="formContactBirthDate">
                                    <Form.Label style={{ fontWeight: 500 }}>Data de Nascimento</Form.Label>
                                    <Form.Control type="date" name="data_nascimento" value={formData.data_nascimento || ''} onChange={handleChange}/>
                                </Form.Group>
                            </div>
                            <div className="row">
                                <Form.Group className="mb-3 col-md-6" controlId="formContactCompany">
                                    <Form.Label style={{ fontWeight: 500 }}>Empresa</Form.Label>
                                    <Form.Control type="text" placeholder="Nome da empresa" name="empresa" value={formData.empresa || ''} onChange={handleChange}/>
                                </Form.Group>
                                <Form.Group className="mb-3 col-md-6" controlId="formContactPosition">
                                    <Form.Label style={{ fontWeight: 500 }}>Cargo</Form.Label>
                                    <Form.Control type="text" placeholder="Ex: Gerente, Vendedor" name="cargo" value={formData.cargo || ''} onChange={handleChange}/>
                                </Form.Group>
                            </div>
                            <Form.Group className="mb-3" controlId="formContactAddress">
                                <Form.Label style={{ fontWeight: 500 }}>Endereço</Form.Label>
                                <Form.Control as="textarea" rows={2} placeholder="Rua, número, complemento..." name="endereco" value={formData.endereco || ''} onChange={handleChange}/>
                            </Form.Group>
                            <div className="row">
                                <Form.Group className="mb-3 col-md-6" controlId="formContactCity">
                                    <Form.Label style={{ fontWeight: 500 }}>Cidade</Form.Label>
                                    <Form.Control type="text" name="cidade" value={formData.cidade || ''} onChange={handleChange}/>
                                </Form.Group>
                                <Form.Group className="mb-3 col-md-3" controlId="formContactState">
                                    <Form.Label style={{ fontWeight: 500 }}>Estado</Form.Label>
                                    <Form.Control type="text" name="estado" placeholder="Ex: SP, RJ" value={formData.estado || ''} onChange={handleChange} maxLength={2}/>
                                </Form.Group>
                                <Form.Group className="mb-3 col-md-3" controlId="formContactZip">
                                    <Form.Label style={{ fontWeight: 500 }}>CEP</Form.Label>
                                    <Form.Control type="text" name="cep" value={formData.cep || ''} onChange={handleChange}/>
                                </Form.Group>
                            </div>
                            <Form.Group className="mb-3" controlId="formContactNotes">
                                <Form.Label style={{ fontWeight: 500 }}>Observações</Form.Label>
                                <Form.Control as="textarea" rows={3} placeholder="Notas importantes sobre o contato, preferências, etc." name="observacoes" value={formData.observacoes || ''} onChange={handleChange}/>
                            </Form.Group>

                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={handleHide} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={loading}
                                style={{
                                    backgroundColor: isEditMode ? '#316dbd' : '#7ed957',
                                    border: 'none',
                                    color: 'white',
                                    fontWeight: 600
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                        <span className="ms-2">Salvando...</span>
                                    </>
                                ) : (
                                    submitText
                                )}
                            </Button>
                        </Modal.Footer>
                    </>
                )}
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

    const [showContactModal, setShowContactModal] = useState(false);
    const [contactToEditId, setContactToEditId] = useState<number | null>(null);

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

    const handleContactSuccess = (contact: Contato, isNew: boolean) => {
        if (isNew) {
            setContatos([contact, ...contatos]);
        } else {
            setContatos(contatos.map(c =>
                c.id === contact.id ? contact : c
            ));
        }
    };

    const openCreateModal = () => {
        setContactToEditId(null);
        setShowContactModal(true);
    };

    const openEditModal = (id: number) => {
        setContactToEditId(id);
        setShowContactModal(true);
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

            <div className="contatos-container">
                <div className="contatos-header">
                    <div className="d-flex justify-content-between align-items-center">
                        <h1 className="contatos-header-title">
                            👥 Gestão de Contatos
                        </h1>
                        <div className="contatos-header-actions">
                            <a href="/atendimento" className="btn-header-action">
                                Atendimento
                            </a>
                            <a href="/dashboard-atendimento" className="btn-header-action">
                                Dashboard
                            </a>
                        </div>
                    </div>
                </div>

                <div className="contatos-content">
                    <div className="contatos-card">

                        <div className="contatos-card-header">
                            <h5 className="mb-0" style={{ fontWeight: 600, color: '#316dbd' }}>
                                📋 Contatos Cadastrados ({contatos.length})
                            </h5>

                            <div className="contatos-card-header-controls">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="🔍 Buscar contato..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button className="btn-create-contact" onClick={openCreateModal}>
                                    + Novo Contato
                                </button>
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
                            <div className="loading-container">
                                <Spinner animation="border" />
                                <div className="mt-3" style={{ fontSize: '14px', color: '#6c757d' }}>
                                    Carregando contatos...
                                </div>
                            </div>
                        ) : (
                            <>
                                {contatosFiltrados.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">
                                            {searchTerm ? '🔍' : '👥'}
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: 500 }}>
                                            {searchTerm ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
                                        </div>
                                        {searchTerm && (
                                            <small style={{ fontSize: '13px', display: 'block', marginTop: '0.5rem' }}>
                                                Nenhum resultado para "{searchTerm}"
                                            </small>
                                        )}
                                        {!searchTerm && (
                                            <small style={{ fontSize: '13px', display: 'block', marginTop: '0.5rem' }}>
                                                Clique em "Novo Contato" para começar
                                            </small>
                                        )}
                                    </div>
                                ) : (
                                    contatosFiltrados.map((contato) => (
                                        <div key={contato.id} className="contato-item">
                                            <div className="contato-info">
                                                <strong>{contato.nome}</strong>
                                                <small>
                                                    📞 {contato.telefone}
                                                    {contato.email && ` • 📧 ${contato.email}`}
                                                </small>
                                            </div>

                                            <div className="contato-actions">
                                                <small>
                                                    {new Date(contato.criado_em).toLocaleDateString('pt-BR')}
                                                </small>

                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => openEditModal(contato.id)}
                                                    style={{ borderColor: '#316dbd', color: '#316dbd' }}
                                                >
                                                    ✏️ Editar
                                                </Button>

                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => removeContato(contato.id)}
                                                    disabled={deleteStatus?.loading && deleteStatus.id === contato.id}
                                                >
                                                    {deleteStatus?.loading && deleteStatus.id === contato.id ? (
                                                        <Spinner
                                                            as="span"
                                                            animation="border"
                                                            size="sm"
                                                            role="status"
                                                            aria-hidden="true"
                                                        />
                                                    ) : '🗑️'}
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

            <ContactFormModal
                show={showContactModal}
                onHide={() => {
                    setShowContactModal(false);
                    setContactToEditId(null);
                }}
                contactId={contactToEditId}
                onContactSuccess={handleContactSuccess}
            />
        </>
    );
}