import React from 'react';
import { Form, Alert } from 'react-bootstrap';
import type { Contato} from "../../types/Contato.ts";

interface ContactDataTabProps {
  contato: Contato;
}

const ReadOnlyField: React.FC<{ label: string; value: string | undefined | null }> = ({ label, value }) => {
  if (!value) return null;

  const inputStyle = {
    borderRadius: "0.6rem",
    backgroundColor: "#e9ecef",
    padding: "0.5rem",
    borderColor: "#d0d0d0"
  };

  return (
    <Form.Group className="mb-3">
      <Form.Label style={{ fontWeight: 600, color: "#316dbd" }}>{label}</Form.Label>
      <Form.Control
        type="text"
        value={value}
        disabled
        readOnly
        style={inputStyle}
      />
    </Form.Group>
  );
};

export const ContactDataTab: React.FC<ContactDataTabProps> = ({ contato }) => {
  return (
    <div style={{
      padding: "1.5rem",
      backgroundColor: "#ffffff",
      borderRadius: "0.8rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      minHeight: '400px'
    }}>
      <h5 style={{ color: "#8c52ff", fontWeight: 700, marginBottom: "1.5rem" }}>
        Detalhes do Contato 👤
      </h5>

      <Form>
        <ReadOnlyField label="Nome Completo" value={contato.nome} />
        <ReadOnlyField label="Email" value={contato.email} />
        <ReadOnlyField label="Telefone" value={contato.telefone} />
        <ReadOnlyField label="Empresa" value={contato.empresa} />
        <ReadOnlyField label="Cargo" value={contato.cargo} />

        <ReadOnlyField
          label="Criado em"
          value={new Date(contato.criado_em).toLocaleString("pt-BR")}
        />
        <ReadOnlyField
          label="Última Atualização"
          value={new Date(contato.atualizado_em).toLocaleString("pt-BR")}
        />

        <Alert variant="info" className="mt-4">
            <strong>Atenção:</strong> Os dados do contato são somente para visualização. Para realizar edições, por favor, utilize a tela principal de gestão de Contatos.
        </Alert>
      </Form>
    </div>
  );
};