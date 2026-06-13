import { supabase } from './supabaseClient';
import { Contato, Tarefa, Locacao, SupabaseConfigStatus } from './types';

export type SaveResult<T> = { item: T; syncOk: boolean };

// Helper to generate UUIDs when offline/fallback
function generateUUID(): string {
  return 'uuid-' + Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
}

// Default Seed Data (Totalmente zerados para permitir inserção sem lixo fictício)
const DEFAULT_CONTATOS: Contato[] = [];
const DEFAULT_TAREFAS: Tarefa[] = [];
const DEFAULT_LOCACOES: Locacao[] = [];

// LocalStorage helpers to work when Supabase behaves as fallback
function getLocal<T>(key: string, defaultVal: T[]): T[] {
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  
  try {
    const parsed = JSON.parse(data) as any[];
    // Limpar de forma proativa IDs de demonstrações anteriores para que o usuário sinta o sistema perfeitamente limpo
    const purged = parsed.filter(item => {
      if (!item || !item.id) return true;
      const sementesIds = [
        'c-1', 'c-2', 'c-3', 'c-4', 'c-5', 'c-6', 'c-7', 'c-8',
        't-1', 't-2', 't-3', 't-4', 't-5',
        'l-1', 'l-2', 'l-3', 'l-4', 'l-5', 'l-6'
      ];
      return !sementesIds.includes(item.id);
    });

    if (purged.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(purged));
    }
    return purged as T[];
  } catch (e) {
    return defaultVal;
  }
}

