import type {Negocio} from "./Negocio.ts";
import type {Kanban} from "./Kanban.ts";

export interface Estagio {
  id: number;
  nome: string;
  ordem: number;
  negocios?: Negocio[];
  kanban: Kanban;
}