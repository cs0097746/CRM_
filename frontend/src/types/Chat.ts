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
    anexo?: {
      tipo: 'imagem' | 'arquivo' | 'audio';
      url: string;
      nome: string;
    };
  }
  
  export interface ChatStatus {
    operadorDigitando: boolean;
    clienteDigitando: boolean;
    operadorOnline: boolean;
  }