export interface Interacao {
    id: number;
    mensagem: string;
    timestamp: string;
    autor: 'operador' | 'cliente';
    operador?: {
      id: number;
      user: {
        username: string;
      };
    };
    anexo?: string;
  }
  
  export interface Conversa {
    id: number;
    contato: {
      id: number;
      nome: string;
      telefone?: string | null; // Permitir null aqui
    };
    status: string;
    operador?: {
      id: number;
      user: {
        username: string;
      };
    };
    interacoes?: Interacao[];
  }
  
  export interface Contato {
    id: number;
    nome: string;
    telefone?: string | null; // E aqui também
    email?: string;
  }
  
  export interface Operador {
    id: number;
    user: {
      username: string;
      first_name?: string;
      last_name?: string;
    };
  }