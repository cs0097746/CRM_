// frontend/src/types/Conversa.ts - CORRIGIR COMPLETAMENTE:

export type StatusConversa = 'entrada' | 'atendimento' | 'resolvida';

// ✅ INTERFACE CONTATO
export interface Contato {
  id: number;
  nome: string;
  telefone?: string | null;
  email?: string;
  empresa?: string | null;
  cargo?: string | null;
  criado_em: string;
  atualizado_em: string;
}

// ✅ INTERFACE OPERADOR
export interface Operador {
  id: number;
  user: {
    username: string;
    first_name?: string;
    last_name?: string;
  };
}

// ✅ INTERFACE INTERACAO (UNIFICADA)
export interface Interacao {
  id: number;
  mensagem: string;
  remetente: string;
  autor?: string;  // Campo alternativo para compatibilidade
  tipo: string;
  criado_em: string;
  timestamp: string;
  whatsapp_id?: string;
  
  // ✅ CAMPOS DE MÍDIA:
  media_url?: string;
  media_filename?: string;
  media_size?: number;
  media_duration?: number;
  
  operador?: Operador | null;
}

// ✅ INTERFACE MENSAGEM (para ultima_mensagem)
export interface Mensagem {
  criado_em: string;
  mensagem: string;
  remetente: string;
}

// ✅ INTERFACE CONVERSA PRINCIPAL
export interface Conversa {
  id: number;
  contato: Contato;
  operador?: Operador | null;
  status: StatusConversa;
  assunto: string;
  origem: string;
  prioridade: string;
  criado_em: string;
  atualizado_em: string;
  finalizada_em?: string | null;
  
  // Campos calculados:
  ultima_mensagem?: Mensagem | null;
  total_mensagens?: number;
  
  // Relacionamentos:
  interacoes?: Interacao[];
}