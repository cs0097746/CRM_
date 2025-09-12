import type {Contato} from "./Contato.ts";
import type {Operador} from "./Operador.ts";
import type {Estagio} from "./Estagio.ts";
import type {AtributoPersonalizavel} from "./AtributoPersonalizavel.ts";
import type {Comentario} from "./Comentario.ts";

export interface Negocio {
  id: number;
  titulo: string;
  valor?: number | null;
  contato: Contato;
  estagio: Estagio;
  criado_em: string;
  operador?: Operador | null;
  comentarios?: Comentario[]  | null;
  atributos_personalizados: AtributoPersonalizavel[] | null;
}
