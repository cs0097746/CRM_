// frontend/src/ConversaDetalhe.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './ConversaDetalhe.css';

const ConversaDetalhe = ({ token }) => {
  const { id } = useParams();
  const [conversa, setConversa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [novaMensagem, setNovaMensagem] = useState(''); // Estado para a nova mensagem

  const fetchConversaDetalhes = () => {
    if (token) {
      fetch(`http://localhost/api/conversas/${id}/`, {
        headers: { 'Authorization': `Token ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        setConversa(data);
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    fetchConversaDetalhes();
  }, [id, token]);

  const handleEnviarMensagem = (e) => {
    e.preventDefault();
    if (!novaMensagem.trim()) return; // Não envia mensagens vazias

    fetch(`http://localhost/api/conversas/${id}/mensagens/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({ mensagem: novaMensagem }),
    })
    .then(res => res.json())
    .then(() => {
        setNovaMensagem(''); // Limpa o campo de texto
        fetchConversaDetalhes(); // Re-busca a conversa para mostrar a nova mensagem
    })
    .catch(error => console.error("Erro ao enviar mensagem:", error));
  };

  if (loading) return <p>A carregar detalhes da conversa...</p>;
  if (!conversa) return <p>Conversa não encontrada.</p>;

  return (
    <div className="conversa-detalhe">
      <h2>Conversa com {conversa.contato.nome}</h2>
      <div className="historico-mensagens">
        {conversa.interacoes.map(interacao => (
          <div key={interacao.id} className={`mensagem ${interacao.remetente}`}>
            <p>{interacao.mensagem}</p>
          </div>
        ))}
      </div>

      {/* --- NOVO FORMULÁRIO DE RESPOSTA --- */}
      <form onSubmit={handleEnviarMensagem} className="formulario-resposta">
        <textarea
          value={novaMensagem}
          onChange={(e) => setNovaMensagem(e.target.value)}
          placeholder="Digite a sua resposta..."
          rows="3"
        />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
};

export default ConversaDetalhe;