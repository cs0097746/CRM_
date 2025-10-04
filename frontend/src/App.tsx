import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { lazy, Suspense, useState, useEffect } from "react";
import { Modal, Nav, Button } from 'react-bootstrap';
import './App.css'; 
import AtendimentoDashboard from './views/AtendimentoDashboard';
import { LoginForm } from './components/LoginForm'; // ✅ ADICIONAR IMPORT
import ConfiguracaoSistema from './views/ConfiguracaoSistema';
import TestePage from './views/TestePage';
import ConfiguracaoWhatsApp from './views/ConfiguracaoWhatsApp';

const Home = lazy(() => import("./views/Home"));
const Kanban = lazy(() => import("./views/Kanban"));
const Atendimento = lazy(() => import("./views/Atendimento"));
const NotFound = lazy(() => import('./views/NotFound'));
const Kanbans = lazy(() => import('./views/Kanbans'));
const Contatos = lazy(() => import('./views/Contatos'));

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-grid-3x3-gap-fill" viewBox="0 0 16 16">
    <path d="M1 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zM1 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1zM1 12a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z"/>
  </svg>
);

// ✅ COMPONENTE PRINCIPAL COM LOGIN
const AppContent = () => {
  const [showNav, setShowNav] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // ✅ VERIFICAR LOGIN AO CARREGAR
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      console.log('✅ Usuário já logado');
      setIsLoggedIn(true);
    } else {
      console.log('❌ Usuário não logado');
      setIsLoggedIn(false);
    }
    
    setLoading(false);
  }, []);

  const handleCloseNav = () => setShowNav(false);
  const handleShowNav = () => setShowNav(true);

  // ✅ FUNÇÃO DE LOGIN
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  // ✅ FUNÇÃO DE LOGOUT
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setShowNav(false);
  };

  const isFabHidden = location.pathname === '/atendimento';

  // ✅ LOADING INICIAL
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // ✅ TELA DE LOGIN
  if (!isLoggedIn) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // ✅ APP NORMAL (quando logado)
  return (
    <>
      <div className="content-area">
        <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/kanban/:id" element={<Kanban />} />
            <Route path="/kanbans" element={<Kanbans />} />
            <Route path="/atendimento" element={<Atendimento />} />
            <Route path="/contatos" element={<Contatos />} />
            <Route path="/dashboard-atendimento" element={<AtendimentoDashboard />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/configuracao" element={<ConfiguracaoSistema />} />
            <Route path="/teste" element={<TestePage />} />
            <Route path="/whatsapp-config" element={<ConfiguracaoWhatsApp />} />
          </Routes>
        </Suspense>
      </div>

      <Button onClick={handleShowNav} className={`fab ${isFabHidden ? 'fab-hidden' : ''}`}>
        <MenuIcon />
      </Button>

      <Modal show={showNav} onHide={handleCloseNav} centered dialogClassName="nav-modal">
        <Modal.Header closeButton className="nav-modal-header">
          <Modal.Title>Loomie CRM</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Nav className="flex-column nav-modal-links">
            <NavLink to="/" className="nav-link" onClick={handleCloseNav}>Dashboard</NavLink>
            <NavLink to="/kanbans" className="nav-link" onClick={handleCloseNav}>Kanbans</NavLink>
            <NavLink to="/atendimento" className="nav-link" onClick={handleCloseNav}>Atendimento</NavLink>
            <NavLink to="/contatos" className="nav-link" onClick={handleCloseNav}>Contatos</NavLink>

            <NavLink to="/configuracao" className="nav-link" onClick={handleCloseNav}>Configurações</NavLink>
            <NavLink to="/whatsapp-config" className="nav-link" onClick={handleCloseNav}>WhatsApp</NavLink>
            <NavLink to="/teste" className="nav-link" onClick={handleCloseNav}>Teste Sistema</NavLink>
            {/* ✅ BOTÃO DE LOGOUT */}
            <hr />
            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={handleLogout}
              className="mt-2"
            >
              🚪 Sair
            </Button>
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