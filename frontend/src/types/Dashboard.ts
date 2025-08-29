// Define a estrutura dos dados que a API do dashboard vai retornar

export interface KpiValue {
    total: number;
    valor?: number;
  }
  
  export interface FonteLead {
    nome: string;
    valor: number;
  }
  
  export interface DashboardData {
    mensagens_recebidas: number;
    conversas_atuais: number;
    chats_sem_respostas: number;
    tempo_resposta_medio_min: number;
    tempo_espera_max_horas: number;
    leads_ganhos: KpiValue;
    leads_ativos: KpiValue;
    tarefas_pendentes: number;
    leads_perdidos: KpiValue;
    fontes_lead: FonteLead[];
  }
  