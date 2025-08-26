import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './NegocioDetalhe.css';

const NegocioDetalhe = ({ token }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [negocio, setNegocio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ titulo: '', valor: '', contato_id: '', estagio_id: '' });
  const [contatos, setContatos] = useState([]);
  const [estagios, setEstagios] = useState([]);

  const api = axios.create({
    baseURL: 'http://localhost',
    headers: { 'Authorization': `Token ${token}` }
  });

  useEffect(() => {
    const fetchDetalhes = api.get(`/api/negocios/${id}/`);
    const fetchContatos = api.get('/api/contatos/');
    const fetchEstagios = api.get('/api/estagios/');

    Promise.all([fetchDetalhes, fetchContatos, fetchEstagios])
      .then(([negocioRes, contatosRes, estagiosRes]) => {
        const neg = negocioRes.data;
        setNegocio(neg);
        setFormData({ 
          titulo: neg.titulo, 
          valor: neg.valor,
          contato_id: neg.contato.id,
          estagio_id: neg.estagio.id
        });
        setContatos(contatosRes.data);
        setEstagios(estagiosRes.data);
        setLoading(false);
      })
      .catch(error => console.error("Erro ao buscar dados:", error));
  }, [id, token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    console.log(e);
    console.log(formData);
    api.patch(`/api/negocios/${id}/`, formData)
      .then(res => {
        setNegocio(res.data);
        setIsEditing(false);
      });
  };

  if (loading) return <p>A carregar...</p>;

  return (
    <div className="negocio-detalhe-container">
      <Link to="/kanban">{"< Voltar ao Kanban"}</Link>
      
      {!isEditing ? (
        <>
          <h1>{negocio.titulo}</h1>
          <button onClick={() => setIsEditing(true)}>Editar</button>
          <div className="detalhes-grid">
            <div className="detalhe-item"><strong>Valor</strong><span>R$ {negocio.valor}</span></div>
            <div className="detalhe-item"><strong>Estágio</strong><span>{negocio.estagio.nome}</span></div>
            <div className="detalhe-item"><strong>Contato</strong><span>{negocio.contato.nome}</span></div>
            <div className="detalhe-item"><strong>Criado em</strong><span>{new Date(negocio.criado_em).toLocaleDateString()}</span></div>
          </div>
        </>
      ) : (
        <>
          <h1>Editar Negócio</h1>
          <form onSubmit={handleFormSubmit} className="detalhes-grid">
            <div className="detalhe-item">
              <strong>Título</strong>
              <input name="titulo" value={formData.titulo} onChange={handleInputChange} />
            </div>
            <div className="detalhe-item">
              <strong>Valor</strong>
              <input name="valor" type="number" value={formData.valor} onChange={handleInputChange} />
            </div>
            <div className="detalhe-item">
              <strong>Contato</strong>
              <select name="contato_id" value={formData.contato_id} onChange={handleInputChange}>
                {contatos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="detalhe-item">
              <strong>Estágio</strong>
              <select name="estagio_id" value={formData.estagio_id} onChange={handleInputChange}>
                {estagios.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div style={{gridColumn: 'span 2'}}>
              <button type="submit">Salvar</button>
              <button type="button" onClick={() => setIsEditing(false)}>Cancelar</button>
            </div>
          </form>
        </>
      )}
    </div>
  );
};
export default NegocioDetalhe;