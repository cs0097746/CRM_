import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Kanban.css';

const Kanban = ({ token }) => {
    const [negocios, setNegocios] = useState([]);
    const [estagios, setEstagios] = useState([]);
    const [loading, setLoading] = useState(true);

    const api = axios.create({
        baseURL: 'http://localhost',
        headers: { 'Authorization': `Token ${token}` }
    });

    useEffect(() => {
        const fetchEstagios = api.get('/api/estagios/');
        const fetchNegocios = api.get('/api/negocios/');

        Promise.all([fetchEstagios, fetchNegocios])
            .then(responses => {
                setEstagios(responses[0].data);
                setNegocios(responses[1].data);
                setLoading(false);
            })
            .catch(error => console.error("Erro ao buscar dados do Kanban:", error));
    }, [token]);

    if (loading) return <p>A carregar Kanban...</p>;

    return (
        <div className="kanban-board">
            {estagios.map(estagio => (
                <div key={estagio.id} className="kanban-coluna">
                    <h2>{estagio.nome}</h2>
                    {negocios
                        .filter(negocio => negocio.estagio.id === estagio.id)
                        .map(negocio => (
                            <div key={negocio.id} className="card-negocio">
                                <p><strong>{negocio.titulo}</strong></p>
                                <p>Valor: R$ {negocio.valor}</p>
                                <p>Contato: {negocio.contato.nome}</p>
                            </div>
                        ))}
                </div>
            ))}
        </div>
    );
};
export default Kanban;