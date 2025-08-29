import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import { Modal, Nav, Button } from 'react-bootstrap';
import './App.css'; 

const Home = lazy(() => import("./views/Home"));
const Kanban = lazy(() => import("./views/Kanban"));
const Atendimento = lazy(() => import("./views/Atendimento"));

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-grid-3x3-gap-fill" viewBox="0 0 16 16">
    <path d="M1 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zM1 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zM1 12a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z"/>
  </svg>
);

// Componente interno para gerenciar a visibilidade do botão
const AppContent = () => {
  const [showNav, setShowNav] = useState(false);
  const location = useLocation(); // Hook para saber a URL atual

  const handleCloseNav = () => setShowNav(false);
  const handleShowNav = () => setShowNav(true);

  // O botão fica escondido se a URL for /atendimento
  const isFabHidden = location.pathname === '/atendimento';

  return (
    <>
      <div className="content-area">
        <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/atendimento" element={<Atendimento />} />
          </Routes>
        </Suspense>
      </div>

      <Button onClick={handleShowNav} className={`fab ${isFabHidden ? 'fab-hidden' : ''}`}>
        <MenuIcon />
      </Button>

      <Modal show={showNav} onHide={handleCloseNav} centered dialogClassName="nav-modal">
        {/* ... (conteúdo do modal como estava antes) ... */}
        <Modal.Header closeButton className="nav-modal-header">
          <Modal.Title>Loomie CRM</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Nav className="flex-column nav-modal-links">
            <NavLink to="/" className="nav-link" onClick={handleCloseNav}>Dashboard</NavLink>
            <NavLink to="/kanban" className="nav-link" onClick={handleCloseNav}>Kanban</NavLink>
            <NavLink to="/atendimento" className="nav-link" onClick={handleCloseNav}>Atendimento</NavLink>
          </Nav>
        </Modal.Body>
      </Modal>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

