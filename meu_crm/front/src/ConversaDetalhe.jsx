// frontend/src/ConversaDetalhe.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './ConversaDetalhe.css';

const ConversaDetalhe = ({ token }) => {
  const { id } = useParams(); // Pega o ID da conversa a partir do URL
  const [conversa, setConversa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [id, token]);

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
      {/* Formulário para responder (próximo passo) */}
    </div>
  );
};

export default ConversaDetalhe;