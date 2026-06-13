import { useState } from 'react';
import { Locacao } from '../types';
import { TrendingUp, DollarSign, FileText, CheckCircle2, Download, Printer } from 'lucide-react';

interface FinanceiroProps {
  locacoes: Locacao[];
  onSave: (locacao: Partial<Locacao>) => Promise<Locacao>;
}

export default function Financeiro({ locacoes, onSave }: FinanceiroProps) {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  const [selectedEq, setSelectedEq] = useState('Todos');
  const [selectedCity, setSelectedCity] = useState('Todos');

  // Filter Logic matching the core system
  const filteredLocs = locacoes.filter(l => {
    // Only completed rentals participate in actual finalized revenue stats
    if (l.status !== 'concluido') return false;

    const matchesYear = l.data.startsWith(selectedYear);
    
    let matchesMonth = true;
    if (selectedMonth !== 'Todos') {
      const monthPrefix = `-${selectedMonth.padStart(2, '0')}-`;
      matchesMonth = l.data.includes(monthPrefix);
    }

    const matchesEq = selectedEq === 'Todos' || l.equipamento === selectedEq;
    const matchesCity = selectedCity === 'Todos' || l.cidade === selectedCity;

    return matchesYear && matchesMonth && matchesEq && matchesCity;
  });

  // Unique list generators for filter options
  const uniqueEqs = Array.from(new Set(locacoes.map(l => l.equipamento).filter(Boolean)));
  const uniqueCities = Array.from(new Set(locacoes.map(l => l.cidade).filter(Boolean)));

  // KPI Calculations
  const totalRevenue = filteredLocs.reduce((sum, item) => sum + item.valor_final, 0);
  const totalCount = filteredLocs.length;
  const ticketMedio = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;

  // Pending NFs for the select period
  const pendingNfList = filteredLocs.filter(l => !l.nf_emitida);
  const pendingNfsCount = pendingNfList.length;
  const pendingNfsVolume = pendingNfList.reduce((sum, item) => sum + item.valor_final, 0);

  // Group by Equipment for Bar Charts
  const eqGroup: Record<string, number> = {};
  filteredLocs.forEach(l => {
    eqGroup[l.equipamento] = (eqGroup[l.equipamento] || 0) + l.valor_final;
  });
  // Sort equipment by volume descending
  const eqData = Object.entries(eqGroup)
    .map(([l, v]) => ({ l, v }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 5);

  // Group by City for Bar Charts
  const cityGroup: Record<string, number> = {};
  filteredLocs.forEach(l => {
    cityGroup[l.cidade] = (cityGroup[l.cidade] || 0) + l.valor_final;
  });
  const cityData = Object.entries(cityGroup)
    .map(([l, v]) => ({ l, v }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 5);

  // Group by Month (Fiscal Year)
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyRevenue = Array(12).fill(0);
  filteredLocs.forEach(l => {
    const monthIdx = parseInt(l.data.split('-')[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      monthlyRevenue[monthIdx] += l.valor_final;
    }
  });
  const monthlyData = monthNames.map((name, idx) => ({
    l: name,
    v: monthlyRevenue[idx]
  }));

  // Top Customers Ranking
  const customerGroup: Record<string, { total: number; count: number }> = {};
  filteredLocs.forEach(l => {
    if (!customerGroup[l.cliente]) {
      customerGroup[l.cliente] = { total: 0, count: 0 };
    }
    customerGroup[l.cliente].total += l.valor_final;
    customerGroup[l.cliente].count += 1;
  });
  const topCustomers = Object.entries(customerGroup)
    .map(([n, data]) => ({ n, v: data.total, c: data.count }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 10);

  const highestCustomerValue = topCustomers[0]?.v || 1;

  const markNfAsEmitted = async (rental: Locacao) => {
    await onSave({ ...rental, nf_emitida: true });
  };

  const exportCSV = () => {
    const headers = ['Data', 'Cliente', 'Dra', 'Equipamento', 'Cidade', 'Base Tipo', 'Base Valor', 'Mão de Obra', 'Deslocamento', 'Valor Locação', 'Valor Final', 'NF Emitida', 'Status', 'Observações'];
    const rows = filteredLocs.map(l => [
      l.data.split('-').reverse().join('/'),
      l.cliente,
      l.dra || '',
      l.equipamento,
      l.cidade || '',
      l.base_calculo_tipo,
      l.base_calculo_valor,
      l.mao_de_obra,
      l.deslocamento,
      l.valor_locacao,
      l.valor_final,
      l.nf_emitida ? 'Sim' : 'Não',
      l.status,
      l.observacoes || ''
    ]);

    const csvContent = '﻿' + [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sinnergie_Financeiro_${selectedYear}${selectedMonth !== 'Todos' ? '_' + selectedMonth.padStart(2, '0') : ''}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="text-emerald-500 text-xl">📊</span> Inteligência Financeira
          </h2>
          <p className="text-xs text-gray-500 mt-1">Análise detalhada de faturamento, faturamentos em aberto, metas fiscais e ticket médio das estéticas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            disabled={filteredLocs.length === 0}
            className="flex items-center gap-2 text-xs bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50 px-3.5 py-2 rounded-xl transition-all font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
          <button
            type="button"
            onClick={exportPDF}
            className="flex items-center gap-2 text-xs bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3.5 py-2 rounded-xl transition-all font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4.5 space-y-3">
        <span className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1">
          Filtros de Análise Analítica
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
            >
              <option value="2026">Ano 2026 (Corrente)</option>
              <option value="2025">Ano 2025</option>
            </select>
          </div>

          <div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
            >
              <option value="Todos">Mês (Todos)</option>
              <option value="1">Janeiro</option>
              <option value="2">Fevereiro</option>
              <option value="3">Março</option>
              <option value="4">Abril</option>
              <option value="5">Maio</option>
              <option value="6">Junho</option>
              <option value="7">Julho</option>
              <option value="8">Agosto</option>
              <option value="9">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
          </div>

          <div>
            <select
              value={selectedEq}
              onChange={(e) => setSelectedEq(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
            >
              <option value="Todos">Equipamento (Todos)</option>
              {uniqueEqs.map((e, idx) => (
                <option key={idx} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
            >
              <option value="Todos">Cidades (Todas)</option>
              {uniqueCities.map((c, idx) => (
                <option key={idx} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4.5 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5 border border-emerald-100">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-900">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </h4>
            <span className="block text-xs text-gray-550 mt-0.5 font-medium">Receita Total</span>
            <span className="block text-[10px] text-gray-400 mt-0.5">{totalCount} diárias faturadas</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4.5 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5 border border-blue-100 font-bold">
            U
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-900">
              {totalCount}
            </h4>
            <span className="block text-xs text-gray-550 mt-0.5 font-medium">Diárias Contratadas</span>
            <span className="block text-[10px] text-gray-400 mt-0.5">Sessões concluídas</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4.5 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0 mt-0.5 border border-purple-100">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-900">
              R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </h4>
            <span className="block text-xs text-gray-550 mt-0.5 font-medium">Ticket Médio</span>
            <span className="block text-[10px] text-gray-400 mt-0.5">Por sessão comercial</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4.5 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5 border border-amber-100">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xl font-bold text-gray-900">
              {pendingNfsCount}
            </h4>
            <span className="block text-xs text-gray-555 mt-0.5 font-medium">NF Pendentes</span>
            <span className="block text-[10px] text-amber-700 font-semibold mt-0.5">R$ {pendingNfsVolume.toLocaleString('pt-BR')} em aberto</span>
          </div>
        </div>
      </div>

      {/* Vertical columns: Revenue by Equipment and City */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Machinery Revenue */}
        <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span>📦</span> Faturamento por Equipamento
          </h3>
          {eqData.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-405">Sem dados de faturamento para os filtros.</div>
          ) : (
            <div className="flex items-end gap-3.5 h-44 pt-6">
              {eqData.map((item, idx) => {
                const maxVal = Math.max(...eqData.map(d => d.v), 1);
                const percentHeight = Math.max((item.v / maxVal) * 105, 5);
                const valueShortText = item.v >= 1000 ? `R$ ${(item.v/1000).toFixed(1)}k` : `R$ ${item.v}`;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <span className="text-[9px] text-emerald-700 font-bold mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {valueShortText}
                    </span>
                    <div 
                      className="w-full bg-[#3ecf8e] hover:bg-emerald-400 rounded-t-md transition-all duration-500"
                      style={{ height: `${percentHeight}%` }}
                    />
                    <span className="text-[10px] text-gray-600 mt-3.5 text-center font-bold font-sans truncate w-full" title={item.l}>
                      {item.l.replace('Ultraformer', 'U.')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* City Revenue */}
        <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span>📍</span> Faturamento por Cidade de Entrega
          </h3>
          {cityData.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-405">Sem dados de faturamento para os filtros.</div>
          ) : (
            <div className="flex items-end gap-3.5 h-44 pt-6">
              {cityData.map((item, idx) => {
                const maxVal = Math.max(...cityData.map(d => d.v), 1);
                const percentHeight = Math.max((item.v / maxVal) * 105, 5);
                const valueShortText = item.v >= 1000 ? `R$ ${(item.v/1000).toFixed(1)}k` : `R$ ${item.v}`;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <span className="text-[9px] text-emerald-700 font-bold mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-mono">
                      {valueShortText}
                    </span>
                    <div 
                      className="w-full bg-[#8B1A2E] hover:bg-emerald-500 rounded-t-md transition-all duration-500"
                      style={{ height: `${percentHeight}%` }}
                    />
                    <span className="text-[10px] text-gray-600 mt-3.5 text-center font-bold truncate w-full" title={item.l}>
                      {item.l}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Chart (Continuous stream of month-bars) */}
      <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <span>📅</span> Receita Mensal — Ano Fiscal
        </h3>
        <div className="flex items-end gap-1.5 md:gap-3 h-28 pt-4">
          {monthlyData.map((item, idx) => {
            const maxVal = Math.max(...monthlyData.map(d => d.v), 1);
            const percentHeight = Math.max((item.v / maxVal) * 100, 4);

            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                {item.v > 0 && (
                  <span className="text-[8px] text-emerald-800 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-semibold">
                    R$ {(item.v / 1000).toFixed(0)}k
                  </span>
                )}
                <div 
                  className={`w-full rounded-t-sm transition-all duration-500 ${item.v > 0 ? 'bg-[#8B1A2E] group-hover:bg-emerald-500' : 'bg-gray-100 h-1'}`}
                  style={{ height: item.v > 0 ? `${percentHeight}%` : '4px' }}
                />
                <span className="text-[9px] text-gray-500 mt-3 font-semibold">{item.l}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom split: Top customers & Invoice checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top customers */}
        <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span>🏆</span> Top Clientes por Receita Final
          </h3>
          {topCustomers.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-405">Nenhum cliente mapeado.</div>
          ) : (
            <div className="space-y-3.5">
              {topCustomers.map((c, idx) => {
                const percent = Math.round((c.v / highestCustomerValue) * 100);

                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-5 text-right font-bold text-xs text-gray-400">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-xs pb-0.5">
                        <span className="font-bold text-gray-800 truncate">{c.n}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-emerald-800">R$ {c.v.toLocaleString('pt-BR')}</span>
                          <span className="text-[9px] text-gray-400">({c.c} loc.)</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-555 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invoice pending checklist list */}
        <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
            <span>🧾</span> Notas Fiscais Pendentes de Emissão
          </h3>
          {pendingNfList.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-emerald-100 rounded-xl bg-emerald-50/20 p-6 flex flex-col items-center gap-1.5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className="text-xs text-emerald-600 font-bold">Incondicionalmente em Dia</p>
              <p className="text-[10px] text-gray-500">Todas as notas fiscais concluídas no período foram emitidas.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto no-scrollbar">
              {pendingNfList.map((item) => (
                <div key={item.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 flex items-center justify-between gap-3.5">
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-gray-900 truncate">{item.cliente}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {item.equipamento} · {item.data.split('-').reverse().join('/')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-emerald-800 font-mono">
                      R$ {item.valor_final.toLocaleString('pt-BR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => markNfAsEmitted(item)}
                      className="bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-[10px] text-emerald-700 font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer"
                    >
                      Marcar Emitida
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
