import { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import backend_url from '../config/env';
import { getToken } from '../function/validateToken';

interface TermosModalProps {
  onAceite?: () => void;
}

const TermosModal = ({ onAceite }: TermosModalProps) => {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [aceitando, setAceitando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verifica se o usuário já aceitou os termos
  useEffect(() => {
    verificarAceite();
  }, []);

  const verificarAceite = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        console.error('Token não encontrado');
        return;
      }

      const response = await axios.get(`${backend_url}aceitou_termos/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const aceitou = response.data.aceitou_termos;
      
      // Se não aceitou, mostra o modal
      if (!aceitou) {
        setShow(true);
      }
    } catch (err) {
      console.error('Erro ao verificar termos:', err);
      setError('Não foi possível verificar o status dos termos');
    } finally {
      setLoading(false);
    }
  };

  const handleAceitar = async () => {
    try {
      setAceitando(true);
      setError(null);
      
      const token = await getToken();
      if (!token) {
        throw new Error('Token não encontrado');
      }

      await axios.post(`${backend_url}aceitou_termos/`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fecha o modal
      setShow(false);
      
      // Callback opcional
      if (onAceite) {
        onAceite();
      }
    } catch (err) {
      console.error('Erro ao aceitar termos:', err);
      setError('Não foi possível registrar sua aceitação. Tente novamente.');
    } finally {
      setAceitando(false);
    }
  };

  // Se está carregando, não mostra nada
  if (loading) {
    return null;
  }

  return (
    <Modal 
      show={show} 
      onHide={() => {}} // Não permite fechar sem aceitar
      backdrop="static" 
      keyboard={false}
      centered
      size="lg"
    >
      <style>{`
        .termos-modal-header {
          background: linear-gradient(135deg, #316dbd 0%, #4a8fd9 100%);
          color: white;
          padding: 2rem;
          border-bottom: none;
          border-radius: 8px 8px 0 0;
        }

        .termos-modal-title {
          font-size: 1.8rem;
          font-weight: 700;
          margin: 0;
        }

        .termos-modal-subtitle {
          font-size: 1rem;
          margin-top: 0.5rem;
          opacity: 0.95;
        }

        .termos-content {
          padding: 2rem;
          max-height: 500px;
          overflow-y: auto;
        }

        .termos-section {
          margin-bottom: 2rem;
        }

        .termos-section-title {
          color: #316dbd;
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .termos-text {
          color: #495057;
          line-height: 1.8;
          font-size: 0.95rem;
          margin-bottom: 1rem;
        }

        .termos-list {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }

        .termos-list li {
          color: #495057;
          line-height: 1.8;
          margin-bottom: 0.5rem;
        }

        .termos-highlight {
          background: #fff3cd;
          padding: 1rem;
          border-radius: 8px;
          border-left: 4px solid #ffc107;
          margin-bottom: 1.5rem;
        }

        .termos-highlight strong {
          color: #856404;
        }

        .termos-footer {
          padding: 1.5rem 2rem;
          background: #f8f9fa;
          border-top: 1px solid #dee2e6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 0 0 8px 8px;
        }

        .termos-footer-text {
          color: #6c757d;
          font-size: 0.9rem;
          margin: 0;
        }

        .btn-aceitar {
          background: #7ed957;
          border: none;
          color: white;
          font-weight: 700;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .btn-aceitar:hover:not(:disabled) {
          background: #6bc542;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(126, 217, 87, 0.3);
        }

        .btn-aceitar:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Scrollbar customizada */
        .termos-content::-webkit-scrollbar {
          width: 8px;
        }

        .termos-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .termos-content::-webkit-scrollbar-thumb {
          background: #316dbd;
          border-radius: 4px;
        }

        .termos-content::-webkit-scrollbar-thumb:hover {
          background: #245291;
        }
      `}</style>

      <div className="termos-modal-header">
        <h2 className="termos-modal-title">📜 Termos de Serviço</h2>
        <p className="termos-modal-subtitle">
          Leia e aceite os termos para continuar usando o Loomie CRM
        </p>
      </div>

      <div className="termos-content">
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        <div className="termos-highlight">
          <strong>⚠️ Importante:</strong> Ao aceitar estes termos, você confirma que leu, compreendeu e concorda com todas as condições de uso do Loomie CRM.
        </div>

        <div className="termos-section">
          <h3 className="termos-section-title">
            <span>1️⃣</span> Uso do Sistema
          </h3>
          <p className="termos-text">
            O Loomie CRM é uma plataforma de gestão de relacionamento com clientes (CRM) que permite:
          </p>
          <ul className="termos-list">
            <li>Gerenciar conversas de múltiplos canais (WhatsApp, Email, etc.)</li>
            <li>Acompanhar oportunidades de negócio através de pipelines Kanban</li>
            <li>Automatizar processos com gatilhos inteligentes</li>
            <li>Controlar acessos e permissões de usuários</li>
            <li>Visualizar análises e relatórios de desempenho</li>
          </ul>
          <p className="termos-text">
            Você se compromete a utilizar o sistema apenas para fins legais e de acordo com as funcionalidades previstas.
          </p>
        </div>

        <div className="termos-section">
          <h3 className="termos-section-title">
            <span>2️⃣</span> Privacidade e Dados
          </h3>
          <p className="termos-text">
            Respeitamos sua privacidade e protegemos seus dados:
          </p>
          <ul className="termos-list">
            <li>Todos os dados são armazenados de forma segura em servidores criptografados</li>
            <li>Não compartilhamos suas informações com terceiros sem autorização</li>
            <li>Você tem controle total sobre seus dados e pode exportá-los ou excluí-los a qualquer momento</li>
            <li>Utilizamos cookies apenas para melhorar sua experiência e autenticação</li>
            <li>Seguimos as diretrizes da LGPD (Lei Geral de Proteção de Dados)</li>
          </ul>
        </div>

        <div className="termos-section">
          <h3 className="termos-section-title">
            <span>3️⃣</span> Responsabilidades do Usuário
          </h3>
          <p className="termos-text">
            Ao utilizar o Loomie CRM, você concorda em:
          </p>
          <ul className="termos-list">
            <li>Manter suas credenciais de acesso em segurança</li>
            <li>Não compartilhar sua conta com terceiros</li>
            <li>Utilizar o sistema de forma ética e responsável</li>
            <li>Não tentar burlar medidas de segurança ou acessar áreas restritas</li>
            <li>Reportar imediatamente qualquer problema de segurança identificado</li>
            <li>Respeitar os limites do seu plano contratado</li>
          </ul>
        </div>

        <div className="termos-section">
          <h3 className="termos-section-title">
            <span>4️⃣</span> Planos e Pagamentos
          </h3>
          <p className="termos-text">
            O uso do sistema está sujeito ao plano contratado:
          </p>
          <ul className="termos-list">
            <li>Cada plano possui limites específicos de usuários, pipelines e contatos</li>
            <li>Upgrades de plano podem ser realizados a qualquer momento</li>
            <li>Pagamentos são processados de forma segura através de gateway certificado</li>
            <li>Não realizamos reembolsos após 7 dias da contratação</li>
          </ul>
        </div>

        <div className="termos-section">
          <h3 className="termos-section-title">
            <span>5️⃣</span> Suporte e Atualizações
          </h3>
          <p className="termos-text">
            Oferecemos suporte contínuo e melhorias:
          </p>
          <ul className="termos-list">
            <li>Suporte técnico disponível 24/7 para planos Premium</li>
            <li>Atualizações regulares com novos recursos e correções</li>
            <li>Notificações sobre manutenções programadas</li>
            <li>Documentação completa e tutoriais disponíveis</li>
          </ul>
        </div>

        <div className="termos-section">
          <h3 className="termos-section-title">
            <span>6️⃣</span> Limitação de Responsabilidade
          </h3>
          <p className="termos-text">
            Embora nos esforcemos para manter o sistema funcionando perfeitamente:
          </p>
          <ul className="termos-list">
            <li>Não nos responsabilizamos por perdas decorrentes de falhas técnicas</li>
            <li>Recomendamos backups regulares de dados críticos</li>
            <li>Não garantimos disponibilidade de 100% do tempo (uptime)</li>
            <li>Não nos responsabilizamos por uso indevido por terceiros</li>
          </ul>
        </div>

        <div className="termos-section">
          <h3 className="termos-section-title">
            <span>7️⃣</span> Alterações nos Termos
          </h3>
          <p className="termos-text">
            Reservamo-nos o direito de atualizar estes termos a qualquer momento. Você será notificado sobre mudanças significativas e poderá revisá-las antes de continuar usando o sistema.
          </p>
        </div>

        <div className="termos-highlight" style={{ marginTop: '2rem' }}>
          <strong>📅 Data da última atualização:</strong> 31 de outubro de 2025
        </div>
      </div>

      <div className="termos-footer">
        <p className="termos-footer-text">
          Ao clicar em "Aceitar e Continuar", você concorda com todos os termos acima.
        </p>
        <Button 
          className="btn-aceitar" 
          onClick={handleAceitar}
          disabled={aceitando}
        >
          {aceitando ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Processando...
            </>
          ) : (
            <>
              ✓ Aceitar e Continuar
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
};

export default TermosModal;
