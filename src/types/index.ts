export type OperationalStatus = 
  | 'Teste de criativo' 
  | 'Teste de público' 
  | 'Validação' 
  | 'Pré escala'
  | 'Escala' 
  | 'Escala agressiva' 
  | 'Pausada' 
  | 'Negativa';

export interface Operation {
  id: string;
  userId: string;
  name: string;
  product: string;
  country: string;
  trafficPlatform: 'Meta Ads' | 'Google' | 'TikTok';
  salesPlatform: string;
  offerLink: string;
  averageTicket: number;
  status: OperationalStatus;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  
  // Total stats (aggregated or calculated)
  totalInvested: number;
  totalRevenue: number;
  totalProfit: number;
  roi: number;
  cpa: number;
  roas: number;
  margin: number;
}

export interface DailyLog {
  id: string;
  operationId: string;
  date: string; // YYYY-MM-DD
  invested: number;
  revenue: number;
  profit: number;
  roi: number;
}

export interface Alert {
  type: 'danger' | 'warning' | 'success' | 'info';
  message: string;
  operationId: string;
  operationName: string;
}
