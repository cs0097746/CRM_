import type { Negocio } from "../types/Negocio.ts";
import type { Comentario } from "../types/Comentario.ts";
import { Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import { Modal, Button, Form, Badge, Spinner, Alert } from "react-bootstrap";
import backend_url from "../config/env.ts";
import { getToken } from "../function/validateToken.tsx";

interface KanbanCardProps {
  negocio: Negocio;
  index: number;
}

// Lista de tipos de dados suportados
const TYPE_CHOICES = [
  'string', 'text', 'integer', 'float', 'boolean', 'date', 'datetime', 'time', 'file'
];

// Função auxiliar para inferir o tipo de mídia
const getMediaType = (url: string): 'image' | 'video' | 'pdf' | 'text' | 'unknown' => {
  const cleanUrl = url.split('?')[0];
  const extension = cleanUrl.split('.').pop()?.toLowerCase();
  if (!extension) return 'unknown';

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  const pdfExtensions = ['pdf'];
  const textExtensions = ['txt', 'json', 'csv'];

  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  if (pdfExtensions.includes(extension)) return 'pdf';
  if (textExtensions.includes(extension) || extension.length <= 4) return 'text';
  return 'unknown';
};

// Componente para preview de arquivos
interface FileAttributePreviewProps {
  atributo: any;
  backendUrl: string;
}

const renderPreviewContent = (url: string, type: string, fileName: string) => {
  switch (type) {
    case 'image':
      return (
        <img
          src={url}
          alt={fileName}
          style={{
            maxWidth: '100%',
            maxHeight: '400px',
            objectFit: 'contain',
            marginTop: '0.5rem',
            borderRadius: '0.5rem'
          }}
        />
      );
    case 'video':
      return (
        <video
          src={url}
          controls
          style={{
            width: '100%',
            maxHeight: '400px',
            marginTop: '0.5rem',
            borderRadius: '0.5rem'
          }}
        >
          Seu navegador não suporta a tag de vídeo.
        </video>
      );
    case 'pdf':
      return (
        <iframe
          src={url}
          style={{
            width: '100%',
            height: '500px',
            border: '1px solid #ccc',
            marginTop: '0.5rem',
            borderRadius: '0.5rem'
          }}
          title={`Preview de PDF: ${fileName}`}
        />
      );
    case 'text':
      return (
        <iframe
          src={url}
          style={{
            width: '100%',
            height: '300px',
            border: '1px solid #ccc',
            marginTop: '0.5rem',
            borderRadius: '0.5rem'
          }}
          title={`Preview de Texto: ${fileName}`}
        />
      );
    default:
      return <p className="text-muted mt-2">Nenhum preview disponível para este tipo de arquivo. Por favor, utilize o link de download.</p>;
  }
};

const FileAttributePreview: React.FC<FileAttributePreviewProps> = ({ atributo, backendUrl }) => {
  const { valor, arquivo, valor_formatado } = atributo;
  const [showPreview, setShowPreview] = useState(false);

  const fileUrl = valor_formatado || arquivo;
  const cleanFileUrl = fileUrl ? fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl : '';
  const fullFileUrl = cleanFileUrl.startsWith('http') ? cleanFileUrl : `${backendUrl}${cleanFileUrl}`;
  const mediaType = getMediaType(fullFileUrl);
  const fileName = valor || 'Arquivo';

  if (!cleanFileUrl) {
    return <Form.Control type="text" value="Nenhum arquivo" readOnly style={{ marginBottom: "0.5rem" }} />;
  }

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div className="d-flex align-items-center gap-2 mt-1">
        {mediaType !== 'unknown' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            style={{ padding: '0.25rem 0.5rem', borderRadius: '0.3rem' }}
          >
            {showPreview ? "Esconder Preview" : "Visualizar Arquivo"}
          </Button>
        )}
        <Button
          variant="link"
          href={fullFileUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: 0, textDecoration: 'underline' }}
        >
          Baixar ({fileName})
        </Button>
      </div>
      {showPreview && (
        <div
          style={{
            marginTop: '0.5rem',
            border: '1px solid #eee',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            backgroundColor: '#fff',
            maxHeight: '600px',
            overflowY: 'auto'
          }}
        >
          {renderPreviewContent(fullFileUrl, mediaType, fileName)}
        </div>
      )}
    </div>
  );
};

