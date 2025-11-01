// ARQUIVO: ../types/KnowledgeBase.ts (Atualizado)

// Tipos para KnowledgeBaseField
export interface KnowledgeBaseField {
  id: number;
  name: string;
  // ATUALIZE AQUI com todos os tipos suportados pelo backend
  field_type: 'TEXT' | 'NUMBER' | 'DATE' | 'CHOICE' | 'BOOLEAN' | 'URL' | 'JSON';
  options: string;
  required: boolean;
  created_at: string;
  updated_at: string;
}

// Tipos para KnowledgeBaseValue (CORRIGIDO)
export interface KnowledgeBaseValue {
  id: number;
  field: KnowledgeBaseField;

  // Propriedade genérica (usada para exibição na tabela)
  value: string | number | Date | boolean | null;

  // PROPRIEDADES ESPECÍFICAS DO BACKEND PARA EDIÇÃO (ADICIONADAS/CORRIGIDAS)
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_date: string | null; // Datas geralmente vêm como strings no formato ISO
  value_url: string | null;
  value_json: any | null; // JSON pode ser de qualquer tipo
}

// Tipos para KnowledgeBaseEntry (manter inalterado)
export interface KnowledgeBaseEntry {
  id: number;
  kb_set: number;
  created_at: string;
  updated_at: string;
  values: KnowledgeBaseValue[];
}

// Tipos para KnowledgeBaseSet (manter inalterado)
export interface KnowledgeBaseSet {
  id: number;
  client: number;
  name: string;
  created_at: string;
  updated_at: string;
  fields: KnowledgeBaseField[];
  entries: KnowledgeBaseEntry[];
}