export type StatusConversa = 'entrada' | 'atendimento' | 'resolvida';
import type { Contato } from "./Contato.ts";
import type { Operador } from "./Operador.ts";
import type { Interacao } from "./Interacao.ts";

interface Mensagem {
  criado_em: string;
  mensagem: string;
  remetente: string;
}

export interface Interacao {
  id: number;
  mensagem: string;
  remetente: string;
  autor?: string;  // ✅ Campo alternativo
  tipo: string;
  criado_em: string;
  timestamp: string;
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
  };
}