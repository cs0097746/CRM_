// frontend/src/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = ({ token }) => {
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversas = () => {
    fetch('http://localhost/api/conversas/', {
      headers: { 'Authorization': `Token ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setConversas(data);
      setLoading(false);
    })
    .catch(error => {
      console.error("Erro ao buscar conversas:", error);
      setLoading(false);
    });
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
    .then(updatedConversa => {
      setConversas(prev => prev.map(c => c.id === updatedConversa.id ? updatedConversa : c));
    });
  };

  if (loading) return <p>A carregar painel de atendimento...</p>;

  const conversasEntrada = conversas.filter(c => c.status === 'entrada');
  const conversasAtendimento = conversas.filter(c => c.status === 'atendimento');
  const conversasResolvida = conversas.filter(c => c.status === 'resolvida');

  return (
    <div className="dashboard">
      <div className="dashboard-coluna">
        <h2>Entrada ({conversasEntrada.length})</h2>
        {conversasEntrada.map(conversa => (
          <div key={conversa.id} className="card-conversa">
            <p><strong>Cliente:</strong> {conversa.contato?.nome || 'Desconhecido'}</p>
            <button onClick={() => handleUpdateConversa(conversa.id, { operador: 1, status: 'atendimento' })}>Aceitar</button>
          </div>
        ))}
      </div>
      <div className="dashboard-coluna">
        <h2>Em Atendimento ({conversasAtendimento.length})</h2>
        {conversasAtendimento.map(conversa => (
          <div key={conversa.id} className="card-conversa">
            <p><strong>Cliente:</strong> {conversa.contato?.nome || 'Desconhecido'}</p>
            <p><strong>Operador:</strong> {conversa.operador?.user?.username || 'Ninguém'}</p>
            <button onClick={() => handleUpdateConversa(conversa.id, { status: 'resolvida' })}>Resolver</button>
          </div>
        ))}
      </div>
      <div className="dashboard-coluna">
        <h2>Resolvida ({conversasResolvida.length})</h2>
        {conversasResolvida.map(conversa => (
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