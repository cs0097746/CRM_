import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Garanta que esta importação existe
import './Dashboard.css';

const Dashboard = ({ token }) => {
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Função para buscar as conversas (nenhuma alteração aqui)
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

  // Função para atualizar as conversas (nenhuma alteração aqui)
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
      {/* Coluna de Entrada */}
      <div className="dashboard-coluna">
        <h2>Entrada ({conversasEntrada.length})</h2>
        {conversasEntrada.map(conversa => (
          // --- ALTERAÇÃO AQUI ---
          // Envolvemos tudo num Link para a página de detalhes
          <Link to={`/conversas/${conversa.id}`} key={conversa.id} className="card-link">
            <div className="card-conversa">
              <p><strong>Cliente:</strong> {conversa.contato?.nome || 'Desconhecido'}</p>
              {/* O e.preventDefault() impede que, ao clicar no botão, o link seja ativado */}
              <button onClick={(e) => { e.preventDefault(); handleUpdateConversa(conversa.id, { operador: 1, status: 'atendimento' }); }}>
                Aceitar
              </button>
            </div>
          </Link>
        ))}
      </div>

      {/* Coluna Em Atendimento */}
      <div className="dashboard-coluna">
        <h2>Em Atendimento ({conversasAtendimento.length})</h2>
        {conversasAtendimento.map(conversa => (
          // --- ALTERAÇÃO AQUI ---
          <Link to={`/conversas/${conversa.id}`} key={conversa.id} className="card-link">
            <div className="card-conversa">
              <p><strong>Cliente:</strong> {conversa.contato?.nome || 'Desconhecido'}</p>
              <p><strong>Operador:</strong> {conversa.operador?.user?.username || 'Ninguém'}</p>
              <button onClick={(e) => { e.preventDefault(); handleUpdateConversa(conversa.id, { status: 'resolvida' }); }}>
                Resolver
              </button>
            </div>
          </Link>
        ))}
      </div>

      {/* Coluna Resolvida */}
      <div className="dashboard-coluna">
        <h2>Resolvida ({conversasResolvida.length})</h2>
        {conversasResolvida.map(conversa => (
          // --- ALTERAÇÃO AQUI ---
          <Link to={`/conversas/${conversa.id}`} key={conversa.id} className="card-link">
            <div className="card-conversa">
              <p><strong>Cliente:</strong> {conversa.contato?.nome || 'Desconhecido'}</p>
              <p><strong>Operador:</strong> {conversa.operador?.user?.username || 'Ninguém'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;