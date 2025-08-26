// frontend/src/NovoNegocioModal.jsx
import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './Modal.css';

// Define o elemento principal da nossa aplicação para a acessibilidade do modal
Modal.setAppElement('#root');

const NovoNegocioModal = ({ isOpen, onRequestClose, token, onNegocioCriado }) => {
  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [contatoId, setContatoId] = useState('');
  const [estagioId, setEstagioId] = useState('');

  const [contatos, setContatos] = useState([]);
  const [estagios, setEstagios] = useState([]);

  // Busca os contatos e estágios disponíveis para preencher os dropdowns
  useEffect(() => {
    if (isOpen) {
      const fetchContatos = fetch('http://localhost/api/contatos/', { headers: { 'Authorization': `Token ${token}` } }).then(res => res.json());
      const fetchEstagios = fetch('http://localhost/api/estagios/', { headers: { 'Authorization': `Token ${token}` } }).then(res => res.json());

      Promise.all([fetchContatos, fetchEstagios]).then(([contatosData, estagiosData]) => {
        setContatos(contatosData);
        setEstagios(estagiosData);
      });
    }
  }, [isOpen, token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const novoNegocio = {
        titulo,
        valor,
        contato_id: parseInt(contatoId), // Garante que é um número
        estagio_id: parseInt(estagioId), // Garante que é um número
    };

    fetch('http://localhost/api/negocios/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(novoNegocio),
    })
    .then(res => res.json())
    .then(data => {
        onNegocioCriado(data); // Informa o componente pai que um novo negócio foi criado
        onRequestClose(); // Fecha o modal
    });
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} className="modal-content" overlayClassName="modal-overlay">
      <h2>Criar Novo Negócio</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título do Negócio" required />
        <input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="Valor (ex: 500.00)" required />

        <select value={contatoId} onChange={e => setContatoId(e.target.value)} required>
          <option value="">Selecione um Contato</option>
          {contatos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <select value={estagioId} onChange={e => setEstagioId(e.target.value)} required>
          <option value="">Selecione um Estágio Inicial</option>
          {estagios.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>

        <button type="submit">Criar</button>
      </form>
    </Modal>
  );
};

export default NovoNegocioModal;