function setLocal<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const crmService = {
  // Check Supabase connection & check if tables exist
  async checkSupabaseConfig(): Promise<SupabaseConfigStatus> {
    const status: SupabaseConfigStatus = {
      connected: false,
      tablesChecked: false,
      contatosOk: false,
      tarefasOk: false,
      locacoesOk: false,
      usingFallback: true
    };

    try {
      // Test basic connection
      const { data: test, error: testErr } = await supabase.from('contatos').select('count', { count: 'exact', head: true });
      status.connected = true;
      status.tablesChecked = true;

      if (testErr) {
        if (testErr.code === 'PGRST116' || testErr.code === '42P01') {
          // Table doesn't exist
          status.contatosOk = false;
        } else {
          status.error = testErr.message;
        }
      } else {
        status.contatosOk = true;
      }

      // Check tarefas
      const { error: tErr } = await supabase.from('tarefas').select('count', { count: 'exact', head: true });
      status.tarefasOk = !tErr || (tErr.code !== 'PGRST116' && tErr.code !== '42P01');

      // Check locacoes
      const { error: lErr } = await supabase.from('locacoes').select('count', { count: 'exact', head: true });
      status.locacoesOk = !lErr || (lErr.code !== 'PGRST116' && lErr.code !== '42P01');

      status.usingFallback = !(status.contatosOk && status.tarefasOk && status.locacoesOk);
    } catch (e: any) {
      status.error = e.message || 'Erro de conexão';
      status.usingFallback = true;
    }

    return status;
  },

  // SQL Script generation for users to configure Supabase
  getSupabaseSQLScript(): string {
    return `-- SELEÇÃO SCRIPT SQL PARA O SUPABASE SQL EDITOR
-- Execute estes comandos no menu "SQL Editor" do seu painel do Supabase.

-- 1. Criação da Tabela de Contatos
CREATE TABLE IF NOT EXISTS contatos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cidade TEXT,
  estado TEXT,
  tipo TEXT,
  especialidade TEXT,
  equipamentos TEXT,
  etiquetas TEXT,
  endereco TEXT,
  prox_follow_up TEXT,
  status TEXT DEFAULT 'warm',
  origem TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Habilitar RLS (Opcional - mas por padrão com chave anon pública é bom desabilitar/ou criar política de acesso livre)
ALTER TABLE contatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo para chave Anonimous" ON contatos FOR ALL USING (true) WITH CHECK (true);

-- 2. Criação da Tabela de Tarefas
CREATE TABLE IF NOT EXISTS tarefas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  vencimento TEXT NOT NULL,
  prioridade TEXT DEFAULT 'media',
  status TEXT DEFAULT 'pendente',
  cliente_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo para chave Anonimous" ON tarefas FOR ALL USING (true) WITH CHECK (true);

-- 3. Criação da Tabela de Locações
CREATE TABLE IF NOT EXISTS locacoes (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  horario TEXT,
  cliente TEXT NOT NULL,
  dra TEXT,
  equipamento TEXT NOT NULL,
  cidade TEXT,
  base_calculo_tipo TEXT DEFAULT 'horas',
  base_calculo_valor REAL DEFAULT 0,
  mao_de_obra REAL DEFAULT 0,
  deslocamento REAL DEFAULT 0,
  valor_locacao REAL DEFAULT 0,
  valor_final REAL NOT NULL,
  nf_emitida BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'agendado',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE locacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo para chave Anonimous" ON locacoes FOR ALL USING (true) WITH CHECK (true);

-- 4. Índices para otimizar filtros e buscas
CREATE INDEX IF NOT EXISTS idx_contatos_status ON contatos(status);
CREATE INDEX IF NOT EXISTS idx_locacoes_data ON locacoes(data);
CREATE INDEX IF NOT EXISTS idx_locacoes_status ON locacoes(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_vencimento ON tarefas(vencimento);
`;
  },

  // ── CONTATOS CRUD ────────────────────────────────────────────────────────

  async listContatos(usingFallback: boolean): Promise<Contato[]> {
    if (!usingFallback) {
      try {
        const { data, error } = await supabase
          .from('contatos')
          .select('*')
          .order('nome', { ascending: true });
        if (!error && data) {
          // Sync back to local storage cache
          setLocal('sinnergie_contatos', data);
          return data as Contato[];
        }
      } catch (err) {
        console.error('Supabase fetch contatos failed, falling back to offline cache', err);
      }
    }
    return getLocal<Contato>('sinnergie_contatos', DEFAULT_CONTATOS);
  },

  async saveContato(contato: Partial<Contato>, usingFallback: boolean): Promise<SaveResult<Contato>> {
    const isNew = !contato.id;
    const item: Contato = {
      id: contato.id || generateUUID(),
      nome: contato.nome || 'Sem Nome',
      email: contato.email || '',
      telefone: contato.telefone || '',
      cidade: contato.cidade || '',
      status: contato.status || 'warm',
      origem: contato.origem || 'Manual',
      observacoes: contato.observacoes || '',
      created_at: contato.created_at || new Date().toISOString(),
      estado: contato.estado || '',
      tipo: contato.tipo || '',
      especialidade: contato.especialidade || '',
      equipamentos: contato.equipamentos || '',
      etiquetas: contato.etiquetas || '',
      endereco: contato.endereco || '',
      prox_follow_up: contato.prox_follow_up || ''
    };

    const current = getLocal<Contato>('sinnergie_contatos', DEFAULT_CONTATOS);
    const updated = isNew
      ? [item, ...current]
      : current.map(c => c.id === item.id ? item : c);
    setLocal('sinnergie_contatos', updated);

    let syncOk = usingFallback; // se fallback, não tentou sync (considerado ok localmente)
    if (!usingFallback) {
      try {
        const { error } = await supabase.from('contatos').upsert(item);
        syncOk = !error;
        if (error) console.error('Supabase contato upsert error', error);
      } catch (err) {
        syncOk = false;
        console.error('Supabase contato sync failed', err);
      }
    }

    return { item, syncOk };
  },

  async deleteContato(id: string, usingFallback: boolean): Promise<boolean> {
    // Local delete
    const current = getLocal<Contato>('sinnergie_contatos', DEFAULT_CONTATOS);
    const updated = current.filter(c => c.id !== id);
    setLocal('sinnergie_contatos', updated);

    // Supabase delete
    if (!usingFallback) {
      try {
        const { error } = await supabase
          .from('contatos')
          .delete()
          .eq('id', id);
        if (error) console.error('Supabase contato delete error', error);
      } catch (err) {
        console.error('Supabase contato sync delete failed', err);
      }
    }

    return true;
  },

  // ── TAREFAS CRUD ─────────────────────────────────────────────────────────

  async listTarefas(usingFallback: boolean): Promise<Tarefa[]> {
    if (!usingFallback) {
      try {
        const { data, error } = await supabase
          .from('tarefas')
          .select('*')
          .order('vencimento', { ascending: true });
        if (!error && data) {
          setLocal('sinnergie_tarefas', data);
          return data as Tarefa[];
        }
      } catch (err) {
        console.error('Supabase fetch tarefas failed, falling back to offline cache', err);
      }
    }
    return getLocal<Tarefa>('sinnergie_tarefas', DEFAULT_TAREFAS);
  },

  async saveTarefa(tarefa: Partial<Tarefa>, usingFallback: boolean): Promise<SaveResult<Tarefa>> {
    const isNew = !tarefa.id;
    const item: Tarefa = {
      id: tarefa.id || generateUUID(),
      titulo: tarefa.titulo || 'Nova Tarefa',
      descricao: tarefa.descricao || '',
      vencimento: tarefa.vencimento || new Date().toISOString().split('T')[0],
      prioridade: tarefa.prioridade || 'media',
      status: tarefa.status || 'pendente',
      cliente_id: tarefa.cliente_id || '',
      created_at: tarefa.created_at || new Date().toISOString()
    };

    const current = getLocal<Tarefa>('sinnergie_tarefas', DEFAULT_TAREFAS);
    const updated = isNew
      ? [item, ...current]
      : current.map(t => t.id === item.id ? item : t);
    setLocal('sinnergie_tarefas', updated);

    let syncOk = usingFallback;
    if (!usingFallback) {
      try {
        const { error } = await supabase.from('tarefas').upsert(item);
        syncOk = !error;
        if (error) console.error('Supabase tarefa upsert error', error);
      } catch (err) {
        syncOk = false;
        console.error('Supabase tarefa sync failed', err);
      }
    }

    return { item, syncOk };
  },

  async deleteTarefa(id: string, usingFallback: boolean): Promise<boolean> {
    const current = getLocal<Tarefa>('sinnergie_tarefas', DEFAULT_TAREFAS);
    const updated = current.filter(t => t.id !== id);
    setLocal('sinnergie_tarefas', updated);

    if (!usingFallback) {
      try {
        const { error } = await supabase
          .from('tarefas')
          .delete()
          .eq('id', id);
        if (error) console.error('Supabase tarefa delete error', error);
      } catch (err) {
        console.error('Supabase tarefa sync delete failed', err);
      }
    }

    return true;
  },

  // ── LOCACOES CRUD ────────────────────────────────────────────────────────

  async listLocacoes(usingFallback: boolean): Promise<Locacao[]> {
    if (!usingFallback) {
      try {
        const { data, error } = await supabase
          .from('locacoes')
          .select('*')
          .order('data', { ascending: false });
        if (!error && data) {
          setLocal('sinnergie_locacoes', data);
          return data as Locacao[];
        }
      } catch (err) {
        console.error('Supabase fetch locacoes failed, falling back to offline cache', err);
      }
    }
    return getLocal<Locacao>('sinnergie_locacoes', DEFAULT_LOCACOES);
  },

  async saveLocacao(locacao: Partial<Locacao>, usingFallback: boolean): Promise<SaveResult<Locacao>> {
    const isNew = !locacao.id;
    const item: Locacao = {
      id: locacao.id || generateUUID(),
      data: locacao.data || new Date().toISOString().split('T')[0],
      horario: locacao.horario || '09:00',
      cliente: locacao.cliente || '',
      dra: locacao.dra || '',
      equipamento: locacao.equipamento || 'Ultraformer III',
      cidade: locacao.cidade || '',
      base_calculo_tipo: locacao.base_calculo_tipo || 'valor_fixo',
      base_calculo_valor: Number(locacao.base_calculo_valor) || 0,
      mao_de_obra: Number(locacao.mao_de_obra) || 0,
      deslocamento: Number(locacao.deslocamento) || 0,
      valor_locacao: Number(locacao.valor_locacao) || 0,
      valor_final: Number(locacao.valor_final) || 0,
      nf_emitida: !!locacao.nf_emitida,
      status: locacao.status || 'agendado',
      observacoes: locacao.observacoes || '',
      created_at: locacao.created_at || new Date().toISOString()
    };

    const current = getLocal<Locacao>('sinnergie_locacoes', DEFAULT_LOCACOES);
    const updated = isNew
      ? [item, ...current]
      : current.map(l => l.id === item.id ? item : l);
    updated.sort((a, b) => b.data.localeCompare(a.data));
    setLocal('sinnergie_locacoes', updated);

    let syncOk = usingFallback;
    if (!usingFallback) {
      try {
        const { error } = await supabase.from('locacoes').upsert(item);
        syncOk = !error;
        if (error) console.error('Supabase locacao upsert error', error);
      } catch (err) {
        syncOk = false;
        console.error('Supabase locacao sync failed', err);
      }
    }

    return { item, syncOk };
  },

  async deleteLocacao(id: string, usingFallback: boolean): Promise<boolean> {
    const current = getLocal<Locacao>('sinnergie_locacoes', DEFAULT_LOCACOES);
    const updated = current.filter(l => l.id !== id);
    setLocal('sinnergie_locacoes', updated);

    if (!usingFallback) {
      try {
        const { error } = await supabase
          .from('locacoes')
          .delete()
          .eq('id', id);
        if (error) console.error('Supabase locacao delete error', error);
      } catch (err) {
        console.error('Supabase locacao sync delete failed', err);
      }
    }

    return true;
  },

  // Bulk import tool for CSV data parsing
  async importLocacoesCSV(locacoes: Partial<Locacao>[], usingFallback: boolean): Promise<Locacao[]> {
    const imported: Locacao[] = [];
    for (const data of locacoes) {
      const { item } = await this.saveLocacao({ ...data, id: undefined }, usingFallback);
      imported.push(item);
    }
    return imported;
  },

  async importContatosCSV(contatos: Partial<Contato>[], usingFallback: boolean): Promise<Contato[]> {
    const imported: Contato[] = [];
    for (const data of contatos) {
      const { item } = await this.saveContato({ ...data, id: undefined }, usingFallback);
      imported.push(item);
    }
    return imported;
  },

  async clearAllData(usingFallback: boolean): Promise<boolean> {
    localStorage.removeItem('sinnergie_contatos');
    localStorage.removeItem('sinnergie_tarefas');
    localStorage.removeItem('sinnergie_locacoes');

    if (!usingFallback) {
      try {
        await supabase.from('contatos').delete().neq('id', '');
        await supabase.from('tarefas').delete().neq('id', '');
        await supabase.from('locacoes').delete().neq('id', '');
      } catch (err) {
        console.error('Erro ao limpar dados no Supabase', err);
        return false;
      }
    }

    return true;
  }
};
