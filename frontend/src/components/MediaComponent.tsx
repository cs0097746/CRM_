// frontend/src/components/MediaComponent.tsx:

interface MediaComponentProps {
    tipo: string;
    url: string;
    filename?: string;
  }
  
  export const MediaComponent: React.FC<MediaComponentProps> = ({ tipo, url, filename }) => {
    switch (tipo) {
      case 'imagem':
      case 'sticker':
        return (
          <img 
            src={url} 
            alt={filename || 'Imagem'} 
            className="media-image"
            style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px' }}
            onClick={() => window.open(url, '_blank')}
          />
        );
        
      case 'audio':
        return (
          <audio controls className="media-audio">
            <source src={url} type="audio/ogg" />
            <source src={url} type="audio/mpeg" />
            Seu navegador não suporta áudio.
          </audio>
        );
        
      case 'video':
        return (
          <video controls className="media-video" style={{ maxWidth: '300px' }}>
            <source src={url} type="video/mp4" />
            Seu navegador não suporta vídeo.
          </video>
        );
        
      default:
        return (
          <a href={url} download={filename} className="media-link">
            📄 {filename || 'Baixar arquivo'}
          </a>
        );
    }
  };