import React, { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { getMediaType} from "./mediaUtils.tsx";
import backend_url from "../../config/env.ts";

interface FileAttributePreviewProps {
  atributo: any;
}

const renderPreviewContent = (url: string, type: string, fileName: string) => {
  switch (type) {
    case 'image':
      return (
        <img
          src={url}
          alt={fileName}
          style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', marginTop: '0.5rem', borderRadius: '0.5rem' }}
        />
      );
    case 'video':
      return (
        <video
          src={url}
          controls
          style={{ width: '100%', maxHeight: '400px', marginTop: '0.5rem', borderRadius: '0.5rem' }}
        >
          Seu navegador não suporta a tag de vídeo.
        </video>
      );
    case 'pdf':
      return (
        <iframe
          src={url}
          style={{ width: '100%', height: '500px', border: '1px solid #ccc', marginTop: '0.5rem', borderRadius: '0.5rem' }}
          title={`Preview de PDF: ${fileName}`}
        />
      );
    case 'text':
      return (
        <iframe
          src={url}
          style={{ width: '100%', height: '300px', border: '1px solid #ccc', marginTop: '0.5rem', borderRadius: '0.5rem' }}
          title={`Preview de Texto: ${fileName}`}
        />
      );
    default:
      return <p className="text-muted mt-2">Nenhum preview disponível para este tipo de arquivo. Por favor, utilize o link de download.</p>;
  }
};

export const FileAttributePreview: React.FC<FileAttributePreviewProps> = ({ atributo }) => {
  const { valor, arquivo, valor_formatado } = atributo;
  const [showPreview, setShowPreview] = useState(false);

  const fileUrl = valor_formatado || arquivo;
  const cleanFileUrl = fileUrl ? fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl : '';
  const fullFileUrl = cleanFileUrl.startsWith('http') ? cleanFileUrl : `${backend_url}${cleanFileUrl}`;
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