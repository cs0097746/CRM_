export interface Interacao {
  id: number;
  mensagem: string;
  timestamp: string;
  remetente: 'operador' | 'cliente'; // Usar 'remetente' como principal
  autor?: 'operador' | 'cliente';    // Manter 'autor' como opcional para compatibilidade
  conversa: number;
  operador?: {
    id: number;
    user: {
      username: string;
    };
  } | null;
  anexo?: string | null;
}