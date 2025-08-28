export type StatusConversa = 'entrada' | 'atendimento' | 'resolvida';
import type {Contato} from "./Contato.ts";
import type {Operador} from "./Operador.ts";
import type {Interacao} from "./Interacao.ts";

export interface Conversa {
  id: number;
  contato: Contato;
  operador?: Operador | null;
  status: StatusConversa;
  criado_em: string;
  atualizado_em: string;
  interacoes?: Interacao[];
}
