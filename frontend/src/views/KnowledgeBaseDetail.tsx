import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Container, Spinner, Alert, Table, Button, Badge, Card, Row, Col } from 'react-bootstrap';
import { FaArrowLeft, FaEdit, FaPlus, FaTrash, FaClipboardList } from 'react-icons/fa';
import type { KnowledgeBaseSet, KnowledgeBaseValue, KnowledgeBaseField } from '../types/KnowledgeBase.ts';
import backend_url from '../config/env.ts';
import { getToken } from '../function/validateToken.tsx';
import KnowledgeBaseEntryModal from "../components/KnowledgeBaseEntryModal.tsx";
import KnowledgeBaseFieldModal from "../components/KnowledgeBaseFieldModal.tsx";

const api = axios.create({ baseURL: `${backend_url}` });

interface ValueWithEntryId extends KnowledgeBaseValue {
    entry_id: number;
}

const getDisplayValue = (value: any, type: string): string => {
    if (value === null || value === undefined) {
        return "-";
    }
    if (type === 'BOOLEAN') {
        return value === true ? 'Sim' : 'Não';
    }
    return String(value);
};

interface KnowledgeBaseSetWithValues extends Omit<KnowledgeBaseSet, 'fields'> {
    fields: (KnowledgeBaseField & { values: ValueWithEntryId[] })[];
}

