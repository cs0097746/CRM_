// frontend/src/Dashboard.js
import React from 'react';
import './Dashboard.css';

const Dashboard = ({ conversas, loading, onUpdateConversa }) => {

  if (loading) {
    return <p>A carregar conversas...</p>;
  }

  // Filtramos as conversas para cada coluna
  const conversasEntrada = conversas.filter(c => c.status === 'entrada');
  const conversasAtendimento = conversas.filter(c => c.status === 'atendimento');
  const conversasResolvida = conversas.filter(c => c.status === 'resolvida');

  return (
    <div className="dashboard">
      {/* Coluna de Entrada */}
      <div className="coluna">
        <h2>Entrada ({conversasEntrada.length})</h2>
        {conversasEntrada.map(conversa => (
          <div key={conversa.id} className="card-conversa">
            {/* Adicionado '?' para segurança */}
            <p><strong>Cliente:</strong> {conversa.contato?.nome || 'Desconhecido'}</p>
            {/* ID do operador logado - por agora vamos usar '1' como exemplo */}
            <button onClick={() => onUpdateConversa(conversa.id, { status: 'atendimento', operador_id: 1 })}>
              Aceitar
            </button>
          </div>
        ))}
      </div>

      {/* Coluna Em Atendimento */}
      <div className="coluna">
        <h2>Em Atendimento ({conversasAtendimento.length})</h2>
        {conversasAtendimento.map(conversa => (
          <div key={conversa.id} className="card-conversa">
            <p><strong>Cliente:</strong> {conversa.contato?.nome || 'Desconhecido'}</p>
            {/* Adicionado '?' para segurança */}
            <p><strong>Operador:</strong> {conversa.operador?.user?.username || 'Ninguém'}</p>
            <button onClick={() => onUpdateConversa(conversa.id, { status: 'resolvida' })}>
              Resolver
            </button>
          </div>
        ))}
      </div>

      {/* Coluna Resolvida */}
      <div className="coluna">
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