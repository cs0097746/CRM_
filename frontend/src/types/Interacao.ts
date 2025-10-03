// frontend/src/types/Interacao.ts - CORRIGIR:

export interface Interacao {
  id: number;
  mensagem: string;
  timestamp: string;
  criado_em: string; // ✅ ADICIONAR
  remetente: 'operador' | 'cliente';
  autor?: 'operador' | 'cliente';    // Compatibilidade
  tipo: string; // ✅ ADICIONAR
  conversa: number;
  whatsapp_id?: string;
  
  // ✅ CAMPOS DE MÍDIA:
  media_url?: string;
  media_filename?: string;
  media_size?: number;
  media_duration?: number;
  
  operador?: {
    id: number;
    user: {
      username: string;
    };
  } | null;
  anexo?: string | null;
}