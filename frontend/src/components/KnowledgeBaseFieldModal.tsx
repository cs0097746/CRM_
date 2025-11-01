import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { FaSave, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import backend_url from '../config/env.ts';
import { getToken } from '../function/validateToken.tsx';

const api = axios.create({ baseURL: `${backend_url}` });

interface KnowledgeBaseFieldModalProps {
    show: boolean;
    onClose: () => void;
    kbSetId: number;
    onSaveSuccess: () => void;
}

export default function KnowledgeBaseFieldModal({
    show,
    onClose,
    kbSetId,
    onSaveSuccess
}: KnowledgeBaseFieldModalProps) {

    const [name, setName] = useState('');
    const [fieldType, setFieldType] = useState('TEXT');
    const [required, setRequired] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const availableFieldTypes = [
        { label: 'Texto Curto', value: 'TEXT' },
        { label: 'Número', value: 'NUMBER' },
        { label: 'Booleano (Sim/Não)', value: 'BOOLEAN' },
        { label: 'Data', value: 'DATE' },
        { label: 'URL', value: 'URL' },
        { label: 'JSON', value: 'JSON' },
        { label: 'Escolha (Dropdown)', value: 'CHOICE' },
    ];

    const resetForm = () => {
        setName('');
        setFieldType('TEXT');
        setRequired(false);
        setErrorMessage(null);
    };

    const handleModalClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setErrorMessage(null);

        if (!name.trim()) {
            setErrorMessage("O nome do campo é obrigatório.");
            setLoading(false);
            return;
        }

        const fieldData = {
            kb_set: kbSetId,
            name: name.trim(),
            field_type: fieldType,
            required: required
        };

        try {
            const token = await getToken();
            if (!token) {
                throw new Error("Autenticação falhou. Token não disponível.");
            }

            await api.post(`fields/`, fieldData, {
                headers: { Authorization: `Bearer ${token}` },
            });

            onSaveSuccess();
            handleModalClose();
            alert(`Campo "${name.trim()}" criado com sucesso!`);

        } catch (err) {
            console.error("Erro ao criar novo campo:", err);
            let message = "Erro ao salvar o campo. Tente novamente.";

            if (axios.isAxiosError(err) && err.response) {
                const errorData = err.response.data;
                if (errorData.detail) {
                    message = errorData.detail;
                } else if (errorData.name && errorData.name.includes('already exists')) {
                    message = `Já existe um campo com o nome "${name.trim()}" neste conjunto.`;
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

    return (
        <Modal show={show} onHide={handleModalClose} backdrop="static" keyboard={false} centered>
            <Modal.Header closeButton>
                <Modal.Title className='fw-bold'>
                    Criar Novo Campo
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {errorMessage && <Alert variant="danger" className="text-start">🚫 {errorMessage}</Alert>}

                    <Form.Group className="mb-3" controlId="fieldName">
                        <Form.Label className='fw-bold mb-1'>Nome do Campo <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Endereço, Preço, Ativo..."
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="fieldType">
                        <Form.Label className='fw-bold mb-1'>Tipo de Dado <span className="text-danger">*</span></Form.Label>
                        <Form.Select
                            value={fieldType}
                            onChange={(e) => setFieldType(e.target.value)}
                            required
                        >
                            {availableFieldTypes.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3" controlId="fieldRequired">
                        <Form.Check
                            type="switch"
                            label="Campo Obrigatório (Required)"
                            checked={required}
                            onChange={(e) => setRequired(e.target.checked)}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleModalClose} disabled={loading}>
                        <FaTimes className="me-2" /> Cancelar
                    </Button>
                    <Button variant="success" type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Criando...
                            </>
                        ) : (
                            <>
                                <FaSave className="me-2" /> Salvar Campo
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}