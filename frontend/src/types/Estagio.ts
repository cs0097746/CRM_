import type {Negocio} from "./Negocio.ts";

export interface Estagio {
  id: number;
  nome: string;
  ordem: number;
  negocios?: Negocio[];
}