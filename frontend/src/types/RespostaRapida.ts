import type {Operador} from "./Operador.ts";

export interface RespostasRapidas {
  id: number;
  atalho: string;
  texto: string;
  operador: Operador;
  criado_em: string;
  atualizado_em: string;
}
