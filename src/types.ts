export interface Contato {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  status: 'hot' | 'warm' | 'cold' | 'active' | 'lost';
  origem: string;
  observacoes: string;
  created_at?: string;
  // Rich extension fields for complete CRM flexibility
  estado?: string;
  tipo?: string;
  especialidade?: string;
  equipamentos?: string;
  etiquetas?: string;
  endereco?: string;
  prox_follow_up?: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  vencimento: string; // YYYY-MM-DD
  prioridade: 'alta' | 'media' | 'baixa';
  status: 'pendente' | 'concluido';
  cliente_id?: string;
  created_at?: string;
}

export interface Locacao {
  id: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  cliente: string;
  dra: string;
  equipamento: string; // 'Ultraformer III' | 'Ultraformer MPT' | 'Endolaser' | 'CO2 Fracionado' | 'Vectus'
  cidade: string;
  base_calculo_tipo: 'disparos' | 'horas' | 'valor_fixo';
  base_calculo_valor: number; // e.g. shots count, hours count or fixed base price
  mao_de_obra: number;
  deslocamento: number;
  valor_locacao: number;
  valor_final: number;
  nf_emitida: boolean;
  status: 'agendado' | 'concluido' | 'cancelado';
  observacoes: string;
  created_at?: string;
}

export interface SupabaseConfigStatus {
  connected: boolean;
  tablesChecked: boolean;
  contatosOk: boolean;
  tarefasOk: boolean;
  locacoesOk: boolean;
  usingFallback: boolean;
  error?: string;
}
