export interface AtributoPersonalizavel {
    id?:  number;
    label: string;
    valor: string;
    type: string;
    valor_formatado?: unknown;
    arquivo?: File | string | null;
}