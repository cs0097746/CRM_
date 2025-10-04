import { useState, useEffect, useCallback } from 'react';
import { Alert, Spinner, Button  } from 'react-bootstrap';
import axios from 'axios';
import backend_url from "../config/env.ts";

// Reutilizando a configuração da API e autenticação
const api = axios.create({ baseURL:`${backend_url}` });

const USERNAME = "admin";
const PASSWORD = "admin";
const CLIENT_ID = "KpkNSgZswIS1axx3fwpzNqvGKSkf6udZ9QoD3Ulz";
const CLIENT_SECRET = "q828o8DwBwuM1d9XMNZ2KxLQvCmzJgvRnb0I1TMe0QwyVPNB7yA1HRyie45oubSQbKucq6YR3Gyo9ShlN1L0VsnEgKlekMCdlKRkEK4x1760kzgPbqG9mtzfMU4BjXvG";

interface Contato {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  criado_em: string;
}

const getToken = async () => {
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
        console.error("Erro ao obter token:", err);
    }
};

// CSS profissional - Adaptado do Atendimento.tsx para uma lista simples
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

    .contact-item {
      border-bottom: 1px solid #f0f2f5;
      padding: 15px 20px;
      cursor: pointer;
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


export default function Contatos() {
    const [contatos, setContatos] = useState<Contato[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');

    const fetchContatos = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = await getToken();
            if (!token) {
                setError("Não foi possível autenticar.");
                return;
            }

            // Assumindo que o endpoint para contatos seja 'contatos/'
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

    // Filtrar contatos
    const contatosFiltrados = contatos.filter(contato => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
            contato.nome.toLowerCase().includes(searchLower) ||
            contato.telefone.includes(searchTerm) ||
            contato.email.toLowerCase().includes(searchLower)
        );
    });

    return (
        <>
            <style>{styles}</style>

            <div className="professional-layout">
                {/* Barra superior - Replicada do Atendimento.tsx */}
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

                {/* Conteúdo principal */}
                <div className="main-content">
                    <div className="card-list" style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div className="list-header">
                            <h5 className="mb-0" style={{ fontWeight: 600 }}>Contatos Cadastrados ({contatos.length})</h5>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Buscar por nome, tel ou e-mail..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
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
                                            <div className="text-end">
                                                <small style={{ color: '#8a8d91', fontSize: '11px' }}>
                                                    Criado em: {new Date(contato.criado_em).toLocaleDateString('pt-BR')}
                                                </small>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// Lembre-se de criar o arquivo Contatos.tsx e incluí-lo no roteamento do seu aplicativo (ex: em App.tsx)