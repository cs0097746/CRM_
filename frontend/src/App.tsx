import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import './App.css';
import AtendimentoDashboard from './views/AtendimentoDashboard';
import { LoginForm } from './components/LoginForm';
import {useAuthValidation} from "./function/useAuthValidation.tsx";

const Home = lazy(() => import("./views/Home"));
const Kanban = lazy(() => import("./views/Kanban"));
const Atendimento = lazy(() => import("./views/Atendimento"));
const NotFound = lazy(() => import('./views/NotFound'));
const Kanbans = lazy(() => import('./views/Kanbans'));
const Contatos = lazy(() => import('./views/Contatos'));
const CriarTarefas = lazy(() => import('./views/Tarefas'));
const ListarTarefas = lazy(()=> import('./views/ListarTarefas'));
const CriarGatilhos = lazy(()=>import('./views/Gatilhos'));
const ListarGatilhos = lazy(()=>import('./views/ListarGatilhos'));
const ListarPresets = lazy(() => import('./views/ListarPresets'));
const Presets = lazy(() => import('./views/Presets'));
const EditarPreset = lazy(() => import('./views/EditarPreset'));
const CriarUsuario = lazy(()=>import('./views/CriarUsuario'));
const UsoPLano = lazy(()=>import('./views/UsoPlano'));
const GerarTokenBearer = lazy(()=>import('./views/GerarTokenBearer'));
const MessageTranslator = lazy(() => import('./pages/MessageTranslator'));

const AppContent = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useAuthValidation(setIsLoggedIn, setLoading);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('access_token_time');
    localStorage.removeItem('is_chefe');
    setIsLoggedIn(false);
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

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

  if (!isLoggedIn) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-circle">
              <span>L</span>
            </div>
            <div className="logo-text">
              <h5>Loomie CRM</h5>
              <small>Sistema de Gestão</small>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">
              <span>MENU PRINCIPAL</span>
            </div>

            <NavLink to="/" className="nav-item" title="Dashboard">
              <i className="bi bi-house-door"></i>
              <span>Dashboard</span>
            </NavLink>

            <NavLink to="/kanbans" className="nav-item" title="Pipelines">
              <i className="bi bi-diagram-3"></i>
              <span>Pipelines</span>
            </NavLink>

            <NavLink to="/atendimento" className="nav-item" title="Atendimento">
              <i className="bi bi-headset"></i>
              <span>Atendimento</span>
            </NavLink>

            <NavLink to="/contatos" className="nav-item" title="Contatos">
              <i className="bi bi-people"></i>
              <span>Contatos</span>
            </NavLink>

            <NavLink to="/dashboard-atendimento" className="nav-item" title="Dashboard Suporte">
              <i className="bi bi-bar-chart-line"></i>
              <span>Dashboard Suporte</span>
            </NavLink>
          </div>

          {/* Configurações */}
          <div className="nav-section">
            <div className="nav-section-title">
              <span>CONFIGURAÇÕES</span>
            </div>

            <NavLink to="/message-translator" className="nav-item" title="WhatsApp">
              <i className="bi bi-whatsapp"></i>
              <span>WhatsApp</span>
            </NavLink>

            <NavLink to="/tarefas" className="nav-item" title="Tarefas">
              <i className="bi bi-clipboard-check"></i>
              <span>Tarefas</span>
            </NavLink>

            <NavLink to="/gatilhos" className="nav-item" title="Gatilhos">
              <i className="bi bi-lightning"></i>
              <span>Gatilhos</span>
            </NavLink>

            <NavLink to="/presets" className="nav-item" title="Presets">
              <i className="bi bi-bookmarks"></i>
              <span>Presets</span>
            </NavLink>

            {localStorage.getItem("is_chefe") === "true" && (
              <>
                <NavLink to="/uso-plano" className="nav-item" title="Uso Plano">
                  <i className="bi bi-card-checklist"></i>
                  <span>Uso Plano</span>
                </NavLink>

                <NavLink to="/criar-usuario" className="nav-item" title="Criar Usuário">
                  <i className="bi bi-person-plus"></i>
                  <span>Criar Usuário</span>
                </NavLink>
              </>
            )}

            <NavLink to="/token-bearer" className="nav-item" title="Token Bearer">
              <i className="bi bi-key"></i>
              <span>Token Bearer</span>
            </NavLink>

          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout} title="Sair">
            <i className="bi bi-box-arrow-right"></i>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* 📄 ÁREA DE CONTEÚDO */}
      <main className="main-content">
        <Suspense fallback={<div className="loading-screen">Carregando...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/kanban/:id" element={<Kanban />} />
            <Route path="/kanbans" element={<Kanbans />} />
            <Route path="/atendimento" element={<Atendimento />} />
            <Route path="/contatos" element={<Contatos />} />
            <Route path="/dashboard-atendimento" element={<AtendimentoDashboard />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/token-bearer" element={<GerarTokenBearer />} />
            <Route path="/criar_tarefas" element={<CriarTarefas />} />
            <Route path="/tarefas" element={<ListarTarefas />} />
            <Route path="/gatilhos"  element={<ListarGatilhos />} />
            <Route path="/criar_gatilho" element={<CriarGatilhos />} />
            <Route path="/presets" element={<ListarPresets />} />
            <Route path="/criar_preset" element={<Presets />} />
            <Route path="/presets/:presetId/editar" element={<EditarPreset />} />
            <Route
              path="/criar-usuario"
              element={
                localStorage.getItem("is_chefe") === "true" ? (
                  <CriarUsuario />
                ) : (
                  <Home />
                )
              }
            />
            <Route
              path="/uso-plano"
              element={
                localStorage.getItem("is_chefe") === "true" ? (
                  <UsoPLano />
                ) : (
                  <Home />
                )
              }
            />
            <Route path="/message-translator" element={<MessageTranslator />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
    </div>
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