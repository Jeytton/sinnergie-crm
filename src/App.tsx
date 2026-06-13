import { useState, useEffect } from 'react';
import { crmService } from './crmService';
import { Contato, Tarefa, Locacao, SupabaseConfigStatus } from './types';
import Dashboard from './components/Dashboard';
import Contatos from './components/Contatos';
import Pipeline from './components/Pipeline';
import Tarefas from './components/Tarefas';
import Locacoes from './components/Locacoes';
import Financeiro from './components/Financeiro';
import WhatsApp from './components/WhatsApp';
import Fechamento from './components/Fechamento';
import DatabaseModal from './components/DatabaseModal';
import Login from './components/Login';
import AiAssistant from './components/AiAssistant';

import {
  Users,
  Flame,
  CheckSquare,
  Package,
  BarChart2,
  LayoutDashboard,
  Menu,
  X,
  ExternalLink,
  Sun,
  Moon,
  LogOut,
  CloudOff,
  Trash2,
  AlertTriangle,
  Wifi,
  WifiOff,
  MessageCircle,
  Calculator
} from 'lucide-react';

function checkStoredAuth(): boolean {
  try {
    const raw = localStorage.getItem('sinnergie_auth');
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { user: string; ts: number };
    // Session expires after 8 hours
    return Date.now() - parsed.ts < 8 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(checkStoredAuth);
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState<boolean>(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [clearDbStep, setClearDbStep] = useState<0 | 1 | 2>(0); // 0=hidden 1=first confirm 2=second confirm

  // Dark / Light Theme engine
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Core records state
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);

  // Supabase Configuration Diagnostics
  const [dbStatus, setDbStatus] = useState<SupabaseConfigStatus>({
    connected: false,
    tablesChecked: false,
    contatosOk: false,
    tarefasOk: false,
    locacoesOk: false,
    usingFallback: true
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Initial Load & Connection Test
  const checkConnectionAndLoad = async () => {
    setLoading(true);
    try {
      const status = await crmService.checkSupabaseConfig();
      setDbStatus(status);

      // Fetch all collections
      const c = await crmService.listContatos(status.usingFallback);
      const t = await crmService.listTarefas(status.usingFallback);
      const l = await crmService.listLocacoes(status.usingFallback);

      setContatos(c);
      setTarefas(t);
      setLocacoes(l);
    } catch (e) {
      console.error('Critical boot error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) checkConnectionAndLoad();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!syncWarning) return;
    const t = setTimeout(() => setSyncWarning(null), 6000);
    return () => clearTimeout(t);
  }, [syncWarning]);

  const showSyncWarning = () => {
    setSyncWarning('⚠️ Dados salvos localmente. Sincronização com nuvem falhou — será tentada novamente.');
  };

  // ── RECONCILIATION HANDLERS ──────────────────────────────────────────────

  const handleSaveContato = async (contato: Partial<Contato>): Promise<Contato> => {
    const { item, syncOk } = await crmService.saveContato(contato, dbStatus.usingFallback);
    if (!syncOk && !dbStatus.usingFallback) showSyncWarning();
    setContatos(prev => {
      const isNew = !contato.id;
      return isNew ? [item, ...prev] : prev.map(c => c.id === item.id ? item : c);
    });
    return item;
  };

  const handleDeleteContato = async (id: string) => {
    const ok = await crmService.deleteContato(id, dbStatus.usingFallback);
    if (ok) setContatos(prev => prev.filter(c => c.id !== id));
    return ok;
  };

  const handleSaveTarefa = async (tarefa: Partial<Tarefa>): Promise<Tarefa> => {
    const { item, syncOk } = await crmService.saveTarefa(tarefa, dbStatus.usingFallback);
    if (!syncOk && !dbStatus.usingFallback) showSyncWarning();
    setTarefas(prev => {
      const isNew = !tarefa.id;
      return isNew ? [item, ...prev] : prev.map(t => t.id === item.id ? item : t);
    });
    return item;
  };

  const handleDeleteTarefa = async (id: string) => {
    const ok = await crmService.deleteTarefa(id, dbStatus.usingFallback);
    if (ok) setTarefas(prev => prev.filter(t => t.id !== id));
    return ok;
  };

  const handleSaveLocacao = async (locacao: Partial<Locacao>): Promise<Locacao> => {
    const { item, syncOk } = await crmService.saveLocacao(locacao, dbStatus.usingFallback);
    if (!syncOk && !dbStatus.usingFallback) showSyncWarning();
    setLocacoes(prev => {
      const isNew = !locacao.id;
      const list = isNew ? [item, ...prev] : prev.map(l => l.id === item.id ? item : l);
      return [...list].sort((a, b) => b.data.localeCompare(a.data));
    });
    return item;
  };

  const handleDeleteLocacao = async (id: string) => {
    const ok = await crmService.deleteLocacao(id, dbStatus.usingFallback);
    if (ok) setLocacoes(prev => prev.filter(l => l.id !== id));
    return ok;
  };

  const handleBulkImportLocacoes = async (items: Partial<Locacao>[]) => {
    const imported = await crmService.importLocacoesCSV(items, dbStatus.usingFallback);
    setLocacoes(prev => [...imported, ...prev].sort((a, b) => b.data.localeCompare(a.data)));
    return imported;
  };

  const handleBulkImportContatos = async (items: Partial<Contato>[]) => {
    const imported = await crmService.importContatosCSV(items, dbStatus.usingFallback);
    setContatos(prev => [...imported, ...prev].sort((a, b) => a.nome.localeCompare(b.nome)));
    return imported;
  };

  const handleLogout = () => {
    localStorage.removeItem('sinnergie_auth');
    setIsAuthenticated(false);
  };

  const handleClearAllData = async () => {
    await crmService.clearAllData(dbStatus.usingFallback);
    setContatos([]);
    setTarefas([]);
    setLocacoes([]);
    setClearDbStep(0);
  };

  // Nav helpers
  const handlePageNavigation = (page: string) => {
    setActivePage(page);
    setIsMobileMenuOpen(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'contatos', label: 'Contatos / CRM', icon: Users },
    { id: 'pipeline', label: 'Pipeline Kanban', icon: Flame },
    { id: 'tarefas', label: 'Tarefas e Retornos', icon: CheckSquare },
    { id: 'locacoes', label: 'Locações de Máquinas', icon: Package },
    { id: 'financeiro', label: 'Gestão Financeira', icon: BarChart2 },
    { id: 'whatsapp', label: 'WhatsApp Marketing', icon: MessageCircle },
    { id: 'fechamento', label: 'Fechamento', icon: Calculator },
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-gray-50 text-gray-900 flex flex-col font-sans`}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="h-16 bg-[#0E0709] text-white flex items-center justify-between px-5 md:px-6 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logotipo */}
          <div className="flex items-center gap-2.5 select-none">
            <div className="w-8 h-8 rounded-lg bg-[#8B1A2E] flex items-center justify-center font-extrabold text-sm text-white shadow-md shadow-[#8B1A2E]/40">
              S
            </div>
            <div className="leading-none">
              <div className="font-bold text-[15px] tracking-tight text-white">Sinnergie</div>
              <div className="text-[10px] text-white/40 font-medium tracking-widest uppercase">CRM</div>
            </div>
          </div>
        </div>

        {/* Lado direito */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleLogout}
            title="Sair da plataforma"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-xs font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-[#8B1A2E] flex items-center justify-center font-bold text-xs text-white select-none border border-[#B02542]/50">
            AD
          </div>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
        <aside className={`
          fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 flex flex-col z-30 transform transition-transform duration-300
          md:relative md:translate-x-0 md:flex-shrink-0
          ${isMobileMenuOpen ? 'translate-x-0 top-16' : '-translate-x-full md:translate-x-0'}
        `}>
          {/* Cabeçalho da sidebar (mobile) */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between md:hidden">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Menu</span>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navegação */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto pt-4">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = activePage === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handlePageNavigation(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left cursor-pointer
                    ${active
                      ? 'bg-[#FBF0F2] text-[#8B1A2E] font-semibold'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#8B1A2E]' : 'text-gray-400'}`} />
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Rodapé da sidebar */}
          <div className="border-t border-gray-100 p-3 space-y-2">
            {/* Indicador de conexão */}
            <button
              type="button"
              onClick={() => setIsDbModalOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors hover:bg-gray-50 cursor-pointer"
              title={dbStatus.usingFallback ? 'Cache local — clique para detalhes' : 'Conectado ao Supabase'}
            >
              {dbStatus.usingFallback
                ? <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                : <Wifi className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              }
              <span className={`font-medium ${dbStatus.usingFallback ? 'text-amber-600' : 'text-emerald-600'}`}>
                {dbStatus.usingFallback ? 'Cache Local' : 'Supabase Online'}
              </span>
            </button>

            {/* Alternar tema */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors cursor-pointer"
            >
              {theme === 'light'
                ? <Moon className="w-3.5 h-3.5 shrink-0" />
                : <Sun className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              }
              <span className="font-medium">{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
            </button>

            {/* Console Supabase */}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">Console Supabase</span>
            </a>

            {/* Limpar Base de Dados */}
            <button
              type="button"
              onClick={() => setClearDbStep(1)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">Limpar Base de Dados</span>
            </button>

            <div className="text-[10px] text-gray-300 text-center pt-1 font-medium">
              Sinnergie Aesthetic Technologies
            </div>
          </div>
        </aside>

        {/* Overlay mobile */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 z-20 md:hidden top-16"
          />
        )}

        {/* ── CONTEÚDO PRINCIPAL ───────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-5 py-6 md:p-8 w-full">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center space-y-4">
                <div className="w-9 h-9 rounded-full border-4 border-gray-200 border-t-[#8B1A2E] animate-spin" />
                <p className="text-xs text-gray-400 tracking-wider font-semibold uppercase">Carregando Sinnergie CRM...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {activePage === 'dashboard' && (
                  <Dashboard
                    contatos={contatos}
                    tarefas={tarefas}
                    locacoes={locacoes}
                    onNavigate={handlePageNavigation}
                    openDbModal={() => setIsDbModalOpen(true)}
                  />
                )}
                {activePage === 'contatos' && (
                  <Contatos
                    contatos={contatos}
                    onSave={handleSaveContato}
                    onDelete={handleDeleteContato}
                    onBulkImport={handleBulkImportContatos}
                  />
                )}
                {activePage === 'pipeline' && (
                  <Pipeline
                    contatos={contatos}
                    onSave={handleSaveContato}
                    onNavigateToContacts={() => handlePageNavigation('contatos')}
                  />
                )}
                {activePage === 'tarefas' && (
                  <Tarefas
                    tarefas={tarefas}
                    contatos={contatos}
                    onSave={handleSaveTarefa}
                    onDelete={handleDeleteTarefa}
                  />
                )}
                {activePage === 'locacoes' && (
                  <Locacoes
                    locacoes={locacoes}
                    onSave={handleSaveLocacao}
                    onDelete={handleDeleteLocacao}
                    onBulkImport={handleBulkImportLocacoes}
                  />
                )}
                {activePage === 'financeiro' && (
                  <Financeiro
                    locacoes={locacoes}
                    onSave={handleSaveLocacao}
                  />
                )}
                {activePage === 'whatsapp' && (
                  <WhatsApp contatos={contatos} />
                )}
                {activePage === 'fechamento' && (
                  <Fechamento locacoes={locacoes} />
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── ASSISTENTE IA FLUTUANTE ───────────────────────────────────── */}
      <AiAssistant
        contatos={contatos}
        tarefas={tarefas}
        locacoes={locacoes}
        onCreateLocacao={handleSaveLocacao}
        onCreateTarefa={handleSaveTarefa}
        onCreateContato={handleSaveContato}
        onUpdateLocacao={(id, data) => handleSaveLocacao({ id, ...data })}
      />

      {/* ── MODAL DIAGNÓSTICO SUPABASE ─────────────────────────────────── */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        status={dbStatus}
        onRefresh={checkConnectionAndLoad}
      />

      {/* ── MODAL LIMPAR BASE DE DADOS ─────────────────────────────────── */}
      {clearDbStep > 0 && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {clearDbStep === 1 ? 'Limpar Base de Dados?' : 'Tem certeza absoluta?'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {clearDbStep === 1
                    ? 'Todos os contatos, tarefas e locações serão removidos permanentemente.'
                    : 'Esta ação é irreversível. Todos os dados serão apagados agora.'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setClearDbStep(0)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => clearDbStep === 1 ? setClearDbStep(2) : handleClearAllData()}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {clearDbStep === 1 ? 'Continuar' : 'Apagar Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ERRO DE SYNC ─────────────────────────────────────────── */}
      {syncWarning && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-amber-950 border border-amber-700 text-amber-200 text-xs px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-medium max-w-sm text-center">
          <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{syncWarning}</span>
        </div>
      )}
    </div>
  );
}
