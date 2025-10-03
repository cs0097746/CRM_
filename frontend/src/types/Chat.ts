// frontend/src/types/Chat.ts - ADICIONAR campos de mídia:

export interface ChatMensagem {
  id: number;
  mensagem: string;
  timestamp: string;
  tipo: 'operador' | 'cliente';
  operador?: {
    id: number;
    user: {
      username: string;
    };
  };
  
  // ✅ NOVOS CAMPOS PARA MÍDIA:
  media_type?: 'texto' | 'imagem' | 'audio' | 'video' | 'documento' | 'sticker' | 'localizacao' | 'contato' | 'outros';
  media_url?: string;
  media_filename?: string;
  media_size?: number;
  media_duration?: number;
}