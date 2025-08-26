import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Kanban from './Kanban';
import './App.css'; // Para estilos globais e do menu

// Componente de Login
const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    onLogin(username, password).catch(err => setError(err.message));
  };

  return (
    <div className='login-container'>
      <h1>Login do CRM</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Utilizador" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" />
        <button type="submit">Entrar</button>
      </form>
      {error && <p style={{color: 'red'}}>{error}</p>}
    </div>
  );
};

// Componente Principal da Aplicação
function App() {
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  const handleLogin = (username, password) => {
    return fetch('http://localhost/api-token-auth/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    .then(res => { if (!res.ok) throw new Error('Credenciais inválidas'); return res.json(); })
    .then(data => {
      localStorage.setItem('authToken', data.token);
      setToken(data.token);
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
  };

  return (
    <Router>
      <div className="App">
        {token && (
          <nav className="main-nav">
            <Link to="/">Painel de Atendimento</Link>
            <Link to="/kanban">Kanban de Vendas</Link>
            <button onClick={handleLogout}>Sair (Logout)</button>
          </nav>
        )}
        <main>
          <Routes>
            <Route path="/login" element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            <Route path="/kanban" element={token ? <Kanban token={token} /> : <Navigate to="/login" />} />
            <Route path="/" element={token ? <Dashboard token={token} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
export default App;