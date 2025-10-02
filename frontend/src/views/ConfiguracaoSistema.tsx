// frontend/src/views/ConfiguracaoSistema.tsx

import React, { useState, useEffect } from 'react';

const ConfiguracaoSistema: React.FC = () => {
  const [config, setConfig] = useState({
    nome_empresa: '',
    cor_primaria: '#1877f2',
    cor_secundaria: '#42a5f5',
    evolution_api_url: '',
    evolution_api_key: '',
    whatsapp_instance_name: '',
    openai_api_key: '',
    elevenlabs_api_key: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:8000/api/configuracao-sistema/', {
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setConfig(data);
      setError('');
    } catch (error: any) {
      setError(`Erro ao carregar as configurações: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:8000/api/configuracao-sistema/', {
        method: 'PUT',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha ao salvar: ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('✅ Configurações salvas com sucesso!');
        // Recarrega os dados para confirmar a alteração
        setTimeout(() => fetchConfig(), 1000); 
      } else {
        throw new Error(data.error || 'Ocorreu um erro desconhecido ao salvar.');
      }
      
    } catch (error: any) {
      setError(`Erro ao salvar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="container-fluid py-4">
      <h2>⚙️ Configuração do Sistema</h2>
      
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
      
      <div className="row">
        {/* Configurações da Empresa */}
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5>🏢 Informações da Empresa</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Nome da Empresa</label>
                <input
                  type="text"
                  className="form-control"
                  value={config.nome_empresa}
                  onChange={(e) => handleInputChange('nome_empresa', e.target.value)}
                  placeholder="Minha Empresa"
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label">Cor Primária</label>
                <input
                  type="color"
                  className="form-control form-control-color"
                  value={config.cor_primaria}
                  onChange={(e) => handleInputChange('cor_primaria', e.target.value)}
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label">Cor Secundária</label>
                <input
                  type="color"
                  className="form-control form-control-color"
                  value={config.cor_secundaria}
                  onChange={(e) => handleInputChange('cor_secundaria', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configurações WhatsApp */}
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5>📱 WhatsApp / Evolution API</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">URL da Evolution API</label>
                <input
                  type="url"
                  className="form-control"
                  value={config.evolution_api_url}
                  onChange={(e) => handleInputChange('evolution_api_url', e.target.value)}
                  placeholder="https://sua-evolution-api.com"
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label">API Key da Evolution</label>
                <input
                  type="password"
                  className="form-control"
                  value={config.evolution_api_key}
                  onChange={(e) => handleInputChange('evolution_api_key', e.target.value)}
                  placeholder="Sua API Key"
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label">Nome da Instância</label>
                <input
                  type="text"
                  className="form-control"
                  value={config.whatsapp_instance_name}
                  onChange={(e) => handleInputChange('whatsapp_instance_name', e.target.value)}
                  placeholder="main"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Configurações IA */}
        <div className="col-lg-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5>🤖 Inteligência Artificial</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">OpenAI API Key</label>
                <input
                  type="password"
                  className="form-control"
                  value={config.openai_api_key}
                  onChange={(e) => handleInputChange('openai_api_key', e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              
              <div className="mb-3">
                <label className="form-label">ElevenLabs API Key</label>
                <input
                  type="password"
                  className="form-control"
                  value={config.elevenlabs_api_key}
                  onChange={(e) => handleInputChange('elevenlabs_api_key', e.target.value)}
                  placeholder="Sua API Key do ElevenLabs"
                />
              </div>
              
              <div className="alert alert-info">
                <small><strong>Nota:</strong> As chaves de IA são opcionais. O CRM funciona normalmente sem elas.</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-4">
        <button 
          className="btn btn-primary btn-lg" 
          onClick={saveConfig}
          disabled={loading}
        >
          {loading ? '🔄 Salvando...' : '💾 Salvar Configurações'}
        </button>
        
        <button 
          className="btn btn-secondary btn-lg ms-3" 
          onClick={fetchConfig}
          disabled={loading}
        >
          🔄 Recarregar
        </button>
      </div>
    </div>
  );
};

export default ConfiguracaoSistema;