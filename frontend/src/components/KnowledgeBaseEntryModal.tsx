import React, { useState, useEffect, type ChangeEvent } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { FaSave, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import backend_url from '../config/env.ts';
import { getToken } from '../function/validateToken.tsx';
import type { KnowledgeBaseField, KnowledgeBaseValue } from '../types/KnowledgeBase.ts';

const api = axios.create({ baseURL: `${backend_url}` });

interface KnowledgeBaseEntryModalProps {
    show: boolean;
    onClose: () => void;
    kbSetId: number;
    field: KnowledgeBaseField;
    onSaveSuccess: () => void;
    editingValue: KnowledgeBaseValue | null;
}

const getValueFromKBValue = (kbValue: KnowledgeBaseValue | undefined, type: string): any => {
    if (!kbValue) return null;

    switch (type) {
        case 'TEXT':
        case 'CHOICE':
            return kbValue.value_text || '';
        case 'URL':
            return kbValue.value_url || '';
        case 'JSON':
            return kbValue.value_json || '';
        case 'NUMBER':
            return kbValue.value_number !== null && kbValue.value_number !== undefined ? kbValue.value_number : null;
        case 'BOOLEAN':
            return kbValue.value_boolean !== null && kbValue.value_boolean !== undefined ? kbValue.value_boolean : false;
        case 'DATE':
            return kbValue.value_date || '';
        default:
            return '';
    }
};

export default function KnowledgeBaseEntryModal({
    show,
    onClose,
    kbSetId,
    field,
    onSaveSuccess,
    editingValue
}: KnowledgeBaseEntryModalProps) {

    const getInitialValue = () => {
        let initialValue: any;

        if (editingValue) {
            initialValue = getValueFromKBValue(editingValue, field.field_type);
        } else {
            initialValue = (field.field_type === 'NUMBER') ? null : (field.field_type === 'BOOLEAN' ? false : '');
        }

        if (field.field_type === 'BOOLEAN' && (initialValue === null || initialValue === undefined)) {
            initialValue = false;
        }

        return initialValue;
    };

    const [formValue, setFormValue] = useState(getInitialValue());
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isEditing = !!editingValue;
    const modalTitle = isEditing
        ? `Editar Valor #${editingValue?.id} para ${field.name}`
        : `Adicionar Novo Valor para ${field.name}`;

    useEffect(() => {
        if (show) {
            setFormValue(getInitialValue());
            setErrorMessage(null);
        }
    }, [show, field.id, editingValue]);

    const handleChange = (value: any) => {
        setFormValue(value);
    };

    const formatEntryValue = () => {
        let value = formValue;

        if (value === null || value === undefined) {
            value = null;
        } else if (typeof value === 'string') {
            value = value.trim();
            if (value === '') {
                value = null;
            }
        }

        let specificValuePayload: Record<string, any> = { field_id: field.id };
        let finalValue = value;

        if (value !== null) {
            switch (field.field_type) {
                case 'NUMBER':
                    const numValue = Number(value);
                    finalValue = isNaN(numValue) ? null : numValue;
                    specificValuePayload.value_number = finalValue;
                    break;
                case 'BOOLEAN':
                    specificValuePayload.value_boolean = finalValue;
                    break;
                case 'DATE':
                    specificValuePayload.value_date = finalValue;
                    break;
                case 'URL':
                    specificValuePayload.value_url = finalValue;
                    break;
                case 'JSON':
                    specificValuePayload.value_json = finalValue;
                    break;
                case 'TEXT':
                case 'CHOICE':
                default:
                    specificValuePayload.value_text = finalValue;
                    break;
            }
        } else {
            specificValuePayload.value_text = null;
            specificValuePayload.value_number = null;
            specificValuePayload.value_boolean = null;
            specificValuePayload.value_date = null;
            specificValuePayload.value_url = null;
            specificValuePayload.value_json = null;
        }

        specificValuePayload.value = finalValue;

        return specificValuePayload;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setErrorMessage(null);

        const payloadValue = formatEntryValue();

        // Validação obrigatória
        if (field.required && payloadValue.value === null) {
            setErrorMessage(`⚠️ O campo obrigatório "${field.name}" não pode estar vazio.`);
            setLoading(false);
            return;
        }

        try {
            const token = await getToken();
            if (!token) {
                throw new Error("Autenticação falhou. Token não disponível.");
            }

            if (isEditing && editingValue) {
                const entryId = (editingValue as any).entry_id;
                if (!entryId) {
                    throw new Error("ID da Entry pai não encontrado para edição.");
                }

                const entryEditPayload = {
                    kb_set: kbSetId,
                    values: [payloadValue]
                }

                await api.put(`entries/${entryId}/`, entryEditPayload, {
                    headers: { Authorization: `Bearer ${token}` },
                });

            } else {
                const entryDataPayload = {
                    kb_set: kbSetId,
                    values: [payloadValue]
                };

                await api.post(`entries/`, entryDataPayload, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            onSaveSuccess();
        } catch (err) {
            console.error(`Erro ao ${isEditing ? 'editar' : 'criar'} entrada:`, err);
            let message = `Erro ao salvar a entrada. Tente novamente.`;

            if (axios.isAxiosError(err) && err.response) {
                const errorData = err.response.data;
                if (errorData.detail) {
                    message = errorData.detail;
                } else if (errorData.values) {
                    const errorMsgs = Object.values(errorData.values).flat().join('; ');
                    message = `Erro de validação: ${errorMsgs}`;
                } else {
                    message = `Erro do Servidor: ${err.response.status}`;
                }
            } else if (err instanceof Error) {
                message = err.message;
            }
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    };

    const renderFieldInput = (field: KnowledgeBaseField) => {
        const value = formValue;

        type InputEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

        switch (field.field_type) {
            case 'TEXT':
                return (
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={value || ''}
                        onChange={(e: InputEvent) => handleChange(e.target.value)}
                        required={field.required}
                    />
                );
            case 'URL':
            case 'JSON':
                return (
                    <Form.Control
                        type="text"
                        value={value || ''}
                        onChange={(e: InputEvent) => handleChange(e.target.value)}
                        required={field.required}
                    />
                );
            case 'NUMBER':
                return (
                    <Form.Control
                        type="number"
                        value={value === null ? '' : value}
                        onChange={(e: InputEvent) => handleChange(e.target.value)}
                        required={field.required}
                        step="any"
                    />
                );
            case 'BOOLEAN':
                return (
                    <Form.Check
                        type="switch"
                        id={`switch-${field.id}`}
                        checked={value === true}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(e.target.checked)}
                        label={value === true ? 'Sim (Ativo)' : 'Não (Inativo)'}
                    />
                );
            case 'DATE':
                return (
                    <Form.Control
                        type="date"
                        value={value || ''}
                        onChange={(e: InputEvent) => handleChange(e.target.value)}
                        required={field.required}
                    />
                );
            case 'CHOICE':
                const choices = field.options
                    ? field.options.split(',').map(choice => choice.trim()).filter(choice => choice.length > 0)
                    : [];

                return (
                    <Form.Select
                        value={value || ''}
                        onChange={(e: InputEvent) => handleChange(e.target.value)}
                        required={field.required}
                    >
                        <option value="">Selecione uma opção...</option>
                        {choices.map((option, index) => (
                            <option key={index} value={option}>
                                {option}
                            </option>
                        ))}
                    </Form.Select>
                );
            default:
                return <Form.Control readOnly plaintext value={`Tipo não suportado: ${field.field_type}`} />;
        }
    };

    return (
        <Modal show={show} onHide={onClose} backdrop="static" keyboard={false} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title className='fw-bold'>
                    {modalTitle}
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {errorMessage && <Alert variant="danger" className="text-start">🚫 {errorMessage}</Alert>}

                    <Form.Group className="mb-3" controlId={`kb-field-${field.id}`}>
                        <Form.Label className='fw-bold mb-1'>
                            Valor para {field.name}
                            {field.required && <span className="text-danger ms-1"> *</span>}
                            <small className="text-muted ms-2 fw-normal">({field.field_type.toLowerCase()})</small>
                        </Form.Label>
                        {renderFieldInput(field)}
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        <FaTimes className="me-2" /> Cancelar
                    </Button>
                    <Button variant="success" type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <FaSave className="me-2" /> {isEditing ? 'Atualizar' : 'Salvar Valor'}
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}