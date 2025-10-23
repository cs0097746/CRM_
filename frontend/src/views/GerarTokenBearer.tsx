import React, { useState, useMemo } from 'react';
import backend_url from "../config/env.ts";
import {getToken} from "../function/validateToken.tsx";

type ExpirationOption = '1h' | '1y' | '10y';

const expirationOptions: { value: ExpirationOption, label: string, hours: number }[] = [
  { value: '1h', label: '1 Hora', hours: 1 },
  { value: '1y', label: '1 Ano', hours: 8760 },
  { value: '10y', label: '10 Anos (Permanente)', hours: 87600 },
];

const GerarTokenBearer: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [apiToken, setApiToken] = useState<string>('');
  const [showApiToken, setShowApiToken] = useState(false);
  const [tokenExpiration, setTokenExpiration] = useState<ExpirationOption>('1y');

  const generateApiToken = async () => {
    setLoading(true);
    setError('');
    setApiToken('');
    setSuccess('');

    try {
      const userToken = await getToken();
      if (!userToken) throw new Error("Autenticação de usuário falhou.");

      const expirationData = expirationOptions.find(opt => opt.value === tokenExpiration);
      const expires_in_hours = expirationData ? expirationData.hours : 8760;

      const response = await fetch(`${backend_url}api/auth/gerar-token-api/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expires_in_hours
        })
      });

      if (!response.ok) {
        let errorMessage = `Falha ao gerar o token: HTTP ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData.message) errorMessage = errorData.message;
        } catch {}

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.token) {
        setApiToken(data.token);
        setSuccess('✅ Novo Token de Acesso gerado com sucesso! Copie-o.');
        setShowApiToken(true);
      } else {
        throw new Error('Resposta da API inválida: Token não encontrado.');
      }

    } catch (err: any) {
      console.error(err);
      setError(`Erro ao gerar token: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const expirationHint = useMemo(() => {
    switch (tokenExpiration) {
      case '1h':
        return 'Ideal para testes ou integrações temporárias.';
      case '1y':
        return 'Recomendado para integrações estáveis. Requer renovação anual.';
      case '10y':
        return 'Para integrações permanentes. Use com cautela, máxima segurança necessária.';
      default:
        return '';
    }
  }, [tokenExpiration]);

  return (
    <div className="container-fluid py-4">

      {loading && (
        <div className="alert alert-info">
          🔄 Processando...
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="row justify-content-center">
        <div className="col-lg-8 col-xl-6 mb-4">
          <div className="card shadow-lg">
            <div className="card-header bg-warning text-dark">
              <h5>Gerar Novo Token de Autenticação</h5>
              <p className="mb-0">Este token é necessário para todas as chamadas de API externas.</p>
            </div>
            <div className="card-body">

              <div className="mb-4">
                <label className="form-label fw-bold">Tempo de Expiração do Token</label>
                <select
                  className="form-select"
                  value={tokenExpiration}
                  onChange={(e) => setTokenExpiration(e.target.value as ExpirationOption)}
                  disabled={loading}
                >
                  {expirationOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <small className="text-muted">{expirationHint}</small>
              </div>

              <button
                className="btn btn-warning btn-lg w-100 mb-4"
                onClick={generateApiToken}
                disabled={loading}
              >
                {loading ? '⏳ Gerando Token...' : '✨ Gerar Novo Token de Acesso'}
              </button>

              {apiToken && (
                <>
                  <label className="form-label fw-bold">Seu Token Gerado</label>
                  <div className="input-group">
                    <input
                      type={showApiToken ? 'text' : 'password'}
                      className="form-control"
                      value={apiToken}
                      readOnly
                      style={{ fontFamily: showApiToken ? 'monospace' : 'inherit' }}
                    />
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => setShowApiToken(prev => !prev)}
                    >
                      {showApiToken ? '🙈 Ocultar' : '👁️ Mostrar'}
                    </button>
                    <button
                      className="btn btn-outline-info"
                      type="button"
                      onClick={() => navigator.clipboard.writeText(apiToken).then(() => setSuccess('✅ Token copiado!'))}
                      title="Copiar para área de transferência"
                    >
                      📋
                    </button>
                  </div>
                  <div className="alert alert-danger mt-3">
                    <small>⚠️ <strong>Atenção:</strong> Este token não será exibido novamente. Copie e armazene-o em um local seguro imediatamente.</small>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GerarTokenBearer;