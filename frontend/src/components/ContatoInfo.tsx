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

            <ListGroup variant="flush" style={{ fontSize: '14px' }}>
              <ListGroup.Item className="d-flex justify-content-between align-items-start px-0 py-2 border-0">
                <div>
                  <strong>📱 Telefone:</strong>
                  <div className="text-muted">{contato.telefone || 'Não informado'}</div>
                </div>
              </ListGroup.Item>

              {contato.email && (
                <ListGroup.Item className="d-flex justify-content-between align-items-start px-0 py-2 border-0">
                  <div>
                    <strong>✉️ Email:</strong>
                    <div className="text-muted">{contato.email}</div>
                  </div>
                </ListGroup.Item>
              )}

              {contato.empresa && (
                <ListGroup.Item className="d-flex justify-content-between align-items-start px-0 py-2 border-0">
                  <div>
                    <strong>🏢 Empresa:</strong>
                    <div className="text-muted">{contato.empresa}</div>
                  </div>
                </ListGroup.Item>
              )}

              {contato.cargo && (
                <ListGroup.Item className="d-flex justify-content-between align-items-start px-0 py-2 border-0">
                  <div>
                    <strong>💼 Cargo:</strong>
                    <div className="text-muted">{contato.cargo}</div>
                  </div>
                </ListGroup.Item>
              )}
            </ListGroup>
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
                      conversa.status === 'atendimento' ? 'warning' : 'success'
                    }
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                  >
                    {conversa.status === 'entrada' ? '⏳ Aguardando' :
                     conversa.status === 'atendimento' ? '💬 Em Atendimento' : '✅ Resolvida'}
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
