import { useState } from 'react';
import { Contato, Tarefa, Locacao } from '../types';
import { geminiService } from '../geminiService';
import { Users, Flame, Zap, CheckSquare, Package, AlertTriangle, ArrowRight, DollarSign, BarChart2, FileText, Settings, Sparkles, Loader2 } from 'lucide-react';

interface DashboardProps {
  contatos: Contato[];
  tarefas: Tarefa[];
  locacoes: Locacao[];
  onNavigate: (page: string) => void;
  openDbModal: () => void;
}

export default function Dashboard({ contatos, tarefas, locacoes, onNavigate, openDbModal }: DashboardProps) {
  // Dynamic date references
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentYear = today.getFullYear().toString();
  const currentYearMonth = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Analytical Calculations
  const totalContacts = contatos.length;
  const contactsThisMonth = contatos.filter(c => c.created_at?.startsWith(currentYearMonth)).length;
  const hotLeads = contatos.filter(c => c.status === 'hot').length;
  const activeClients = contatos.filter(c => c.status === 'active').length;

  // Tasks calculations
  const pendingTasks = tarefas.filter(t => t.status === 'pendente');
  const totalPendingTasksCount = pendingTasks.length;
  const overdueTasksCount = pendingTasks.filter(t => t.vencimento < todayStr).length;

  // Next rentals from today onwards
  const futureRentals = locacoes
    .filter(l => l.data >= todayStr && l.status === 'agendado')
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 4);

  const activeRentalsCount = locacoes.filter(l => l.status === 'agendado').length;

  // Financial overview
  const completedRentals = locacoes.filter(l => l.status === 'concluido');

  // This Month Revenue (dynamic)
  const juneRevenue = completedRentals
    .filter(l => l.data.startsWith(currentYearMonth))
    .reduce((acc, curr) => acc + curr.valor_final, 0);

  // Year Revenue (dynamic)
  const year2026Revenue = completedRentals
    .filter(l => l.data.startsWith(currentYear))
    .reduce((acc, curr) => acc + curr.valor_final, 0);

  // Pending NFs
  const pendingNFsCount = completedRentals.filter(l => !l.nf_emitida).length;

  // Equipment Stats (Real analysis based on rentals frequency)
  const ultraCount = locacoes.filter(l => l.equipamento === 'Ultraformer III').length;
  const vectusCount = locacoes.filter(l => l.equipamento === 'Vectus').length;
  const co2Count = locacoes.filter(l => l.equipamento === 'CO2 Fracionado').length;
  const endoCount = locacoes.filter(l => l.equipamento === 'Endolaser').length;
  const mptCount = locacoes.filter(l => l.equipamento === 'Ultraformer MPT').length;

  const maxCount = Math.max(ultraCount, vectusCount, co2Count, endoCount, mptCount, 1);

  const equipmentStats = [
    { name: 'Ultraformer III', count: ultraCount, color: '#c9a84c', width: ultraCount === 0 ? '0%' : `${(ultraCount / maxCount) * 100}%` },
    { name: 'Vectus', count: vectusCount, color: '#8b5cf6', width: vectusCount === 0 ? '0%' : `${(vectusCount / maxCount) * 100}%` },
    { name: 'CO2 Fracionado', count: co2Count, color: '#60a5fa', width: co2Count === 0 ? '0%' : `${(co2Count / maxCount) * 100}%` },
    { name: 'Endolaser', count: endoCount, color: '#10b981', width: endoCount === 0 ? '0%' : `${(endoCount / maxCount) * 100}%` },
    { name: 'Ultraformer MPT', count: mptCount, color: '#f59e0b', width: mptCount === 0 ? '0%' : `${(mptCount / maxCount) * 100}%` }
  ];

  // Pipeline funnel stats
  const pipelineStats = {
    hot: contatos.filter(c => c.status === 'hot').length,
    warm: contatos.filter(c => c.status === 'warm').length,
    cold: contatos.filter(c => c.status === 'cold').length,
    active: contatos.filter(c => c.status === 'active').length,
    lost: contatos.filter(c => c.status === 'lost').length,
  };

  const formattedDate = today.toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // AI Summary state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await geminiService.dailySummary(tarefas, locacoes);
      setAiSummary(result);
    } catch (e: any) {
      setAiError(e.message || 'Erro ao gerar resumo. Verifique a chave VITE_GEMINI_API_KEY.');
    }
    setAiLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Upper header action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Painel de Controle</h2>
          <p className="text-xs text-gray-500 mt-1">Visão geral da sua carteira comercial · {formattedDate}</p>
        </div>
        <button
          type="button"
          onClick={openDbModal}
          className="flex items-center gap-2 text-xs bg-white border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3.5 py-2 rounded-xl transition-all shadow-xs font-semibold cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-emerald-500" />
          Configurar Banco Supabase
        </button>
      </div>

      {/* AI Daily Summary Card */}
      <div className="bg-gradient-to-br from-[#0f1a14] to-[#0c1a10] border border-emerald-900/60 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/60 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#3ecf8e]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Resumo IA do Dia</h3>
              <p className="text-[10px] text-emerald-700/80">Powered by Gemini AI</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={aiLoading || !geminiService.isAvailable()}
            className="flex items-center gap-2 text-xs bg-[#3ecf8e] hover:bg-emerald-400 disabled:bg-emerald-900 disabled:text-emerald-600 text-black font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            title={!geminiService.isAvailable() ? 'Configure VITE_GEMINI_API_KEY no arquivo .env' : ''}
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {aiLoading ? 'Gerando...' : aiSummary ? 'Atualizar' : 'Gerar Resumo'}
          </button>
        </div>

        {!geminiService.isAvailable() && (
          <p className="text-[11px] text-emerald-800 italic">
            Configure <code className="bg-emerald-950 px-1 rounded text-emerald-500">VITE_GEMINI_API_KEY</code> no arquivo <code className="bg-emerald-950 px-1 rounded text-emerald-500">.env</code> para ativar o Resumo IA.
          </p>
        )}

        {aiError && (
          <div className="bg-rose-950/40 border border-rose-800/50 text-rose-400 text-xs rounded-lg px-3 py-2">{aiError}</div>
        )}

        {aiSummary && !aiLoading && (
          <div className="text-[12px] text-emerald-100/90 leading-relaxed whitespace-pre-wrap bg-emerald-950/30 rounded-lg px-4 py-3 border border-emerald-900/40">
            {aiSummary}
          </div>
        )}

        {!aiSummary && !aiLoading && geminiService.isAvailable() && (
          <p className="text-[11px] text-emerald-800/70 italic">Clique em "Gerar Resumo" para analisar tarefas e locações do dia com IA.</p>
        )}
      </div>

      {/* Alert Warning */}
      {overdueTasksCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-sm text-amber-900 transition-all">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-amber-800">{overdueTasksCount} tarefas estão atrasadas.</span>
            <span className="text-amber-700 ml-1">Por favor revise os prazos pendentes ou conclua-os para manter o CRM atualizado.</span>
          </div>
          <button 
            type="button" 
            onClick={() => onNavigate('tarefas')} 
            className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            Ver tarefas <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Core KPIs 5 grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-250/70 shadow-xs rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Contatos</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-gray-900">{totalContacts}</span>
            <span className="text-[10px] text-emerald-600 ml-1.5 font-bold">+{contactsThisMonth} este mês</span>
          </div>
        </div>

        <div className="bg-white border border-gray-250/70 shadow-xs rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Leads Quentes</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <Flame className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-gray-900">{hotLeads}</span>
            <span className="text-[10px] text-gray-400 ml-1.5 font-medium">Para abordar</span>
          </div>
        </div>

        <div className="bg-white border border-gray-250/70 shadow-xs rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Clientes Ativos</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-gray-900">{activeClients}</span>
            <span className="text-[10px] text-emerald-650 font-semibold ml-1.5">Mensais ativos</span>
          </div>
        </div>

        <div className="bg-white border border-gray-250/70 shadow-xs rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Tarefas Ativas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-gray-900">{totalPendingTasksCount}</span>
            {overdueTasksCount > 0 ? (
              <span className="text-[10px] text-rose-600 ml-1.5 font-bold">{overdueTasksCount} em atraso!</span>
            ) : (
              <span className="text-[10px] text-gray-400 ml-1.5 font-medium">Em andamento</span>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-250/70 shadow-xs rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Locações Próximas</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Package className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-gray-900">{futureRentals.length}</span>
            <span className="text-[10px] text-gray-400 ml-1.5 font-medium">Próximos 7 dias</span>
          </div>
        </div>
      </div>

      {/* Finance Section */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-emerald-500">📊</span> Desempenho Financeiro
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            onClick={() => onNavigate('financeiro')}
            className="bg-gray-50 hover:bg-gray-100/70 border border-gray-100 rounded-xl p-4 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Receita do Mês (Junho)
            </div>
            <div className="text-xl font-bold text-gray-900 mt-2">
              R$ {juneRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Locações executadas no período</div>
          </div>

          <div 
            onClick={() => onNavigate('financeiro')}
            className="bg-gray-50 hover:bg-gray-100/70 border border-gray-100 rounded-xl p-4 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              Receita Anual Acumulada
            </div>
            <div className="text-xl font-bold text-gray-900 mt-2">
              R$ {year2026Revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Ano fiscal de 2026</div>
          </div>

          <div 
            onClick={() => onNavigate('financeiro')}
            className="bg-gray-50 hover:bg-gray-100/70 border border-gray-100 rounded-xl p-4 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText className="w-4 h-4 text-amber-500" />
              NFs Pendentes de Emissão
            </div>
            <div className="text-xl font-bold text-gray-900 mt-2">
              {pendingNFsCount}
            </div>
            <div className="text-[10px] text-amber-600 mt-1 font-semibold">Requer faturamento imediato</div>
          </div>

          <div 
            onClick={() => onNavigate('locacoes')}
            className="bg-gray-50 hover:bg-gray-100/70 border border-gray-100 rounded-xl p-4 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Package className="w-4 h-4 text-purple-500" />
              Locações Ativas / Agendadas
            </div>
            <div className="text-xl font-bold text-gray-900 mt-2">
              {activeRentalsCount}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Agenda para as máquinas</div>
          </div>
        </div>
      </div>

      {/* Equipment and Funnel Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Equipment Popularity */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-purple-500">📦</span> Participação por Equipamento
          </h3>
          <div className="space-y-3">
            {equipmentStats.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-700">{item.name}</span>
                  <span className="text-xs text-gray-400 font-semibold">{item.count} clientes engajados</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ backgroundColor: item.color, width: item.width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales Pipeline status */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-emerald-500">⚡</span> Funil de Vendas da Carteira
            </h3>
            <button 
              type="button" 
              onClick={() => onNavigate('pipeline')}
              className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
            >
              Kanban Pipeline →
            </button>
          </div>

          <div className="space-y-2">
            {/* Hot */}
            <div className="flex items-center gap-3">
              <div className="w-16 text-right text-xs font-bold text-rose-550">Quente (Hot)</div>
              <div className="flex-1 h-3 bg-gray-100 rounded-md overflow-hidden relative">
                <div className="h-full bg-rose-500 rounded-md" style={{ width: `${Math.min(pipelineStats.hot * 10, 100)}%` }}></div>
              </div>
              <div className="w-8 text-xs text-right text-gray-500 font-semibold">{pipelineStats.hot}</div>
            </div>

            {/* Warm */}
            <div className="flex items-center gap-3">
              <div className="w-16 text-right text-xs font-bold text-amber-600">Leve (Warm)</div>
              <div className="flex-1 h-3 bg-gray-100 rounded-md overflow-hidden relative">
                <div className="h-full bg-amber-500 rounded-md" style={{ width: `${Math.min(pipelineStats.warm * 10, 100)}%` }}></div>
              </div>
              <div className="w-8 text-xs text-right text-gray-500 font-semibold">{pipelineStats.warm}</div>
            </div>

            {/* Cold */}
            <div className="flex items-center gap-3">
              <div className="w-16 text-right text-xs font-bold text-blue-600">Frio (Cold)</div>
              <div className="flex-1 h-3 bg-gray-100 rounded-md overflow-hidden relative">
                <div className="h-full bg-blue-500 rounded-md" style={{ width: `${Math.min(pipelineStats.cold * 1.5, 100)}%` }}></div>
              </div>
              <div className="w-8 text-xs text-right text-gray-500 font-semibold">{pipelineStats.cold}</div>
            </div>

            {/* Active */}
            <div className="flex items-center gap-3">
              <div className="w-16 text-right text-xs font-bold text-emerald-600">Ativos</div>
              <div className="flex-1 h-3 bg-gray-100 rounded-md overflow-hidden relative">
                <div className="h-full bg-emerald-500 rounded-md" style={{ width: `${Math.min(pipelineStats.active * 10, 100)}%` }}></div>
              </div>
              <div className="w-8 text-xs text-right text-gray-500 font-semibold">{pipelineStats.active}</div>
            </div>

            {/* Lost */}
            <div className="flex items-center gap-3">
              <div className="w-16 text-right text-xs font-bold text-gray-400">Perdidos</div>
              <div className="flex-1 h-3 bg-gray-100 rounded-md overflow-hidden relative">
                <div className="h-full bg-gray-400 rounded-md" style={{ width: `${Math.min(pipelineStats.lost * 10, 100)}%` }}></div>
              </div>
              <div className="w-8 text-xs text-right text-gray-500 font-semibold">{pipelineStats.lost}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming rentals table/summary */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <span className="text-emerald-500">📅</span> Próximas Locações Agendadas
          </h3>
          <button 
            type="button" 
            onClick={() => onNavigate('locacoes')}
            className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
          >
            Ver toda agenda →
          </button>
        </div>

        {futureRentals.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
            <p className="text-xs text-gray-400">Nenhuma locação agendada para os próximos dias.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {futureRentals.map((rental) => (
              <div key={rental.id} className="bg-gray-50 border border-gray-100/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-sm text-gray-950">{rental.cliente}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {rental.equipamento} · {rental.cidade} {rental.dra ? `· Dra. ${rental.dra}` : ''}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t border-gray-200 sm:border-0 pt-2 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <span className="block text-xs font-bold text-emerald-700">{rental.data.split('-').reverse().join('/')} às {rental.horario}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Valor Final: R$ {rental.valor_final.toLocaleString('pt-BR')}</span>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-semibold">
                    Confirmado
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
