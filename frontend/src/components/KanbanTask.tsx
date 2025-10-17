import type { Negocio } from "../types/Negocio.ts";
import type { Comentario } from "../types/Comentario.ts";
import {ContactDataTab} from "./tab/ContactDataTab.tsx";
import { Draggable } from "@hello-pangea/dnd";
import { useState } from "react";
import { Modal, Button, Form, Badge, Spinner, Alert, Tab, Tabs } from "react-bootstrap";
import backend_url from "../config/env.ts";
import { getToken } from "../function/validateToken.tsx";
import {TYPE_CHOICES} from "./utils/mediaUtils.tsx";
import {renderCustomAttributeValue, renderValueInput } from "./utils/customFieldRender.tsx";

interface KanbanCardProps {
  negocio: Negocio;
  index: number;
  onNegocioUpdate: (updatedNegocio: Negocio) => void;
  onNegocioDelete: (negocioId: number) => void;
  onCustomAttributeChange: (negocioId: number, attribute: string, value: any) => void;
};

export default function KanbanTask({ negocio, index, onNegocioUpdate, onNegocioDelete }: KanbanCardProps) {
  const [show, setShow] = useState(false);
  const [titulo, setTitulo] = useState(negocio.titulo);
  const [valor, setValor] = useState(negocio.valor ?? 0);
  const [contato, setContato] = useState(negocio.contato.nome);
  const [estagio, setEstagio] = useState(negocio.estagio.nome);
  const [comentarios, setComentarios] = useState<Comentario[]>(negocio.comentarios ?? []);
  const [novoComentario, setNovoComentario] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAttributeDeleteConfirm, setShowAttributeDeleteConfirm] = useState(false);
  const [attributeToDeleteId, setAttributeToDeleteId] = useState<number | null>(null);

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
  const [activeTab, setActiveTab] = useState("negocio");

  const handleSave = async () => {
    setSaveError(null);
    const payload = { titulo, valor, contato };
    const token = await getToken();
    if (!token) {
      setSaveError("Autenticação falhou. Não foi possível salvar.");
      return;
    }

    try {
      const response = await fetch(`${backend_url}negocios/${negocio.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Erro desconhecido ao atualizar negócio");
      }

      const data: Negocio = await response.json();
      console.log("Atualizado com sucesso:", data);

      onNegocioUpdate(data);

      setShow(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setSaveError(`Falha ao salvar os dados: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };

  const executeDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    setSaveError(null);

    const token = await getToken();
    if (!token) {
      setSaveError("Autenticação falhou. Não foi possível excluir.");
      setIsDeleting(false);
      return;
    }

    try {
      const response = await fetch(`${backend_url}negocios/${negocio.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 204) {
        console.log("Negócio excluído com sucesso:", negocio.id);

        onNegocioDelete(negocio.id);

        setShow(false);
      } else {
        const errorText = await response.text();
        throw new Error(`Falha ao excluir o negócio. Status: ${response.status}. Mensagem: ${errorText}`);
      }
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setSaveError(`Falha ao excluir o negócio: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const executeDeleteAttribute = async (attributeId: number) => {
    setShowAttributeDeleteConfirm(false);
    const token = await getToken();
    if (!token) {
      setFieldUpdateError("Autenticação falhou. Não foi possível excluir o campo.");
      return;
    }

    try {
      const response = await fetch(`${backend_url}atributos-personalizaveis/${attributeId}/delete/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 204) {
        console.log("Atributo excluído com sucesso:", attributeId);

        const updatedAttributes = (negocio.atributos_personalizados || []).filter(
          (attr) => attr.id !== attributeId
        );

        negocio.atributos_personalizados = updatedAttributes;
        onNegocioUpdate({ ...negocio, atributos_personalizados: updatedAttributes });

        setShowEditAttributeModal(false);
        setEditingAttribute(null);
      } else {
        const errorText = await response.text();
        throw new Error(`Falha ao excluir o atributo. Status: ${response.status}. Mensagem: ${errorText}`);
      }
    } catch (error) {
      console.error("Erro ao excluir atributo:", error);
      setFieldUpdateError(`Falha ao excluir o campo personalizável: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    } finally {
      setAttributeToDeleteId(null);
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
    if (!token) {
      setFieldCreationError("Autenticação falhou. Não foi possível criar o campo.");
      setIsSavingField(false);
      return;
    }

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

      const newAttribute = await response.json();
      console.log("Campo personalizável criado com sucesso:", newAttribute);

      const updatedAttributes = [...(negocio.atributos_personalizados || []), newAttribute];

      negocio.atributos_personalizados = updatedAttributes;
      onNegocioUpdate({ ...negocio, atributos_personalizados: updatedAttributes });

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
    if (!token) {
      setFieldUpdateError("Autenticação falhou. Não foi possível atualizar o campo.");
      setIsUpdatingField(false);
      return;
    }

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
    onNegocioUpdate({ ...negocio, atributos_personalizados: updatedAttributes });

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

  const handleAddComentario = async () => {
    if (!novoComentario.trim()) return;

    setCommentError(null);
    const token = await getToken();
    if (!token) {
      setCommentError("Autenticação falhou. Não foi possível adicionar o comentário.");
      return;
    }

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
      setCommentError(`Falha ao adicionar o comentário: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
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
            onClick={() => {
              setShow(true);
              setSaveError(null);
              setCommentError(null);
            }}
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
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => k && setActiveTab(k)}
            className="mb-4"
            style={{ borderBottom: '2px solid #e0e0e0' }}
          >
            <Tab eventKey="negocio" title="Negócio & Comentários" tabClassName="text-primary fw-bold">
              <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
                <div style={{ flex: 2 }}>
                  {saveError && (
                    <Alert variant="danger" onClose={() => setSaveError(null)} dismissible className="mb-3">
                      {saveError}
                    </Alert>
                  )}
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
                      <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Contato (Nome)</Form.Label>
                      <Form.Control
                        type="text"
                        value={contato}
                        onChange={(e) => setContato(e.target.value)}
                        style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem" }}
                      />
                      <Form.Text className="text-muted">
                        Outros dados do contato estão na aba "Dados do Contato".
                      </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>Estágio</Form.Label>
                      <Form.Control
                        type="text"
                        value={estagio}
                        onChange={(e) => setEstagio(e.target.value)}
                        disabled
                        style={{ borderRadius: "0.6rem", borderColor: "#d0d0d0", padding: "0.5rem", backgroundColor: "#e9ecef" }}
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
                        {(negocio.atributos_personalizados && negocio.atributos_personalizados.length > 0) ? (
                            negocio.atributos_personalizados.map((atributo, idx) => (
                                <div key={atributo.id || idx} style={{ marginBottom: "0.5rem" }}>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <strong>{atributo.label}</strong>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => {
                                                setEditingAttribute(atributo);
                                                const initialValue = atributo.valor
                                                    ? atributo.valor
                                                    : typeof atributo.valor_formatado === "string"
                                                        ? atributo.valor_formatado
                                                        : "";
                                                setEditFieldValue(initialValue);
                                                setShowEditAttributeModal(true);
                                            }}
                                            style={{ padding: "0.2rem 0.5rem" }}
                                        >
                                            Editar
                                        </Button>
                                    </div>
                                    {renderCustomAttributeValue(atributo)}
                                </div>
                            ))
                        ) : (
                            <p className="text-muted">Nenhum campo personalizado adicionado.</p>
                        )}
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
                  {commentError && (
                    <Alert variant="danger" onClose={() => setCommentError(null)} dismissible className="my-2">
                      {commentError}
                    </Alert>
                  )}
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
            </Tab>

            <Tab eventKey="contato" title="Dados do Contato" tabClassName="text-success fw-bold">
                <ContactDataTab contato={negocio.contato} />
            </Tab>
          </Tabs>
        </Modal.Body>

        <Modal.Footer style={{ borderTop: "none", justifyContent: "space-between" }}>
          <Button
            style={{
              borderRadius: "0.5rem",
              fontWeight: 500,
              backgroundColor: "#7ed957",
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
              onClick={() => setShowDeleteConfirm(true)}
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

      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">Confirmação de Exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Você tem certeza que deseja excluir o negócio <strong>"{negocio.titulo}"</strong>?</p>
          <p className="text-danger fw-bold">Esta ação é irreversível.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={executeDelete} disabled={isDeleting}>
            {isDeleting ? 'Excluindo...' : 'Excluir Definitivamente'}
          </Button>
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
      >
        <Modal.Header closeButton style={{ backgroundColor: "#316dbd", color: "#fff", borderTopLeftRadius: "0.5rem", borderTopRightRadius: "0.5rem" }}>
          <Modal.Title>Editar Atributo: {editingAttribute?.label}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingAttribute && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontWeight: 600 }}>Valor Atual</Form.Label>
                {renderValueInput(editingAttribute.type, editFieldValue, setEditFieldValue)}
                <Form.Text className="text-muted">
                    Tipo: {editingAttribute.type}. {editingAttribute.type === 'file' && 'Selecione um novo arquivo para substituir o existente.'}
                </Form.Text>
              </Form.Group>
            </Form>
          )}

          {fieldUpdateError && (
              <Alert variant="danger" onClose={() => setFieldUpdateError(null)} dismissible>
                  {fieldUpdateError}
              </Alert>
          )}
        </Modal.Body>
        <Modal.Footer style={{ justifyContent: "space-between" }}>
            <Button
                variant="danger"
                onClick={() => {
                    if (editingAttribute?.id) {
                        setAttributeToDeleteId(editingAttribute.id);
                        setShowAttributeDeleteConfirm(true);
                    }
                }}
            >
                Excluir Campo
            </Button>
            <div>
                <Button variant="secondary" onClick={() => setShowEditAttributeModal(false)} className="me-2">
                    Cancelar
                </Button>
                <Button
                    style={{ backgroundColor: "#316dbd", borderColor: "#316dbd" }}
                    onClick={handleUpdateAttribute}
                    disabled={isUpdatingField}
                >
                    {isUpdatingField ? (
                        <>
                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                            Atualizando...
                        </>
                    ) : (
                        "Salvar Alterações"
                    )}
                </Button>
            </div>
        </Modal.Footer>
      </Modal>

      <Modal show={showAttributeDeleteConfirm} onHide={() => setShowAttributeDeleteConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">Confirmação de Exclusão de Atributo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Você tem certeza que deseja excluir este campo personalizável?</p>
          <p className="text-danger fw-bold">Esta ação é irreversível.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAttributeDeleteConfirm(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => attributeToDeleteId && executeDeleteAttribute(attributeToDeleteId)}>
            Excluir Definitivamente
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}