export default function KnowledgeBaseSetDetail() {
  const { kbSetId } = useParams<{ kbSetId: string }>();

  const [kbSet, setKbSet] = useState<KnowledgeBaseSetWithValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedField, setSelectedField] = useState<KnowledgeBaseField | null>(null);
  const [editingValue, setEditingValue] = useState<ValueWithEntryId | null>(null);
  const showEntryModal = !!selectedField;

  const [showCreateFieldModal, setShowCreateFieldModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingFieldId, setDeletingFieldId] = useState<number | null>(null);


  const fetchKnowledgeSetDetail = useCallback(async () => {
    if (!kbSetId) {
      setErrorMessage("ID do Conjunto de Conhecimento não fornecido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Autenticação falhou. Token não disponível.");
      }

      const res = await api.get<KnowledgeBaseSet>(`sets/${kbSetId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const allValuesByFieldId: Record<number, ValueWithEntryId[]> = {};
      res.data.fields.forEach(f => allValuesByFieldId[f.id] = []);

      res.data.entries.forEach(entry => {
          entry.values.forEach(value => {
              if (allValuesByFieldId[value.field.id]) {
                  const valueWithEntryId: ValueWithEntryId = {
                      ...value,
                      entry_id: entry.id
                  } as ValueWithEntryId;
                  allValuesByFieldId[value.field.id].push(valueWithEntryId);
              }
          });
      });

      const kbSetWithValuesPerField: KnowledgeBaseSetWithValues = {
          ...res.data,
          fields: res.data.fields.map(field => ({
              ...field,
              values: allValuesByFieldId[field.id] || []
          }))
      };

      setKbSet(kbSetWithValuesPerField);

    } catch (err) {
      console.error(`Erro ao buscar set ${kbSetId}:`, err);

      let message = "Erro de conexão ou desconhecido.";
      if (axios.isAxiosError(err) && err.response) {
        message = err.response.data.detail || `Erro do Servidor: ${err.response.status}.`;
      } else if (err instanceof Error) {
        message = err.message;
      }

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, [kbSetId]);

  useEffect(() => {
    fetchKnowledgeSetDetail();
  }, [fetchKnowledgeSetDetail]);

  const handleDeleteField = async (fieldId: number, fieldName: string) => {
    if (!window.confirm(`⚠️ Tem certeza que deseja EXCLUIR o campo "${fieldName}" (ID: ${fieldId})? Todos os valores associados a este campo serão PERDIDOS!`)) {
      return;
    }

    setDeletingFieldId(fieldId);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Autenticação falhou. Token não disponível.");
      }

      await api.delete(`fields/${fieldId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchKnowledgeSetDetail();
      alert(`Campo "${fieldName}" excluído com sucesso!`);

    } catch (err) {
      console.error(`Erro ao deletar campo ${fieldId}:`, err);

      let message = `Erro ao deletar campo "${fieldName}".`;
      if (axios.isAxiosError(err) && err.response && err.response.data.detail) {
        message = err.response.data.detail;
      } else if (err instanceof Error) {
        message = err.message;
      }
      alert(`Falha na exclusão do campo: ${message}`);
    } finally {
      setDeletingFieldId(null);
    }
  };

  const handleDeleteEntry = async (entryId: number, fieldName: string) => {
    if (!window.confirm(`Tem certeza que deseja EXCLUIR a entrada de ID ${entryId} (Valor do campo ${fieldName})? Esta ação irá remover o valor completamente.`)) {
      return;
    }

    setDeletingId(entryId);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Autenticação falhou. Token não disponível.");
      }

      await api.delete(`entries/${entryId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await fetchKnowledgeSetDetail();
      alert(`Entrada de ID ${entryId} excluída com sucesso!`);

    } catch (err) {
      console.error(`Erro ao deletar entrada ${entryId}:`, err);

      let message = `Erro ao deletar entrada ${entryId}.`;
      if (axios.isAxiosError(err) && err.response && err.response.data.detail) {
        message = err.response.data.detail;
      } else if (err instanceof Error) {
        message = err.message;
      }
      alert(`Falha na exclusão: ${message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateValue = (field: KnowledgeBaseField) => {
    setEditingValue(null);
    setSelectedField(field);
  };

  const handleEditValue = (field: KnowledgeBaseField, value: ValueWithEntryId) => {
    setEditingValue(value);
    setSelectedField(field);
  };

  const handleCloseEntryModal = () => {
    setSelectedField(null);
    setEditingValue(null);
  };

  const handleCloseFieldModal = () => {
    setShowCreateFieldModal(false);
  };

  const handleSaveSuccess = () => {
    handleCloseEntryModal();
    handleCloseFieldModal();
    fetchKnowledgeSetDetail();
  };

  if (loading) return (
    <Container className="py-5 text-center" style={{ minHeight: '100vh' }}>
      <Spinner animation="border" variant="primary" />
      <p className="mt-2 text-muted">Carregando detalhes do Conjunto...</p>
    </Container>
  );

  if (errorMessage) return (
    <Container className="py-5" style={{ minHeight: '100vh' }}>
      <Alert variant="danger">
        ⚠️ <strong>Erro</strong> {errorMessage}
      </Alert>
      <Button variant="secondary" onClick={() => window.history.back()}><FaArrowLeft className="me-2" /> Voltar</Button>
    </Container>
  );

  if (!kbSet) return (
    <Container className="py-5" style={{ minHeight: '100vh' }}>
      <Alert variant="warning">Dados não carregados.</Alert>
    </Container>
  );

  const totalValues = kbSet.fields.reduce((acc, field) => acc + (field.values?.length || 0), 0);

  return (
    <Container className="py-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold" style={{ color: "#316dbd" }}>
          <FaClipboardList className="me-2 text-primary" /> {kbSet.name}
          <Badge bg="secondary" className="ms-3" style={{ fontSize: '0.6em' }}>ID: {kbSet.id}</Badge>
        </h1>
        <div>
          <Button variant="secondary" onClick={() => window.history.back()} className="me-2">
            <FaArrowLeft className="me-2" /> Voltar
          </Button>

          <Button variant="info" onClick={() => setShowCreateFieldModal(true)} className="me-2">
            <FaPlus className="me-2" /> Novo Campo
          </Button>
        </div>
      </div>

      <p className="text-muted mb-4">
        Campos definidos: <strong>{kbSet.fields.length}</strong> | Total de Valores (Entradas): <strong>{totalValues}</strong>
      </p>

      {kbSet.fields.length === 0 ? (
        <Alert variant="info" className="text-center">
          Nenhum campo definido para este conjunto. Crie um novo campo para começar.
        </Alert>
      ) : (
        <Row className='g-4'>
            {kbSet.fields.map((field) => {
                const isDeletingField = deletingFieldId === field.id;

                return (
                <Col lg={12} key={field.id}>
                    <Card>
                        <Card.Header className='bg-light d-flex justify-content-between align-items-center'>
                            <div className='d-flex align-items-center'>
                                <h5 className="mb-0 fw-bold me-3">
                                    {field.name}
                                </h5>
                                <Badge bg="primary" className="ms-0 me-2">{field.field_type}</Badge>
                                {field.required && <span className="text-danger" style={{ fontSize: '0.9em' }}>*</span>}
                            </div>
                            <div>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDeleteField(field.id, field.name)}
                                    disabled={isDeletingField}
                                    className="me-2"
                                >
                                    {isDeletingField ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        <><FaTrash size={12} className="me-1" /> Excluir Campo</>
                                    )}
                                </Button>
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={() => handleCreateValue(field)}
                                    disabled={isDeletingField}
                                >
                                    <FaPlus className="me-1" /> Nova Entrada
                                </Button>
                            </div>
                        </Card.Header>
                        <Card.Body className='p-0'>
                            {field.values && field.values.length > 0 ? (
                                <Table striped bordered hover responsive className="mb-0">
                                    <thead>
                                        <tr className='table-secondary'>
                                            <th style={{ width: '80px' }}>ID (Value)</th>
                                            <th style={{ width: '80px' }}>ID (Entry)</th>
                                            <th>Valor</th>
                                            <th style={{ width: '120px' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {field.values.map((value) => {
                                            const entryId = value.entry_id;
                                            const isDeleting = deletingId === entryId || isDeletingField;
                                            const isDisabled = isDeleting;

                                            return (
                                                <tr key={value.id}>
                                                    <td>{value.id}</td>
                                                    <td>{entryId}</td>
                                                    <td className='fw-bold'>
                                                        {getDisplayValue(value.value, field.field_type)}
                                                    </td>
                                                    <td>
                                                        <Button
                                                            variant="warning"
                                                            size="sm"
                                                            className="me-2"
                                                            onClick={() => handleEditValue(field, value)}
                                                            disabled={isDisabled}
                                                        >
                                                            <FaEdit size={12} />
                                                        </Button>

                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() => handleDeleteEntry(entryId, field.name)}
                                                            disabled={isDisabled}
                                                        >
                                                            {isDeleting && deletingId === entryId ? (
                                                                <Spinner animation="border" size="sm" />
                                                            ) : (
                                                                <FaTrash size={12} />
                                                            )}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            ) : (
                                <Alert variant="light" className="m-3 text-center">
                                    Nenhum valor encontrado para o campo <strong>{field.name}</strong>.
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            );})}
        </Row>
      )}

      {kbSet.id && selectedField && (
        <KnowledgeBaseEntryModal
          show={showEntryModal}
          onClose={handleCloseEntryModal}
          kbSetId={kbSet.id}
          field={selectedField}
          editingValue={editingValue}
          onSaveSuccess={handleSaveSuccess}
        />
      )}

      {kbSet.id && showCreateFieldModal && (
        <KnowledgeBaseFieldModal
          show={showCreateFieldModal}
          onClose={handleCloseFieldModal}
          kbSetId={kbSet.id}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </Container>
  );
}