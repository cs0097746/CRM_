export interface Contato {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  empresa?: string | null;
  cargo?: string | null;
  criado_em: string;   // ISO string
  atualizado_em: string;
}