// Componente principal
export default function KanbanTask({ negocio, index }: KanbanCardProps) {
  const [show, setShow] = useState(false);
  const [titulo, setTitulo] = useState(negocio.titulo);
  const [valor, setValor] = useState(negocio.valor ?? 0);
  const [contato, setContato] = useState(negocio.contato.nome);
  const [estagio, setEstagio] = useState(negocio.estagio.nome);
  const [comentarios, setComentarios] = useState<Comentario[]>(negocio.comentarios ?? []);
  const [novoComentario, setNovoComentario] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldValue, setNewFieldValue] = useState<string | File>("");
  const [newFieldType, setNewFieldType] = useState("string");
  const [isSavingField, setIsSavingField] = useState(false);
  const [fieldCreationError, setFieldCreationError] = useState<string | null>(null);
  const [showEditAttributeModal, setShowEditAttributeModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<any | null>(null);
  const [editFieldValue, setEditFieldValue] = useState<string | File>("");
  const [isUpdatingField, setIsUpdatingField] = useState(false);
  const [fieldUpdateError, setFieldUpdateError] = useState<string | null>(null);

  const handleSave = async () => {
    const payload = { titulo, valor, contato, estagio };
    const token = await getToken();
    if (!token) throw new Error("Autenticação falhou.");

    try {
      const response = await fetch(`${backend_url}negocios/${negocio.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Erro ao atualizar negócio");

      const data = await response.json();
      console.log("Atualizado com sucesso:", data);
      setShow(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Falha ao salvar os dados.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir o negócio "${negocio.titulo}"? Esta ação é irreversível.`)) {
      return;
    }

    setIsDeleting(true);

    const token = await getToken();
    if (!token) throw new Error("Autenticação falhou.");

    try {
      const response = await fetch(`${backend_url}negocios/${negocio.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 204) {
        console.log("Negócio excluído com sucesso:", negocio.id);
        alert("Negócio excluído com sucesso! Pode ser necessário recarregar a página.");
        setShow(false);
      } else {
        const errorText = await response.text();
        throw new Error(`Falha ao excluir o negócio. Status: ${response.status}. Mensagem: ${errorText}`);
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      alert(`Falha ao excluir o negócio: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateCustomField = async () => {
    if (!newFieldLabel.trim() || !newFieldType.trim()) {
      setFieldCreationError("Por favor, preencha a etiqueta (Label) e o Tipo.");
      return;
    }

    const isFile = newFieldType === 'file';
    if (isFile && !(newFieldValue instanceof File)) {
      setFieldCreationError("Por favor, selecione um arquivo.");
      return;
    }

    setIsSavingField(true);
    setFieldCreationError(null);
    const token = await getToken();
    if (!token) throw new Error("Autenticação falhou.");

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    let body: BodyInit;

    if (isFile) {
      const formData = new FormData();
      formData.append('label', newFieldLabel.trim());
      formData.append('type', newFieldType);
      if (newFieldValue instanceof File) {
        formData.append('arquivo', newFieldValue);
      }
      formData.append('valor', newFieldValue instanceof File ? newFieldValue.name : String(newFieldValue).trim());
      body = formData;
    } else {
      headers['Content-Type'] = 'application/json';
      const payload = {
        label: newFieldLabel.trim(),
        valor: String(newFieldValue).trim(),
        type: newFieldType,
      };
      body = JSON.stringify(payload);
    }

    try {
      const response = await fetch(`${backend_url}atributos-personalizaveis/${negocio.id}/`, {
        method: "POST",
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail || JSON.stringify(errorData);
        throw new Error(`Erro ao criar campo: ${errorMessage}`);
      }

      const data = await response.json();
      console.log("Campo personalizável criado com sucesso:", data);

      setNewFieldLabel("");
      setNewFieldValue("");
      setNewFieldType("string");
      setShowCustomFieldModal(false);
    } catch (error) {
      console.error("Erro na criação do campo:", error);
      setFieldCreationError(`Falha na criação do campo: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsSavingField(false);
    }
  };

  const handleUpdateAttribute = async () => {
    if (!editingAttribute) return;

    const isFile = editingAttribute.type === 'file';
    if (isFile && !(editFieldValue instanceof File) && !editingAttribute.valor) {
      setFieldUpdateError("Por favor, selecione um arquivo.");
      return;
    }

    setIsUpdatingField(true);
    setFieldUpdateError(null);
    const token = await getToken();
    if (!token) throw new Error("Autenticação falhou.");

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    let body: BodyInit;

    if (isFile) {
      const formData = new FormData();
      formData.append('label', editingAttribute.label);
      formData.append('type', editingAttribute.type);
      if (editFieldValue instanceof File) {
        formData.append('arquivo', editFieldValue);
        formData.append('valor', editFieldValue.name);
      } else {
        formData.append('valor', editingAttribute.valor || '');
      }
      body = formData;
    } else {
      headers['Content-Type'] = 'application/json';
      const payload = {
        label: editingAttribute.label,
        valor: String(editFieldValue).trim(),
        type: editingAttribute.type,
      };
      body = JSON.stringify(payload);
    }

    try {
      const response = await fetch(`${backend_url}atributos-personalizaveis/${editingAttribute.id}/update/`, {
        method: "PATCH",
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail || JSON.stringify(errorData);
        throw new Error(`Erro ao atualizar campo: ${errorMessage}`);
      }

      const updatedAttribute = await response.json();
      console.log("Campo atualizado com sucesso:", updatedAttribute);

    const updatedAttributes = (negocio.atributos_personalizados || []).map((attr) =>
      attr.id === editingAttribute.id ? updatedAttribute : attr
    );

    negocio.atributos_personalizados = updatedAttributes;

      setShowEditAttributeModal(false);
      setEditingAttribute(null);
      setEditFieldValue("");
    } catch (error) {
      console.error("Erro na atualização do campo:", error);
      setFieldUpdateError(`Falha na atualização do campo: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsUpdatingField(false);
    }
  };

  const renderValueInput = (currentType: string, value: string | File, onChange: (value: string | File) => void) => {
    switch (currentType) {
      case 'boolean':
        return (
          <Form.Select
            value={typeof value === 'string' ? value : String(value)}
            onChange={(e) => onChange(e.target.value)}
            style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
          >
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </Form.Select>
        );
      case 'integer':
      case 'float':
        return (
          <Form.Control
            type="number"
            step={currentType === 'integer' ? '1' : '0.01'}
            placeholder={currentType === 'integer' ? "Ex: 42" : "Ex: 3.14"}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
          />
        );
      case 'date':
        return (
          <Form.Control
            type="date"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
          />
        );
      case 'datetime':
        return (
          <Form.Control
            type="datetime-local"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
          />
        );
      case 'time':
        return (
          <Form.Control
            type="time"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
          />
        );
      case 'text':
        return (
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Digite o valor do campo (texto longo)"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
          />
        );
      case 'file':
        return (
          <Form.Control
            type="file"
            onChange={(e) => {
              const target = e.target as HTMLInputElement;
              onChange(target.files?.[0] || "");
            }}
            style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
          />
        );
      case 'string':
      default:
        return (
          <Form.Control
            type="text"
            placeholder="Digite o valor do campo"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
          />
        );
    }
  };

  const handleAddComentario = async () => {
    if (!novoComentario.trim()) return;

    const token = await getToken();
    if (!token) throw new Error("Autenticação falhou.");

    const payload = {
      mensagem: novoComentario.trim(),
    };

    try {
      const response = await fetch(`${backend_url}negocios/${negocio.id}/comentarios/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Falha desconhecida ao adicionar comentário.");
      }

      const newCommentFromServer: Comentario = await response.json();
      setComentarios((prev) => [newCommentFromServer, ...prev]);
      setNovoComentario("");
    } catch (error) {
      console.error("Erro na criação do comentário:", error);
      alert(`Falha ao adicionar o comentário: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };

  const renderCustomAttributeValue = (atributo: any) => {
    const { type, valor } = atributo;

    switch (type) {
      case "boolean":
        const isTrue = atributo.valor_formatado === true;
        return (
          <div className="d-flex gap-3 mt-1">
            <Form.Check type="checkbox" id={`sim-${atributo.id}`} label="Sim" checked={isTrue} readOnly />
            <Form.Check type="checkbox" id={`nao-${atributo.id}`} label="Não" checked={!isTrue} readOnly />
          </div>
        );
      case "file":
        return <FileAttributePreview atributo={atributo} backendUrl={backend_url} />;
      case "integer":
      case "float":
        return <Form.Control type="number" value={valor} readOnly style={{ marginBottom: "0.5rem" }} />;
      case "date":
        return <Form.Control type="text" value={valor ? new Date(valor).toLocaleDateString("pt-BR") : ""} readOnly style={{ marginBottom: "0.5rem" }} />;
      case "datetime":
        return <Form.Control type="text" value={valor ? new Date(valor).toLocaleString("pt-BR", { hour12: false }) : ""} readOnly style={{ marginBottom: "0.5rem" }} />;
      case "time":
        return <Form.Control type="text" value={valor ? new Date(`1970-01-01T${valor}`).toLocaleTimeString("pt-BR", { hour12: false, hour: '2-digit', minute: '2-digit' }) : ""} readOnly style={{ marginBottom: "0.5rem" }} />;
      case "text":
      case "string":
      default:
        return <Form.Control as="textarea" rows={3} value={valor || ""} readOnly style={{ marginBottom: "0.5rem" }} />;
    }
  };

  return (
    <>
      <Draggable draggableId={String(negocio.id)} index={index}>
        {(provided, snapshot) => (
          <div
            className="card mb-3"
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={{
              ...provided.draggableProps.style,
              cursor: "pointer",
              borderRadius: "1rem",
              backgroundColor: snapshot.isDragging ? "#eef5ff" : "#ffffff",
              boxShadow: snapshot.isDragging
                ? "0 12px 25px rgba(49,109,189,0.25)"
                : "0 6px 18px rgba(0,0,0,0.08)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
            }}
            onClick={() => setShow(true)}
          >
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <h6
                  style={{
                    color: "#316dbd",
                    fontWeight: 700,
                    fontSize: "1rem",
                    margin: 0,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={negocio.titulo}
                >
                  {negocio.titulo}
                </h6>
                {valor > 0 && (
                  <Badge
                    pill
                    style={{
                      backgroundColor: "#7ed957",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      padding: "0.4rem 0.7rem",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    }}
                  >
                    R${valor}
                  </Badge>
                )}
              </div>
              <p style={{ fontSize: "0.85rem", color: "#8c52ff", margin: "4px 0" }}>
                👤 Contato: {negocio.contato.nome}
              </p>
              <p style={{ fontSize: "0.8rem", color: "#6c757d", margin: "4px 0" }}>
                📅 Criado em: {new Date(negocio.criado_em).toLocaleDateString("pt-BR")}
              </p>
              <p style={{ fontSize: "0.85rem", color: "#8c52ff", margin: "4px 0" }}>
                🏷 Estágio: {negocio.estagio.nome}
              </p>
            </div>
          </div>
        )}
      </Draggable>

      <Modal show={show} onHide={() => setShow(false)} size="xl" centered dialogClassName="modal-xxl">
        <Modal.Header
          closeButton
          style={{
            background: "linear-gradient(135deg, #316dbd, #8c52ff)",
            color: "#fff",
            borderBottom: "none",
            borderTopLeftRadius: "1rem",
            borderTopRightRadius: "1rem",
          }}
        >
          <Modal.Title>Editar Negócio</Modal.Title>
          <small className="text-muted" style={{ color: "#e0e0e0", fontSize: "0.85rem" }}>
            #{negocio.id}
          </small>
        </Modal.Header>

        <Modal.Body
          style={{
            backgroundColor: "#f9fafe",
            padding: "2rem",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
            <div style={{ flex: 2 }}>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Título</Form.Label>
                  <Form.Control
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Valor</Form.Label>
                  <Form.Control
                    type="number"
                    value={valor}
                    onChange={(e) => setValor(Number(e.target.value))}
                    style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Contato</Form.Label>
                  <Form.Control
                    type="text"
                    value={contato}
                    onChange={(e) => setContato(e.target.value)}
                    style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Estágio</Form.Label>
                  <Form.Control
                    type="text"
                    value={estagio}
                    onChange={(e) => setEstagio(e.target.value)}
                    style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Criado em</Form.Label>
                  <Form.Control
                    type="text"
                    value={new Date(negocio.criado_em).toLocaleString("pt-BR")}
                    disabled
                    style={{
                      borderRadius: "0.6rem",
                      backgroundColor: "#e9ecef",
                      padding: "0.5rem",
                    }}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Atributos Personalizados</Form.Label>
                  <div style={{ maxHeight: "250px", overflowY: "auto", paddingRight: "0.5rem" }}>
                    {negocio.atributos_personalizados?.map((atributo, idx) => (
                      <div key={atributo.id || idx} style={{ marginBottom: "0.5rem" }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <strong>{atributo.label}</strong>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setEditingAttribute(atributo);
                                setEditFieldValue(
                                  atributo.valor
                                    ? atributo.valor
                                    : typeof atributo.valor_formatado === "string"
                                    ? atributo.valor_formatado
                                    : ""
                                );
                              setShowEditAttributeModal(true);
                            }}
                            style={{ padding: "0.2rem 0.5rem" }}
                          >
                            Editar
                          </Button>
                        </div>
                        {renderCustomAttributeValue(atributo)}
                      </div>
                    ))}
                  </div>
                </Form.Group>
              </Form>
            </div>

            <div
              style={{
                flex: 1,
                backgroundColor: "#ffffff",
                borderRadius: "0.8rem",
                padding: "1rem",
                height: "100%",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <h6 style={{ color: "#316dbd", fontWeight: 700 }}>Comentários</h6>
              <div style={{ flex: 1, overflowY: "auto", marginTop: "1rem" }}>
                {comentarios.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      marginBottom: "1rem",
                      padding: "0.5rem",
                      backgroundColor: "#f1f5ff",
                      borderRadius: "0.5rem",
                      wordWrap: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    <strong>{c.criado_por}:</strong> {c.mensagem}
                    <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>
                      {new Date(c.criado_em).toLocaleString("pt-BR")}
                    </div>
                  </div>
                ))}
              </div>

              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Adicionar comentário..."
                style={{ marginTop: "0.5rem", borderRadius: "0.5rem" }}
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
              />
              <Button
                style={{ marginTop: "0.5rem", backgroundColor: "#316dbd", borderColor: "#316dbd" }}
                onClick={handleAddComentario}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer style={{ borderTop: "none", justifyContent: "space-between" }}>
          <Button
            style={{
              borderRadius: "0.5rem",
              fontWeight: 500,
              backgroundColor: "#29fc00",
              border: "none",
              color: "#fff",
            }}
            onClick={() => setShowCustomFieldModal(true)}
          >
            Criar Campo Personalizável
          </Button>

          <div>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
              style={{
                borderRadius: "0.5rem",
                fontWeight: 500,
                marginRight: "0.5rem",
              }}
            >
              {isDeleting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>

            <Button
              onClick={handleSave}
              style={{
                backgroundColor: "#316dbd",
                borderColor: "#316dbd",
                borderRadius: "0.5rem",
                fontWeight: 600,
                padding: "0.45rem 1.2rem",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#245a9b")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#316dbd")}
            >
              Salvar
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showCustomFieldModal}
        onHide={() => {
          setShowCustomFieldModal(false);
          setFieldCreationError(null);
          setNewFieldLabel("");
          setNewFieldValue("");
          setNewFieldType("string");
        }}
        centered
      >
        <Modal.Header closeButton style={{ backgroundColor: "#8c52ff", color: "#fff", borderTopLeftRadius: "0.5rem", borderTopRightRadius: "0.5rem" }}>
          <Modal.Title>Novo Campo Personalizável</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 600 }}>Etiqueta (Label)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ex: Código do Projeto"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                style={{ borderRadius: "0.5rem", borderColor: "#ccc" }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 600 }}>Tipo de Dado</Form.Label>
              <Form.Select
                value={newFieldType}
                onChange={(e) => {
                  setNewFieldType(e.target.value);
                  setNewFieldValue("");
                }}
                style={{ borderRadius: "0.5rem", borderColor: "#ccc" }}
              >
                {TYPE_CHOICES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label style={{ fontWeight: 600 }}>Valor Inicial {newFieldType === 'file' && '(Arquivo)'}</Form.Label>
              {renderValueInput(newFieldType, newFieldValue, setNewFieldValue)}
              <Form.Text className="text-muted">
                {newFieldType === 'file'
                  ? 'O arquivo será enviado para o servidor.'
                  : 'O valor será armazenado como texto no banco de dados.'
                }
              </Form.Text>
            </Form.Group>

            {fieldCreationError && (
              <Alert variant="danger" onClose={() => setFieldCreationError(null)} dismissible>
                {fieldCreationError}
              </Alert>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCustomFieldModal(false);
              setNewFieldLabel("");
              setNewFieldValue("");
              setNewFieldType("string");
            }}
          >
            Cancelar
          </Button>
          <Button
            style={{ backgroundColor: "#8c52ff", borderColor: "#8c52ff" }}
            onClick={handleCreateCustomField}
            disabled={isSavingField}
          >
            {isSavingField ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Criando...
              </>
            ) : (
              "Criar Campo"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showEditAttributeModal}
        onHide={() => {
          setShowEditAttributeModal(false);
          setEditingAttribute(null);
          setEditFieldValue("");
          setFieldUpdateError(null);
        }}
        centered
      >
        <Modal.Header closeButton style={{ backgroundColor: "#8c52ff", color: "#fff", borderTopLeftRadius: "0.5rem", borderTopRightRadius: "0.5rem" }}>
          <Modal.Title>Editar Campo Personalizável</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 600 }}>Etiqueta (Label)</Form.Label>
              <Form.Control
                type="text"
                value={editingAttribute?.label || ""}
                readOnly
                style={{ borderRadius: "0.5rem", borderColor: "#ccc", backgroundColor: "#e9ecef" }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label style={{ fontWeight: 600 }}>Tipo de Dado</Form.Label>
              <Form.Control
                type="text"
                value={editingAttribute?.type || ""}
                readOnly
                style={{ borderRadius: "0.5rem", borderColor: "#ccc", backgroundColor: "#e9ecef" }}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label style={{ fontWeight: 600 }}>
                Valor {editingAttribute?.type === 'file' && '(Arquivo)'}
              </Form.Label>
              {editingAttribute && renderValueInput(editingAttribute.type, editFieldValue, setEditFieldValue)}
              <Form.Text className="text-muted">
                {editingAttribute?.type === 'file'
                  ? 'Selecione um novo arquivo para substituir o atual, ou deixe em branco para manter.'
                  : 'O valor será armazenado como texto no banco de dados.'
                }
              </Form.Text>
            </Form.Group>

            {fieldUpdateError && (
              <Alert variant="danger" onClose={() => setFieldUpdateError(null)} dismissible>
                {fieldUpdateError}
              </Alert>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowEditAttributeModal(false);
              setEditingAttribute(null);
              setEditFieldValue("");
            }}
          >
            Cancelar
          </Button>
          <Button
            style={{ backgroundColor: "#8c52ff", borderColor: "#8c52ff" }}
            onClick={handleUpdateAttribute}
            disabled={isUpdatingField}
          >
            {isUpdatingField ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Atualizando...
              </>
            ) : (
              "Atualizar Campo"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}