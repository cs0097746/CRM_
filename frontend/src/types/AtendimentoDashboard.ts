export interface AtendimentoStats {
    conversas_totais: number;
    conversas_aguardando: number;
    conversas_em_andamento: number;
    conversas_resolvidas_hoje: number;
    tempo_resposta_medio_min: number;
    tempo_espera_max_min: number;
    operadores_online: number;
    taxa_resolucao_percent: number;
    pico_horario: {
      hora: string;
      conversas: number;
    };
    distribuicao_status: {
      entrada: number;
      atendimento: number;
      resolvida: number;
    };
    operadores_performance: {
      id: number;
      nome: string;
      conversas_ativas: number;
      conversas_resolvidas: number;
      tempo_medio_min: number;
      status: 'online' | 'ocupado' | 'offline';
    }[];
    atividade_por_hora: {
      hora: string;
      conversas: number;
    }[];
  }