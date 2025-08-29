import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import { Modal, Nav, Button } from 'react-bootstrap';
import './App.css'; 

// Carregamento lazy das páginas
const Home = lazy(() => import("./views/Home"));
const Kanban = lazy(() => import("./views/Kanban"));
const Atendimento = lazy(() => import("./views/Atendimento"));

// Ícone para o botão flutuante (SVG)
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-grid-3x3-gap-fill" viewBox="0 0 16 16">
    <path d="M1 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zM1 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zM1 12a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z"/>
  </svg>
);


function App() {
  const [showNav, setShowNav] = useState(false);

  const handleCloseNav = () => setShowNav(false);
  const handleShowNav = () => setShowNav(true);

  return (
    <BrowserRouter>
      {/* A área de conteúdo principal agora ocupa tudo */}
      <div className="content-area">
        <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/atendimento" element={<Atendimento />} />
          </Routes>
        </Suspense>
      </div>

      {/* 1. Botão Flutuante (FAB) para abrir a navegação */}
      <Button onClick={handleShowNav} className="fab">
        <MenuIcon />
      </Button>

      {/* 2. Modal de Navegação que aparece como um pop-up */}
      <Modal show={showNav} onHide={handleCloseNav} centered dialogClassName="nav-modal">
        <Modal.Header closeButton className="nav-modal-header">
          <Modal.Title>Loomie CRM</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Nav className="flex-column nav-modal-links">
            {/* O onClick={handleCloseNav} fecha o modal ao clicar em um link */}
            <NavLink to="/" className="nav-link" onClick={handleCloseNav}>Dashboard</NavLink>
            <NavLink to="/kanban" className="nav-link" onClick={handleCloseNav}>Kanban</NavLink>
            <NavLink to="/atendimento" className="nav-link" onClick={handleCloseNav}>Atendimento</NavLink>
          </Nav>
        </Modal.Body>
      </Modal>
    </BrowserRouter>
  );
}

export default App;

