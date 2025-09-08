import React, { useState, useEffect } from 'react';
import { MessageCircle, Wifi, WifiOff, RefreshCw, QrCode, Phone } from 'lucide-react';

// ✅ CONFIGURAÇÃO CORRETA DA API
const API_BASE_URL = 'http://localhost:8000';  // ✅ PORTA DO DJANGO

interface WhatsAppStatus {
  connected: boolean;
  status: string;
  instance_name: string;
}

const WhatsAppWidget: React.FC = () => {
  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false,
    status: 'unknown',
    instance_name: 'nate'
  });
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  // ✅ FUNÇÃO PARA OBTER TOKEN
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    console.log('🔑 Token obtido:', token ? 'EXISTE' : 'NÃO EXISTE');
    
    return {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // ✅ VERIFICAR STATUS DO WHATSAPP
  const checkWhatsAppStatus = async () => {
    try {
      console.log('📡 Verificando status...');
      
      const response = await fetch(`${API_BASE_URL}/whatsapp/status/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Status recebido:', data);
      
      setStatus({
        connected: data.connected || false,
        status: data.status || 'unknown',
        instance_name: data.instance_name || 'nate'
      });
      
    } catch (error) {
      console.error('💥 Erro ao verificar status:', error);
      setStatus(prev => ({ ...prev, connected: false, status: 'error' }));
    }
  };

  // ✅ RECONECTAR WHATSAPP
  const handleReconnect = async () => {
    console.log('👆 Botão clicado!');
    console.log('🔄 INICIANDO RECONEXÃO...');
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token para reconexão:', token ? 'EXISTE' : 'NÃO EXISTE');
      
      if (!token) {
        alert('❌ Token não encontrado! Faça login novamente.');
        return;
      }

      console.log('📡 Fazendo request para /whatsapp/restart-debug/');  // ✅ USAR DEBUG
      console.log(`
            URL: ${API_BASE_URL}/whatsapp/restart-debug/
            Method: POST
            Headers: Authorization: Token ${token}
            `);
            
      const response = await fetch(`${API_BASE_URL}/whatsapp/restart-debug/`, {  // ✅ DEBUG
        method: 'POST',
        headers: getAuthHeaders()
      });

      console.log('📊 Response status:', response.status);
      console.log('📊 Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('💥 Erro HTTP:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Resultado do restart:', result);

      if (result.success) {
        alert('✅ WhatsApp reconectado com sucesso!');
        await checkWhatsAppStatus(); // Atualizar status
      } else {
        alert(`❌ Erro: ${result.error}`);
        console.error('💥 Erro detalhado:', result);
      }
      
    } catch (error) {
      console.error('💥 Erro na requisição:', error);
      alert(`❌ Erro ao reconectar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ OBTER QR CODE
  const handleGetQRCode = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/qr-code/`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        if (result.connected) {
          alert('✅ WhatsApp já está conectado!');
        } else {
          setQrCode(result.qr_code);
          setShowQR(true);
        }
      } else {
        alert(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Erro ao obter QR Code:', error);
      alert(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ DESCONECTAR
  const handleDisconnect = async () => {
    if (!confirm('⚠️ Tem certeza que deseja desconectar o WhatsApp?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/disconnect/`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        alert('✅ WhatsApp desconectado!');
        await checkWhatsAppStatus();
      } else {
        alert(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Erro ao desconectar:', error);
      alert(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ VERIFICAR STATUS NA INICIALIZAÇÃO
  useEffect(() => {
    checkWhatsAppStatus();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(checkWhatsAppStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-gray-800">WhatsApp Status</h3>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          {status.connected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-sm font-medium ${
            status.connected ? 'text-green-600' : 'text-red-600'
          }`}>
            {status.connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Status Details */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          <strong>Instância:</strong> {status.instance_name}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Status:</strong> {status.status}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {!status.connected ? (
          <>
            <button
              onClick={handleReconnect}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{loading ? 'Reconectando...' : 'Reconectar'}</span>
            </button>

            <button
              onClick={handleGetQRCode}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <QrCode className="h-4 w-4" />
              <span>Obter QR Code</span>
            </button>
          </>
        ) : (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span>Desconectar</span>
          </button>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && qrCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md">
            <h4 className="text-lg font-semibold mb-4">Escaneie o QR Code</h4>
            <div className="text-center">
              <img src={qrCode} alt="QR Code WhatsApp" className="mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Abra o WhatsApp no seu celular e escaneie este código
              </p>
              <button
                onClick={() => setShowQR(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppWidget;