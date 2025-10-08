// frontend/src/components/MediaMessage.tsx - COMPONENTE PARA ÁUDIOS

import React from 'react';

interface MediaMessageProps {
  tipo: 'imagem' | 'audio' | 'video' | 'documento' | 'sticker';
  mediaUrl?: string;
  mediaFilename?: string;
  mediaDuration?: number;
  mediaSize?: number;
  mensagem: string;
}

export const MediaMessage: React.FC<MediaMessageProps> = ({
  tipo,
  mediaUrl,
  mediaFilename,
  mediaDuration,
  mediaSize,
  mensagem
}) => {
  console.log('🎵 MediaMessage:', { tipo, mediaUrl, mediaDuration });

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  };

  if (!mediaUrl) {
    return (
      <div className="alert alert-warning p-2" style={{ fontSize: '12px' }}>
        ⚠️ Mídia não disponível
      </div>
    );
  }

  switch (tipo) {
    case 'imagem':
    case 'sticker':
      return (
        <div>
          <div className="mb-2">{mensagem}</div>
          <img
            src={mediaUrl}
            alt="Imagem"
            className="img-fluid rounded shadow-sm"
            style={{ maxWidth: '300px', cursor: 'pointer' }}
            onClick={() => window.open(mediaUrl, '_blank')}
            onError={(e) => {
              console.error('❌ Erro ao carregar imagem:', mediaUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
          {mediaSize && (
            <div className="text-muted mt-1" style={{ fontSize: '11px' }}>
              {formatFileSize(mediaSize)}
            </div>
          )}
        </div>
      );

    case 'audio':
      console.log('🎵 Renderizando áudio:', mediaUrl);
      return (
        <div>
          <div className="mb-2">{mensagem}</div>
          <div 
            className="p-3 rounded border" 
            style={{ 
              backgroundColor: '#f8f9fa', 
              maxWidth: '300px',
              border: '1px solid #dee2e6' 
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-2">
              <span style={{ fontSize: '16px' }}>🎵</span>
              <strong style={{ fontSize: '13px' }}>Áudio</strong>
              {mediaDuration && (
                <span className="text-muted" style={{ fontSize: '11px' }}>
                  ({formatDuration(mediaDuration)})
                </span>
              )}
            </div>
            
            {/* ✅ PLAYER DE ÁUDIO NATIVO */}
            <audio 
              controls 
              className="w-100" 
              style={{ height: '40px' }}
              preload="metadata"
              onError={(e) => {
                console.error('❌ Erro no player de áudio:', mediaUrl);
              }}
            >
              <source src={mediaUrl} type="audio/ogg" />
              <source src={mediaUrl} type="audio/mpeg" />
              <source src={mediaUrl} type="audio/wav" />
              Seu navegador não suporta áudio.
            </audio>
            
            <div className="d-flex justify-content-between align-items-center mt-2">
              {mediaSize && (
                <small className="text-muted">{formatFileSize(mediaSize)}</small>
              )}
              <a 
                href={mediaUrl} 
                download={mediaFilename}
                className="btn btn-sm btn-outline-primary"
                style={{ fontSize: '11px' }}
                target="_blank"
                rel="noopener noreferrer"
              >
                📥 Baixar
              </a>
            </div>
          </div>
        </div>
      );

    case 'video':
      return (
        <div>
          <div className="mb-2">{mensagem}</div>
          <video
            controls
            className="rounded shadow-sm"
            style={{ maxWidth: '300px' }}
            preload="metadata"
          >
            <source src={mediaUrl} type="video/mp4" />
            Seu navegador não suporta vídeo.
          </video>
          {(mediaDuration || mediaSize) && (
            <div className="d-flex gap-2 text-muted mt-1" style={{ fontSize: '11px' }}>
              {mediaDuration && <span>⏱️ {formatDuration(mediaDuration)}</span>}
              {mediaSize && <span>📊 {formatFileSize(mediaSize)}</span>}
            </div>
          )}
        </div>
      );

    case 'documento':
      return (
        <div>
          <div className="mb-2">{mensagem}</div>
          <div className="p-3 rounded border" style={{ maxWidth: '300px' }}>
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: '18px' }}>📄</span>
              <div className="flex-grow-1">
                <div style={{ fontSize: '13px', fontWeight: 500 }}>
                  {mediaFilename || 'Documento'}
                </div>
                {mediaSize && (
                  <div className="text-muted" style={{ fontSize: '11px' }}>
                    {formatFileSize(mediaSize)}
                  </div>
                )}
              </div>
              <a
                href={mediaUrl}
                download={mediaFilename}
                className="btn btn-sm btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Baixar
              </a>
            </div>
          </div>
        </div>
      );

    default:
      return <div>{mensagem}</div>;
  }
};

export default MediaMessage;