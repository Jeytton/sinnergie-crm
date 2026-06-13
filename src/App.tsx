import { useState, useEffect } from 'react';
import { crmService } from './crmService';
import { Contato, Tarefa, Locacao, SupabaseConfigStatus } from './types';
import Dashboard from './components/Dashboard';
import Contatos from './components/Contatos';
import Pipeline from './components/Pipeline';
import Tarefas from './components/Tarefas';
import Locacoes from './components/Locacoes';
import Financeiro from './components/Financeiro';
import DatabaseModal from './components/DatabaseModal';
import Login from './components/Login';

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
  CloudOff
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

  // Nav helpers
  const handlePageNavigation = (page: string) => {
    setActivePage(page);
    setIsMobileMenuOpen(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-gray-50 text-gray-900 flex flex-col font-sans`}>
      
      {/* GLOBAL HEADER */}
      <header className="h-16 bg-[#1c1c1c] text-white flex items-center justify-between px-5 md:px-6 border-b border-gray-800 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu button */}
          <button 
            type="button" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Brand Logo */}
          <div className="w-8 h-8 rounded bg-[#3ecf8e] flex items-center justify-center font-extrabold text-sm text-black">
            S
          </div>
          <span className="font-bold text-lg tracking-tight select-none">Sinnergie</span>
          <span className="bg-gray-800 text-[10px] px-2 py-0.5 rounded text-gray-400 font-mono ml-1.5 hidden sm:inline-block">v1.3</span>
        </div>
        
        {/* Right side status & action buttons */}
        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden sm:block text-right">
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Projeto Supabase</div>
            <div className="text-xs font-mono text-[#3ecf8e] hover:underline cursor-pointer" onClick={() => setIsDbModalOpen(true)}>hjafwucsytjqsbszftyz</div>
          </div>
          
          <div className="flex items-center gap-3 border-l border-gray-800 pl-4 md:pl-6">
            <div 
              onClick={() => setIsDbModalOpen(true)}
              className="flex items-center gap-2 cursor-pointer bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-800 transition-colors animate-pulse"
              title={dbStatus.usingFallback ? "Armazenando em Cache Local" : "Sincronizado com Supabase Cloud"}
            >
              <div className={`w-2 h-2 rounded-full ${dbStatus.usingFallback ? 'bg-amber-400' : 'bg-[#3ecf8e]'}`} />
              <span className="text-[10px] font-mono font-medium text-gray-300 uppercase">
                {dbStatus.usingFallback ? 'Cache Local' : 'Ao Vivo'}
              </span>
            </div>
            
            <button
              type="button"
              onClick={handleLogout}
              title="Sair da plataforma"
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3ecf8e] to-emerald-400 flex items-center justify-center font-bold text-sm text-black select-none">
              AD
            </div>
          </div>
        </div>
      </header>

      {/* BODY WRAPPER */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* CORES SIDEBAR CONTAINER */}
        <aside className={`
          fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-30 transform transition-transform duration-300 md:relative md:translate-x-0 md:flex-shrink-0
          ${isMobileMenuOpen ? 'translate-x-0 top-16' : '-translate-x-full md:translate-x-0'}
        `}>
          {/* Sidebar Section Info */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Módulos Core</div>
            <button 
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation panel */}
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button
              type="button"
              onClick={() => handlePageNavigation('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${activePage === 'dashboard' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <LayoutDashboard className="w-4 h-4 text-gray-400" /> Painel Geral
            </button>

            <button
              type="button"
              onClick={() => handlePageNavigation('contatos')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${activePage === 'contatos' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Users className="w-4 h-4 text-gray-400" /> Contatos / CRM
            </button>

            <button
              type="button"
              onClick={() => handlePageNavigation('pipeline')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${activePage === 'pipeline' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Flame className="w-4 h-4 text-gray-400" /> Pipeline Kanban
            </button>

            <button
              type="button"
              onClick={() => handlePageNavigation('tarefas')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${activePage === 'tarefas' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <CheckSquare className="w-4 h-4 text-gray-400" /> Tarefas e Retornos
            </button>

            <button
              type="button"
              onClick={() => handlePageNavigation('locacoes')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${activePage === 'locacoes' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Package className="w-4 h-4 text-gray-400" /> Locações de Máquinas
            </button>

            <button
              type="button"
              onClick={() => handlePageNavigation('financeiro')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${activePage === 'financeiro' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <BarChart2 className="w-4 h-4 text-gray-400" /> Gestão Financeira
            </button>
          </nav>

          {/* Corporate branding links */}
          <div className="p-4 border-t border-gray-100 space-y-2">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Configuração</div>
            
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="w-full flex items-center justify-between text-xs text-gray-600 hover:text-emerald-700 bg-gray-50 hover:bg-emerald-50/50 p-2.5 rounded-lg transition-colors border border-gray-100 cursor-pointer"
              title="Alternar Tema (Modo Claro / Escuro)"
            >
              <div className="flex items-center gap-2">
                {theme === 'light' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-gray-500" />
                    <span className="font-semibold text-[11px] text-gray-700">Tema: Claro</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-semibold text-[11px] text-gray-100">Tema: Escuro</span>
                  </>
                )}
              </div>
              <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase font-mono tracking-wider font-semibold">Alternar</span>
            </button>

            <a
              href="https://hjafwucsytjqsbszftyz.supabase.co" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between text-xs text-gray-600 hover:text-emerald-700 bg-gray-50 hover:bg-emerald-50/50 p-2.5 rounded-lg transition-colors border border-gray-100"
            >
              <span className="font-semibold truncate text-[11px]">Console Supabase</span>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            </a>
            <div className="text-[10px] text-gray-400 text-center font-medium pt-1">
              Sinnergie Aesthetic Technologies
            </div>
          </div>
        </aside>

        {/* OVERLAY FOR MOBILE NAVIGATION MENU CLOSURES */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 z-20 md:hidden top-16"
          />
        )}

        {/* CORE CONTENT RUNTIME CONTAINER */}
        <main className="flex-1 overflow-y-auto px-5 py-6 md:p-8 w-full">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center space-y-4">
                <div className="w-9 h-9 rounded-full border-4 border-gray-200 border-t-emerald-500 animate-spin" />
                <p className="text-xs text-gray-500 tracking-wider font-semibold uppercase">Carregando Plataforma Sinnergie...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Navigational switcher container */}
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
              </div>
            )}
          </div>
        </main>
      </div>

      {/* DIAGNOSTIC CONNECTION MODAL */}
      <DatabaseModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        status={dbStatus}
        onRefresh={checkConnectionAndLoad}
      />

      {/* SYNC WARNING TOAST */}
      {syncWarning && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-amber-950 border border-amber-700 text-amber-200 text-xs px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 font-medium max-w-sm text-center">
          <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{syncWarning}</span>
        </div>
      )}
    </div>
  );
}
