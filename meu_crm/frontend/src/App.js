import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard'; // Importa o nosso painel
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(null);
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    fetch('http://localhost/api-token-auth/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    .then(response => {
      if (!response.ok) { throw new Error('Utilizador ou senha inválidos.'); }
      return response.json();
    })
    .then(data => { setToken(data.token); })
    .catch(err => { setError(err.message); });
  };

  // --- FUNÇÃO CRUCIAL PARA ATUALIZAR CONVERSAS ---
  const handleUpdateConversa = (conversaId, dataToUpdate) => {
    fetch(`http://localhost/api/conversas/${conversaId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify(dataToUpdate),
    })
    .then(response => response.json())
    .then(updatedConversa => {
      // Atualiza a lista de conversas no estado para refletir a mudança instantaneamente
      setConversas(prevConversas => 
        prevConversas.map(c => c.id === updatedConversa.id ? updatedConversa : c)
      );
    })
    .catch(error => console.error("Erro ao atualizar conversa:", error));
  };

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetch('http://localhost/api/conversas/', {
        headers: { 'Authorization': `Token ${token}` }
      })
      .then(response => response.json())
      .then(data => {
        setConversas(data);
        setLoading(false);
      });
    }
  }, [token]);

  // Tela de Login (continua igual)
  // Se não tivermos um token, mostramos o formulário de login
if (!token) {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Login do CRM</h1>
        {/* FORMULÁRIO CORRIGIDO ABAIXO */}
        <form onSubmit={handleLogin}>
          <div>
            <label htmlFor="username-input">Utilizador:</label>
            <input
              type="text"
              id="username-input"
              name="username"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password-input">Senha:</label>
            <input
              type="password"
              id="password-input"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit">Entrar</button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </header>
    </div>
  );
}
  // Tela Principal com o Painel
  return (
    <div className="App">
      <header className="App-header">
        <h1>Painel de Atendimento</h1>
        <button onClick={() => setToken(null)}>Sair (Logout)</button>
      </header>
      <main>
        {/* CORREÇÃO: Passamos a função 'handleUpdateConversa' para o Dashboard */}
        <Dashboard 
          conversas={conversas} 
          loading={loading} 
          onUpdateConversa={handleUpdateConversa} 
        />
      </main>
    </div>
  );
}

export default App;