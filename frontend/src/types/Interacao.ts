import type {Conversa} from "./Conversa.ts";

export interface Interacao {
  id: number;
  conversa: Conversa;
  mensagem: string;
  remetente: string;
  criado_em: string;
}
