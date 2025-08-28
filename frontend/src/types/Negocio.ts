import type {Contato} from "./Contato.ts";
import type {Operador} from "./Operador.ts";
import type {Estagio} from "./Estagio.ts";

export interface Negocio {
  id: number;
  titulo: string;
  valor?: number | null;
  contato: Contato;
  estagio: Estagio;
  criado_em: string;
  operador?: Operador | null;
}
