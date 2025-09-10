import type {Estagio} from "./Estagio.ts";

export interface Kanban {
    id: number;
    nome: string;
    descricao: string;
    criado_em: string;
    estagios: Estagio[];
}