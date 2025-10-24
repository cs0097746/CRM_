import { Card, Badge, ListGroup, Button } from 'react-bootstrap';
import type { Conversa } from '../types/Conversa';

interface ContatoInfoProps {
  conversa: Conversa;
  onTagsChange?: (tags: string) => void;
}

export default function ContatoInfo({ conversa, onTagsChange }: ContatoInfoProps) {
  const contato = conversa.contato;
  
  // Converter tags de string para array
  const tagsArray = conversa.tags ? conversa.tags.split(',').map(t => t.trim()).filter(t => t) : [];

  // Funções utilitárias
  const calcularIdade = (dataNascimento: string | null | undefined): string | null => {
    if (!dataNascimento) return null;
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return `${idade} anos`;
  };

  const calcularTempoCliente = (criadoEm: string): string => {
    const criado = new Date(criadoEm);
    const agora = new Date();
    const diffMs = agora.getTime() - criado.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias < 30) return `${diffDias} dias`;
    if (diffDias < 365) return `${Math.floor(diffDias / 30)} meses`;
    return `${Math.floor(diffDias / 365)} anos`;
  };

  const formatarCEP = (cep: string | null | undefined): string => {
    if (!cep) return '';
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  const copiarTexto = (texto: string, label: string) => {
    navigator.clipboard.writeText(texto);
    alert(`${label} copiado!`);
  };

  const handleAddTag = () => {
    const newTag = prompt('Digite a nova tag:');
    if (newTag && newTag.trim()) {
      const currentTags = tagsArray;
      if (!currentTags.includes(newTag.trim())) {
        const updatedTags = [...currentTags, newTag.trim()].join(', ');
        onTagsChange?.(updatedTags);
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tagsArray.filter(t => t !== tagToRemove).join(', ');
    onTagsChange?.(updatedTags);
  };

  return (
    <div style={{
      width: '350px',
      background: 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: '-2px 0 20px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
      }}>
        <h6 className="mb-0" style={{ fontWeight: 600, fontSize: '16px' }}>
          📋 Informações do Contato
        </h6>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px'
      }}>
        {/* Card do Contato */}
        <Card className="mb-3" style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <Card.Body>
            <div className="text-center mb-3">
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: 'white',
                fontSize: '32px',
                fontWeight: 700,
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
              }}>
                {contato.nome?.charAt(0).toUpperCase() || '?'}
              </div>
              <h5 className="mb-1" style={{ fontWeight: 600 }}>
                {contato.nome}
              </h5>
            </div>

            <ListGroup variant="flush" style={{ fontSize: '13px' }}>
              {/* Telefone com ação de copiar */}
              <ListGroup.Item className="px-0 py-2 border-0">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>📱 Telefone</strong>
                    <div className="text-muted mt-1">{contato.telefone || 'Não informado'}</div>
                  </div>
                  {contato.telefone && (
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => copiarTexto(contato.telefone!, 'Telefone')}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      📋
                    </Button>
                  )}
                </div>
              </ListGroup.Item>

              {/* Email com ação de copiar */}
              {contato.email && (
                <ListGroup.Item className="px-0 py-2 border-0">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>✉️ Email</strong>
                      <div className="text-muted mt-1">{contato.email}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => copiarTexto(contato.email!, 'Email')}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      📋
                    </Button>
                  </div>
                </ListGroup.Item>
              )}

              {/* Empresa */}
              {contato.empresa && (
                <ListGroup.Item className="px-0 py-2 border-0">
                  <strong>🏢 Empresa</strong>
                  <div className="text-muted mt-1">{contato.empresa}</div>
                </ListGroup.Item>
              )}

              {/* Cargo */}
              {contato.cargo && (
                <ListGroup.Item className="px-0 py-2 border-0">
                  <strong>💼 Cargo</strong>
                  <div className="text-muted mt-1">{contato.cargo}</div>
                </ListGroup.Item>
              )}

              {/* Data de Nascimento */}
              {contato.data_nascimento && (
                <ListGroup.Item className="px-0 py-2 border-0">
                  <strong>� Data de Nascimento</strong>
                  <div className="text-muted mt-1">
                    {new Date(contato.data_nascimento).toLocaleDateString('pt-BR')}
                    {calcularIdade(contato.data_nascimento) && (
                      <span className="ms-2">({calcularIdade(contato.data_nascimento)})</span>
                    )}
                  </div>
                </ListGroup.Item>
              )}

              {/* Endereço Completo */}
              {(contato.endereco || contato.cidade || contato.estado || contato.cep) && (
                <ListGroup.Item className="px-0 py-2 border-0">
                  <strong>📍 Endereço</strong>
                  <div className="text-muted mt-1" style={{ lineHeight: '1.6' }}>
                    {contato.endereco && <div>{contato.endereco}</div>}
                    {(contato.cidade || contato.estado) && (
                      <div>
                        {contato.cidade}{contato.cidade && contato.estado && ' - '}{contato.estado}
                      </div>
                    )}
                    {contato.cep && <div>CEP: {formatarCEP(contato.cep)}</div>}
                  </div>
                  {(contato.cidade || contato.endereco) && (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="mt-2"
                      onClick={() => {
                        const endereco = [contato.endereco, contato.cidade, contato.estado, contato.cep]
                          .filter(Boolean)
                          .join(', ');
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`, '_blank');
                      }}
                      style={{ fontSize: '11px', padding: '4px 10px' }}
                    >
                      📍 Ver no Mapa
                    </Button>
                  )}
                </ListGroup.Item>
              )}

              {/* Cliente desde */}
              <ListGroup.Item className="px-0 py-2 border-0">
                <strong>📅 Cliente desde</strong>
                <div className="text-muted mt-1">
                  {new Date(contato.criado_em).toLocaleDateString('pt-BR')}
                  <span className="ms-2">({calcularTempoCliente(contato.criado_em)})</span>
                </div>
              </ListGroup.Item>

              {/* Observações */}
              {contato.observacoes && (
                <ListGroup.Item className="px-0 py-2 border-0">
                  <strong>� Observações</strong>
                  <div 
                    className="text-muted mt-1" 
                    style={{ 
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f8f9fa',
                      padding: '10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      lineHeight: '1.5'
                    }}
                  >
                    {contato.observacoes}
                  </div>
                </ListGroup.Item>
              )}
            </ListGroup>

            {/* Ações Rápidas */}
            <div className="mt-3 d-flex flex-wrap gap-2">
              {contato.telefone && (
                <Button
                  size="sm"
                  variant="outline-success"
                  onClick={() => window.open(`https://wa.me/${contato.telefone?.replace(/\D/g, '')}`, '_blank')}
                  style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px' }}
                >
                  💬 WhatsApp
                </Button>
              )}
              {contato.email && (
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => window.open(`mailto:${contato.email}`, '_blank')}
                  style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '8px' }}
                >
                  ✉️ Enviar Email
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>

        {/* Card de Informações da Conversa */}
        <Card className="mb-3" style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <Card.Body>
            <h6 className="mb-3" style={{ fontWeight: 600, fontSize: '14px' }}>
              💬 Detalhes da Conversa
            </h6>

            <ListGroup variant="flush" style={{ fontSize: '13px' }}>
              <ListGroup.Item className="px-0 py-2 border-0">
                <strong>Status:</strong>
                <div className="mt-1">
                  <Badge 
                    bg={
                      conversa.status === 'entrada' ? 'danger' :
                      conversa.status === 'atendimento' ? 'warning' :
                      conversa.status === 'pendente' ? 'info' :
                      conversa.status === 'finalizada' ? 'success' : 'secondary'
                    }
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                  >
                    {conversa.status === 'entrada' ? '⏳ Aguardando' :
                     conversa.status === 'atendimento' ? '💬 Em Atendimento' :
                     conversa.status === 'pendente' ? '⏸️ Pendente' :
                     conversa.status === 'finalizada' ? '✅ Finalizada' :
                     conversa.status === 'perdida' ? '❌ Perdida' : conversa.status}
                  </Badge>
                </div>
              </ListGroup.Item>

              <ListGroup.Item className="px-0 py-2 border-0">
                <strong>Origem:</strong>
                <div className="text-muted mt-1">{conversa.origem || 'whatsapp'}</div>
              </ListGroup.Item>

              <ListGroup.Item className="px-0 py-2 border-0">
                <strong>Prioridade:</strong>
                <div className="mt-1">
                  <Badge 
                    bg={
                      conversa.prioridade === 'critica' ? 'danger' :
                      conversa.prioridade === 'alta' ? 'warning' :
                      conversa.prioridade === 'media' ? 'info' : 'secondary'
                    }
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                  >
                    {conversa.prioridade || 'média'}
                  </Badge>
                </div>
              </ListGroup.Item>

              {conversa.assunto && (
                <ListGroup.Item className="px-0 py-2 border-0">
                  <strong>Assunto:</strong>
                  <div className="text-muted mt-1">{conversa.assunto}</div>
                </ListGroup.Item>
              )}

              {conversa.operador && (
                <ListGroup.Item className="px-0 py-2 border-0">
                  <strong>Operador:</strong>
                  <div className="text-muted mt-1">
                    {conversa.operador.user?.username || 'Não atribuído'}
                  </div>
                </ListGroup.Item>
              )}

              <ListGroup.Item className="px-0 py-2 border-0">
                <strong>Criado em:</strong>
                <div className="text-muted mt-1">
                  {new Date(conversa.criado_em).toLocaleString('pt-BR')}
                </div>
              </ListGroup.Item>
            </ListGroup>
          </Card.Body>
        </Card>

        {/* Card de Tags */}
        <Card style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0" style={{ fontWeight: 600, fontSize: '14px' }}>
                🏷️ Tags
              </h6>
              <Button
                size="sm"
                variant="outline-primary"
                onClick={handleAddTag}
                style={{
                  fontSize: '11px',
                  padding: '4px 12px',
                  borderRadius: '8px'
                }}
              >
                + Adicionar
              </Button>
            </div>

            {tagsArray.length > 0 ? (
              <div className="d-flex flex-wrap gap-2">
                {tagsArray.map((tag, index) => (
                  <Badge
                    key={index}
                    bg="light"
                    text="dark"
                    style={{
                      fontSize: '12px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {tag}
                    <span
                      onClick={() => handleRemoveTag(tag)}
                      style={{
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        color: '#dc3545'
                      }}
                    >
                      ×
                    </span>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="text-muted text-center py-3" style={{ fontSize: '13px' }}>
                Nenhuma tag adicionada
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
