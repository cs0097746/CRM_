// frontend/src/Dashboard.jsx (VERSÃO CORRIGIDA E FUNCIONAL)
import React, { useState, useEffect } from 'react';
import './Dashboard.css'; // Usaremos um estilo dedicado

const Dashboard = ({ token }) => {
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversas = () => {
    setLoading(true);
    fetch('http://localhost/api/conversas/', {
      headers: { 'Authorization': `Token ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setConversas(data);
      setLoading(false);
    })
    .catch(error => console.error("Erro ao buscar conversas:", error));
  };

  useEffect(() => {
    fetchConversas();
  }, [token]);

  const handleUpdateConversa = (conversaId, dataToUpdate) => {
    fetch(`http://localhost/api/conversas/${conversaId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${token}` },
      body: JSON.stringify(dataToUpdate),
    })
    .then(res => res.json())
    .then(() => {
      fetchConversas(); // Re-busca a lista inteira para garantir a atualização
    });
  };

  if (loading) return <p>A carregar painel de atendimento...</p>;

  return (
    <div className="dashboard">
      {/* Coluna de Entrada */}
      <div className="dashboard-coluna">
        <h2>Entrada</h2>
        {conversas.filter(c => c.status === 'entrada').map(conversa => (
          <div key={conversa.id} className="card-conversa">
            <p><strong>Cliente:</strong> {conversa.contato?.nome || 'Desconhecido'}</p>
            <button onClick={() => handleUpdateConversa(conversa.id, { status: 'atendimento', operador_id: 1 })}>
              Aceitar
            </button>
          </div>
        ))}
      </div>

      {/* Coluna Em Atendimento */}
      <div className="dashboard-coluna">
        <h2>Em Atendimento</h2>
        {conversas.filter(c => c.status === 'atendimento').map(conversa => (
          <div key={conversa.id} className="card-conversa">
            <p><strong>Cliente:</strong> {conversa.contato?.nome || 'Desconhecido'}</p>
            <p><strong>Operador:</strong> {conversa.operador?.user?.username || 'Ninguém'}</p>
            <button onClick={() => handleUpdateConversa(conversa.id, { status: 'resolvida' })}>
              Resolver
            </button>
          </div>
        ))}
      </div>

      {/* Coluna Resolvida */}
      <div className="dashboard-coluna">
        <h2>Resolvida</h2>
        {conversas.filter(c => c.status === 'resolvida').map(conversa => (
          <div key={conversa.id} className="card-conversa">
            <p><strong>Cliente:</strong> {conversa.contato?.nome || 'Desconhecido'}</p>
            <p><strong>Operador:</strong> {conversa.operador?.user?.username || 'Ninguém'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;