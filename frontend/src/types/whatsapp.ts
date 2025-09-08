export interface WhatsAppStatus {
    success: boolean;
    connected: boolean;
    instance_name: string;
    status: string;
    message: string;
  }
  
  export interface WhatsAppDashboard {
    instancia: {
      nome: string;
      status: string;
      connected: boolean;
      url_api: string;
    };
    estatisticas: {
      mensagens_enviadas_hoje: number;
      mensagens_recebidas_hoje: number;
      total_conversas_ativas: number;
      ultima_atualizacao: string;
    };
  }