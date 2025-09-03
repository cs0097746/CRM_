import React from "react";
import { Link } from "react-router-dom";

const NotFound: React.FC = () => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100 bg-light">
      <h1 className="display-1 text-danger">404</h1>
      <h2 className="mb-4">Página não encontrada</h2>
      <p className="mb-4 text-center">
        Desculpe, a página que você está procurando não existe ou foi movida.
      </p>
      <Link to="/" className="btn btn-primary btn-lg">
        Voltar para a página inicial
      </Link>
    </div>
  );
};

export default NotFound;
