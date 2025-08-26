import { useState } from 'react';

export const useAuth = () => {
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

  return { token, handleLogin, handleLogout };
};

// ... (O componente Login pode ser movido para aqui ou mantido no App.js)