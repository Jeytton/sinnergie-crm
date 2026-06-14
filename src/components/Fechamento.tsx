import { useState, useEffect } from 'react';
import { Locacao } from '../types';
import { Download, FileText, TrendingUp, DollarSign, MapPin, List, Calculator } from 'lucide-react';

interface FechamentoProps {
  locacoes: Locacao[];
}

type Tab = 'alessandro' | 'luiza';

const ALEX_DISPAROS = ['Ultraformer III', 'Ultraformer MPT'];
const ALEX_HORAS = ['Endolaser', 'CO2 Fracionado', 'CO2 Íntimo', 'Vectus'];
const ALEX_ALL = [...ALEX_DISPAROS, ...ALEX_HORAS];
const ALL_EQUIPMENT = ['Ultraformer III', 'Ultraformer MPT', 'Endolaser', 'CO2 Fracionado', 'CO2 Íntimo', 'Vectus', 'Lavieen', 'Onda Coolwaves'];

const SALARIO_FIXO = 2000;
const ADIANTAMENTO = 700;
const PARCELA_VALOR = 125;

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function calcComissao(base: number): { valor: number; rate: number; faixa: string } {
  if (base > 100000) return { valor: base * 0.025, rate: 2.5, faixa: 'Acima de R$ 100.000 → 2,5%' };
  if (base > 75000)  return { valor: base * 0.020,  rate: 2.0,  faixa: 'Acima de R$ 75.000 → 2,0%' };
  if (base > 50000)  return { valor: base * 0.015, rate: 1.5, faixa: 'Acima de R$ 50.000 → 1,5%' };
  if (base > 45000)  return { valor: base * 0.010,  rate: 1.0,  faixa: 'Acima de R$ 45.000 → 1,0%' };
  return { valor: base * 0.005, rate: 0.5, faixa: 'Até R$ 45.000 → 0,5%' };
}

function getParcela(month: number, year: number): number {
  if (year > 2026) return 0;
  if (year === 2026 && month >= 8) return 0;
  return PARCELA_VALOR;
}

// Base de produção = base_calculo_valor diretamente (disparos=contagem, horas/fixo=R$)
function getProductionValue(loc: Locacao): number {
  return loc.base_calculo_valor;
}

function getNfStatus(l: Locacao): string {
  return l.nf_status ?? (l.nf_emitida ? 'emitida' : 'pendente');
}

function fmtR(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  return iso.split('-').reverse().join('/');
}

function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = '﻿' + rows.map(r => r.map(v => `"${v}"`).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

export default function Fechamento({ locacoes }: FechamentoProps) {
  const today = new Date();
  const [tab, setTab] = useState<Tab>('alessandro');
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const yearStr = String(selectedYear);
  const monthStr = String(selectedMonth).padStart(2, '0');

  const periodLocs = locacoes.filter(l => {
    if (l.status !== 'concluido') return false;
    return l.data.startsWith(`${yearStr}-${monthStr}-`);
  });

  const periodLabel = `${MONTH_NAMES[selectedMonth - 1]}/${selectedYear}`;

  // ─── Edição manual Alessandro ─────────────────────────────────────────────
  const [alexEditMode, setAlexEditMode] = useState(false);
  const [alexDraft, setAlexDraft] = useState<Record<string, number>>({});
  const [alexManualApplied, setAlexManualApplied] = useState(false);
  const [alexManualSaved, setAlexManualSaved] = useState<Record<string, number>>({});

  // ─── Edição manual Luíza ──────────────────────────────────────────────────
  const [luizaEditMode, setLuizaEditMode] = useState(false);
  const [luizaDraft, setLuizaDraft] = useState<Record<string, number>>({});
  const [luizaManualApplied, setLuizaManualApplied] = useState(false);
  const [luizaManualSaved, setLuizaManualSaved] = useState<Record<string, number>>({});

  // Limpa edição manual ao trocar período
  useEffect(() => {
    setAlexEditMode(false); setAlexManualApplied(false);
    setAlexDraft({}); setAlexManualSaved({});
    setLuizaEditMode(false); setLuizaManualApplied(false);
    setLuizaDraft({}); setLuizaManualSaved({});
  }, [selectedMonth, selectedYear]);

  // ─── Alessandro ───────────────────────────────────────────────────────────
  const alexLocs = periodLocs.filter(l => ALEX_ALL.includes(l.equipamento));

  const alexEquipData = ALEX_ALL.map(eq => {
    const locs = alexLocs.filter(l => l.equipamento === eq);
    const valorProdAuto = locs.reduce((s, l) => s + getProductionValue(l), 0);
    const label = ALEX_DISPAROS.includes(eq) ? 'Disparos (contagem)' : 'Valor hora/base (R$)';
    return { eq, locs, qtd: locs.length, valorProdAuto, label };
  });

  // Valores efetivos: manual se aplicado, senão automático
  const alexEquipEff = alexEquipData.map(d => ({
    ...d,
    valorProd: alexManualApplied && alexManualSaved[d.eq] !== undefined
      ? alexManualSaved[d.eq]
      : d.valorProdAuto,
  }));

  const alexSubtotal = alexEquipEff.reduce((s, d) => s + d.valorProd, 0);
  const { valor: alexComissao, rate: alexRate, faixa: alexFaixa } = calcComissao(alexSubtotal);
  const alexParcela = getParcela(selectedMonth, selectedYear);
  const alexLiquido = alexComissao + SALARIO_FIXO - ADIANTAMENTO - alexParcela;

  // ─── Luíza ────────────────────────────────────────────────────────────────
  const luizaEquipDataAuto = ALL_EQUIPMENT.map(eq => {
    const locs = periodLocs.filter(l => l.equipamento === eq);
    return { eq, qtd: locs.length, receitaAuto: locs.reduce((s, l) => s + l.valor_final, 0) };
  });

  const luizaEquipEff = luizaEquipDataAuto.map(d => ({
    ...d,
    receita: luizaManualApplied && luizaManualSaved[d.eq] !== undefined
      ? luizaManualSaved[d.eq]
      : d.receitaAuto,
  }));

  const luizaTotal = luizaManualApplied
    ? luizaEquipEff.reduce((s, d) => s + d.receita, 0)
    : periodLocs.reduce((s, l) => s + l.valor_final, 0);
  const ticketMedio = periodLocs.length > 0
    ? (luizaManualApplied ? luizaTotal : periodLocs.reduce((s, l) => s + l.valor_final, 0)) / periodLocs.length
    : 0;

  // ─── Debug log ────────────────────────────────────────────────────────────
  useEffect(() => {
    console.group(`[Fechamento] ${periodLabel} — ${periodLocs.length} locações concluídas`);
    console.log('Todas as locações do período:', periodLocs.map(l => ({
      data: l.data, cliente: l.cliente, equipamento: l.equipamento,
      base_tipo: l.base_calculo_tipo, base_valor: l.base_calculo_valor, valor_final: l.valor_final,
    })));
    console.group('Alessandro — base por equipamento');
    alexEquipData.forEach(d => {
      console.log(`${d.eq}: ${d.qtd} loc(s) → base_calculo_valor soma = ${d.valorProdAuto}`,
        d.locs.map(l => ({ base_valor: l.base_calculo_valor, tipo: l.base_calculo_tipo })));
    });
    console.log('Subtotal base Alessandro:', alexSubtotal);
    console.groupEnd();
    console.log('Luíza — total valor_final:', periodLocs.reduce((s, l) => s + l.valor_final, 0));
    console.groupEnd();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodLocs.length, selectedMonth, selectedYear]);

  const cityGroup: Record<string, number> = {};
  periodLocs.forEach(l => {
    if (l.cidade) cityGroup[l.cidade] = (cityGroup[l.cidade] || 0) + l.valor_final;
  });
  const cityRanking = Object.entries(cityGroup)
    .map(([city, val]) => ({ city, val }))
    .sort((a, b) => b.val - a.val);

  const nfPendentes = periodLocs.filter(l => getNfStatus(l) === 'pendente').length;
  const nfNaoRequer = periodLocs.filter(l => getNfStatus(l) === 'nao_requer').length;
  const nfEmitidas = periodLocs.filter(l => getNfStatus(l) === 'emitida').length;

  // ─── Exports ──────────────────────────────────────────────────────────────
  const exportAlexCSV = () => {
    const rows: (string | number)[][] = [
      ['Data','Cliente','Equipamento','Cidade','Base Tipo','Base Valor','Valor Produção','Valor Final']
    ];
    alexLocs.forEach(l => rows.push([
      fmtDate(l.data), l.cliente, l.equipamento, l.cidade || '',
      l.base_calculo_tipo, l.base_calculo_valor,
      getProductionValue(l).toFixed(2), l.valor_final
    ]));
    alexEquipEff.forEach(d => d.qtd > 0 && rows.push(['', '', d.eq, '', '', 'Base produção', d.valorProd, '']));
    rows.push(['', '', '', '', '', 'SUBTOTAL PRODUÇÃO', alexSubtotal.toFixed(2), '']);
    rows.push(['', '', '', '', '', `Comissão ${alexRate}%`, alexComissao.toFixed(2), '']);
    rows.push(['', '', '', '', '', 'Salário Fixo', SALARIO_FIXO, '']);
    rows.push(['', '', '', '', '', 'Adiantamento (-)', ADIANTAMENTO, '']);
    rows.push(['', '', '', '', '', `Parcela (-)`, alexParcela, '']);
    rows.push(['', '', '', '', '', 'LÍQUIDO', alexLiquido.toFixed(2), '']);
    if (alexManualApplied) rows.push(['', '', '', '', '', '* Valores editados manualmente', '', '']);
    downloadCSV(rows, `Fechamento_Alessandro_${yearStr}-${monthStr}.csv`);
  };

  const exportAlexPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFillColor(122, 28, 46);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.text('Sinnergie Aesthetic Technologies', 14, 11);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Fechamento Alessandro — ${periodLabel}`, 14, 19);

    let y = 36;
    doc.setTextColor(30, 30, 30);

    // Bloco 1 — Produção
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('1. Produção por Equipamento', 14, y); y += 7;
    const col1 = [68, 38, 20, 46];
    const h1 = ['Equipamento', 'Base de Cálculo', 'Locações', 'Valor Produção'];
    doc.setFontSize(8);
    doc.setFillColor(240, 240, 240);
    doc.rect(12, y - 4, col1.reduce((a,b)=>a+b,0), 7, 'F');
    let x = 14;
    h1.forEach((h, i) => { doc.text(h, x, y); x += col1[i]; });
    y += 6;
    doc.setFont('helvetica', 'normal');
    alexEquipEff.forEach(d => {
      if (d.qtd === 0) return;
      x = 14;
      [d.eq, d.label, String(d.qtd), fmtR(d.valorProd)].forEach((v, i) => { doc.text(v, x, y); x += col1[i]; });
      y += 5.5;
    });
    if (alexManualApplied) { doc.setFontSize(7); doc.setTextColor(180,80,0); doc.text('* Valores editados manualmente', 14, y); doc.setTextColor(30,30,30); y += 4; }
    y += 2;
    doc.setFont('helvetica', 'bold');
    x = 14 + col1[0] + col1[1] + col1[2];
    doc.text('SUBTOTAL: ' + fmtR(alexSubtotal), x, y); y += 10;

    // Bloco 2 — Comissão
    doc.setFontSize(11); doc.text('2. Cálculo da Comissão', 14, y); y += 7;
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Base de produção: ${fmtR(alexSubtotal)}`, 18, y); y += 5;
    doc.text(`Faixa atingida: ${alexFaixa}`, 18, y); y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Comissão gerada: ${fmtR(alexComissao)}`, 18, y); y += 10;

    // Bloco 3 — Fechamento Final
    doc.setFontSize(11); doc.text('3. Fechamento Final', 14, y); y += 7;
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    const items = [
      [`Comissão (${alexRate}%):`, `+ ${fmtR(alexComissao)}`],
      ['Salário fixo:', `+ ${fmtR(SALARIO_FIXO)}`],
      ['Adiantamento:', `- ${fmtR(ADIANTAMENTO)}`],
      [`Parcela${alexParcela === 0 ? ' (quitada)' : ':'}`, `- ${fmtR(alexParcela)}`],
    ];
    items.forEach(([label, val]) => {
      doc.text(label, 18, y);
      doc.text(val, 100, y);
      y += 5;
    });
    y += 3;
    doc.setFillColor(122, 28, 46);
    doc.rect(12, y - 4, 186, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('VALOR LÍQUIDO A RECEBER:', 18, y + 2);
    doc.text(fmtR(alexLiquido), 150, y + 2);
    y += 18;

    // Bloco 4 — Locações
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(11); doc.text('4. Locações Consideradas', 14, y); y += 7;
    const col4 = [20, 55, 38, 30, 29];
    const h4 = ['Data', 'Cliente', 'Equipamento', 'Prod. (R$)', 'Final (R$)'];
    doc.setFontSize(7);
    doc.setFillColor(240, 240, 240);
    doc.rect(12, y - 4, col4.reduce((a,b)=>a+b,0), 6, 'F');
    x = 14;
    h4.forEach((h, i) => { doc.text(h, x, y); x += col4[i]; });
    y += 5;
    doc.setFont('helvetica', 'normal');
    alexLocs.forEach(l => {
      if (y > 272) { doc.addPage(); y = 20; }
      x = 14;
      [fmtDate(l.data), l.cliente.slice(0, 30), l.equipamento, fmtR(getProductionValue(l)), fmtR(l.valor_final)]
        .forEach((v, i) => { doc.text(String(v), x, y); x += col4[i]; });
      y += 5;
    });

    doc.save(`Fechamento_Alessandro_${yearStr}-${monthStr}.pdf`);
  };

  const exportLuizaCSV = () => {
    const rows: (string | number)[][] = [
      ['Data','Cliente','Equipamento','Cidade','DRA','Valor Final','Status NF']
    ];
    periodLocs.forEach(l => rows.push([
      fmtDate(l.data), l.cliente, l.equipamento, l.cidade || '',
      l.dra || '', l.valor_final, getNfStatus(l)
    ]));
    rows.push(['', '', '', '', '', 'TOTAL', luizaTotal.toFixed(2)]);
    if (luizaManualApplied) rows.push(['', '', '', '', '', '* Valores editados manualmente', '']);
    downloadCSV(rows, `Fechamento_Luiza_${yearStr}-${monthStr}.csv`);
  };

  const exportLuizaPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFillColor(122, 28, 46);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15); doc.setFont('helvetica', 'bold');
    doc.text('Sinnergie Aesthetic Technologies', 14, 11);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Fechamento Luíza — ${periodLabel}`, 14, 19);

    let y = 36;
    doc.setTextColor(30, 30, 30);

    // KPIs
    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(`Receita Total: ${fmtR(luizaTotal)}`, 14, y);
    doc.text(`Locações: ${periodLocs.length}`, 90, y);
    doc.text(`Ticket Médio: ${fmtR(ticketMedio)}`, 140, y);
    y += 12;
    if (luizaManualApplied) { doc.setFontSize(7); doc.setTextColor(180,80,0); doc.text('Atenção: valores editados manualmente neste relatório', 14, y); doc.setTextColor(30,30,30); y += 5; }

    // Equipamentos
    doc.setFontSize(11); doc.text('1. Receita por Equipamento', 14, y); y += 7;
    const col1 = [80, 28, 54];
    doc.setFontSize(8);
    doc.setFillColor(240, 240, 240);
    doc.rect(12, y - 4, col1.reduce((a,b)=>a+b,0), 7, 'F');
    let x = 14;
    ['Equipamento', 'Locações', 'Receita'].forEach((h, i) => { doc.text(h, x, y); x += col1[i]; });
    y += 6;
    doc.setFont('helvetica', 'normal');
    luizaEquipEff.forEach(d => {
      x = 14;
      [d.eq, String(d.qtd), fmtR(d.receita)].forEach((v, i) => { doc.text(v, x, y); x += col1[i]; });
      y += 5.5;
    });
    if (luizaManualApplied) { doc.setFontSize(7); doc.setTextColor(180,80,0); doc.text('* Valores editados manualmente', 14, y); doc.setTextColor(30,30,30); y += 4; }
    y += 8;

    // Cidades
    if (cityRanking.length > 0) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text('2. Ranking por Cidade', 14, y); y += 7;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      cityRanking.slice(0, 10).forEach((c, i) => {
        doc.text(`${i + 1}. ${c.city}`, 18, y);
        doc.text(fmtR(c.val), 120, y);
        y += 5;
      });
      y += 8;
    }

    // Locações
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('3. Locações Concluídas', 14, y); y += 7;
    const col3 = [20, 48, 35, 25, 29, 18];
    const h3 = ['Data', 'Cliente', 'Equipamento', 'Cidade', 'Valor Final', 'NF'];
    doc.setFontSize(7);
    doc.setFillColor(240, 240, 240);
    doc.rect(12, y - 4, col3.reduce((a,b)=>a+b,0), 6, 'F');
    x = 14;
    h3.forEach((h, i) => { doc.text(h, x, y); x += col3[i]; });
    y += 5;
    doc.setFont('helvetica', 'normal');
    periodLocs.forEach(l => {
      if (y > 272) { doc.addPage(); y = 20; }
      x = 14;
      const nf = getNfStatus(l);
      const nfLabel = nf === 'emitida' ? 'Emitida' : nf === 'nao_requer' ? 'N/A' : 'Pendente';
      [fmtDate(l.data), l.cliente.slice(0, 26), l.equipamento, l.cidade || '', fmtR(l.valor_final), nfLabel]
        .forEach((v, i) => { doc.text(String(v), x, y); x += col3[i]; });
      y += 5;
    });

    doc.save(`Fechamento_Luiza_${yearStr}-${monthStr}.pdf`);
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  const bordeaux = '#7a1c2e';
  const gold = '#c9a84c';

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calculator className="w-6 h-6" style={{ color: bordeaux }} />
            Fechamento Financeiro
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Comissões e receita por período</p>
        </div>

        {/* Filtros de período */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2"
            style={{ outline: 'none' }}
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: '#f3e6e9' }}>
        {(['alessandro', 'luiza'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={tab === t
              ? { backgroundColor: bordeaux, color: '#fff' }
              : { color: bordeaux, background: 'transparent' }
            }
          >
            {t === 'alessandro' ? '💼 Alessandro' : '👩‍💼 Luíza'}
          </button>
        ))}
      </div>

      {/* ── TAB ALESSANDRO ── */}
      {tab === 'alessandro' && (
        <div className="space-y-5">

          {/* Bloco 1 — Tabela de Produção */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: bordeaux }} />
                Produção por Equipamento — {periodLabel}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{alexLocs.length} locações</span>
                {!alexEditMode && !alexManualApplied && (
                  <button
                    onClick={() => {
                      const draft: Record<string, number> = {};
                      alexEquipEff.forEach(d => { draft[d.eq] = d.valorProd; });
                      setAlexDraft(draft);
                      setAlexEditMode(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    ✏️ Editar valores
                  </button>
                )}
                {alexManualApplied && !alexEditMode && (
                  <>
                    <button
                      onClick={() => { setAlexDraft({ ...alexManualSaved }); setAlexEditMode(true); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                    >✏️ Reeditar</button>
                    <button
                      onClick={() => { setAlexManualApplied(false); setAlexManualSaved({}); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >↺ Restaurar</button>
                  </>
                )}
                {alexEditMode && (
                  <>
                    <button
                      onClick={() => { setAlexManualSaved({ ...alexDraft }); setAlexManualApplied(true); setAlexEditMode(false); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-white transition-colors"
                      style={{ backgroundColor: bordeaux }}
                    >✓ Aplicar</button>
                    <button
                      onClick={() => { setAlexEditMode(false); setAlexDraft({}); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >✕ Cancelar</button>
                  </>
                )}
              </div>
            </div>

            {alexManualApplied && (
              <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 font-medium flex items-center gap-1.5">
                ⚠️ Valores editados manualmente — cálculo pode diferir dos dados do sistema
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipamento</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Campo lido</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Locações</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor Produção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {alexEquipEff.map(d => (
                    <tr key={d.eq} className={d.qtd === 0 ? 'opacity-35' : ''}>
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-white">{d.eq}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{d.label}</td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{d.qtd}</td>
                      <td className="px-5 py-2 text-right">
                        {alexEditMode ? (
                          <input
                            type="number"
                            value={alexDraft[d.eq] ?? d.valorProd}
                            onChange={e => setAlexDraft(prev => ({ ...prev, [d.eq]: Number(e.target.value) }))}
                            className="w-32 text-right border rounded px-2 py-1 text-sm font-semibold focus:outline-none"
                            style={{ borderColor: bordeaux }}
                          />
                        ) : (
                          <span className="font-semibold" style={{ color: d.qtd > 0 ? bordeaux : undefined }}>
                            {fmtR(d.valorProd)}
                            {alexManualApplied && alexManualSaved[d.eq] !== undefined && alexManualSaved[d.eq] !== d.valorProdAuto && (
                              <span className="text-[10px] text-amber-600 block">auto: {fmtR(d.valorProdAuto)}</span>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2" style={{ borderColor: bordeaux }}>
                    <td colSpan={3} className="px-5 py-3 font-bold text-gray-800 dark:text-white">SUBTOTAL</td>
                    <td className="px-5 py-3 text-right text-lg font-bold" style={{ color: bordeaux }}>
                      {alexEditMode
                        ? fmtR(Object.values(alexDraft).reduce((s, v) => s + v, 0))
                        : fmtR(alexSubtotal)
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloco 2 — Cálculo da Comissão */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4" style={{ color: bordeaux }} />
              Cálculo da Comissão
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg p-4 border" style={{ borderColor: '#e8c8d0', backgroundColor: '#fdf5f6' }}>
                <p className="text-xs text-gray-500 mb-1">Base de Produção</p>
                <p className="text-xl font-bold" style={{ color: bordeaux }}>{fmtR(alexSubtotal)}</p>
              </div>
              <div className="rounded-lg p-4 border" style={{ borderColor: '#e8c8d0', backgroundColor: '#fdf5f6' }}>
                <p className="text-xs text-gray-500 mb-1">Faixa Atingida</p>
                <p className="text-lg font-bold" style={{ color: gold }}>{alexRate}%</p>
                <p className="text-xs text-gray-400 mt-0.5">{alexFaixa}</p>
              </div>
              <div className="rounded-lg p-4 border-2" style={{ borderColor: bordeaux, backgroundColor: '#fdf5f6' }}>
                <p className="text-xs text-gray-500 mb-1">Comissão Gerada</p>
                <p className="text-xl font-bold" style={{ color: bordeaux }}>{fmtR(alexComissao)}</p>
              </div>
            </div>

            {/* Tabela de faixas */}
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <p className="font-semibold text-gray-500 mb-1">Tabela de Faixas:</p>
              {[
                ['> R$ 100.000', '2,5%'],
                ['> R$ 75.000', '2,0%'],
                ['> R$ 50.000', '1,5%'],
                ['> R$ 45.000', '1,0%'],
                ['≤ R$ 45.000', '0,5%'],
              ].map(([faixa, pct]) => (
                <div key={faixa} className="flex gap-2">
                  <span className="w-28">{faixa}</span>
                  <span className="font-medium">{pct}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bloco 3 — Fechamento Final */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4" style={{ color: bordeaux }} />
              Fechamento Final
            </h2>
            <div className="space-y-2 text-sm max-w-sm">
              {[
                { label: `Comissão (${alexRate}%)`, val: alexComissao, sinal: '+', color: 'text-green-600' },
                { label: 'Salário Fixo', val: SALARIO_FIXO, sinal: '+', color: 'text-green-600' },
                { label: 'Adiantamento', val: ADIANTAMENTO, sinal: '−', color: 'text-red-500' },
                { label: alexParcela === 0 ? 'Parcela (quitada)' : 'Parcela', val: alexParcela, sinal: '−', color: 'text-red-500' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">{row.label}</span>
                  <span className={`font-semibold ${row.color}`}>{row.sinal} {fmtR(row.val)}</span>
                </div>
              ))}
            </div>
            <div
              className="mt-4 rounded-xl p-4 flex justify-between items-center"
              style={{ backgroundColor: bordeaux }}
            >
              <span className="text-white font-bold text-base">VALOR LÍQUIDO A RECEBER</span>
              <span className="text-white font-bold text-xl">{fmtR(alexLiquido)}</span>
            </div>
          </div>

          {/* Bloco 4 — Lista de Locações + exports */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <List className="w-4 h-4" style={{ color: bordeaux }} />
                Locações Consideradas
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={exportAlexCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: gold }}
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  onClick={exportAlexPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: bordeaux }}
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>
            {alexLocs.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                Nenhuma locação concluída com equipamentos elegíveis em {periodLabel}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Data</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Cliente</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Equipamento</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Prod. (R$)</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Final (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {alexLocs.map(l => (
                      <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{fmtDate(l.data)}</td>
                        <td className="px-4 py-2.5 text-gray-800 dark:text-white font-medium">{l.cliente}</td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{l.equipamento}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">{fmtR(getProductionValue(l))}</td>
                        <td className="px-4 py-2.5 text-right font-semibold" style={{ color: bordeaux }}>{fmtR(l.valor_final)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB LUÍZA ── */}
      {tab === 'luiza' && (
        <div className="space-y-5">

          {/* Bloco 1 — KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Receita Total', value: fmtR(luizaTotal), icon: DollarSign },
              { label: 'Locações', value: String(periodLocs.length), icon: List },
              { label: 'Ticket Médio', value: fmtR(ticketMedio), icon: TrendingUp },
              { label: 'NF Pendentes', value: String(nfPendentes), icon: FileText },
            ].map(kpi => (
              <div
                key={kpi.label}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className="w-4 h-4" style={{ color: bordeaux }} />
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                </div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Sub-linha NF */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">✅ Emitidas: {nfEmitidas}</span>
            <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">⏳ Pendentes: {nfPendentes}</span>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">🚫 Não requer: {nfNaoRequer}</span>
          </div>

          {/* Bloco 2 — Por Equipamento */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: bordeaux }} />
                Receita por Equipamento — {periodLabel}
              </h2>
              <div className="flex items-center gap-2">
                {!luizaEditMode && !luizaManualApplied && (
                  <button
                    onClick={() => {
                      const draft: Record<string, number> = {};
                      luizaEquipEff.forEach(d => { draft[d.eq] = d.receita; });
                      setLuizaDraft(draft);
                      setLuizaEditMode(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >✏️ Editar valores</button>
                )}
                {luizaManualApplied && !luizaEditMode && (
                  <>
                    <button
                      onClick={() => { setLuizaDraft({ ...luizaManualSaved }); setLuizaEditMode(true); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
                    >✏️ Reeditar</button>
                    <button
                      onClick={() => { setLuizaManualApplied(false); setLuizaManualSaved({}); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >↺ Restaurar</button>
                  </>
                )}
                {luizaEditMode && (
                  <>
                    <button
                      onClick={() => { setLuizaManualSaved({ ...luizaDraft }); setLuizaManualApplied(true); setLuizaEditMode(false); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-white transition-colors"
                      style={{ backgroundColor: bordeaux }}
                    >✓ Aplicar</button>
                    <button
                      onClick={() => { setLuizaEditMode(false); setLuizaDraft({}); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                    >✕ Cancelar</button>
                  </>
                )}
              </div>
            </div>

            {luizaManualApplied && (
              <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 font-medium flex items-center gap-1.5">
                ⚠️ Valores editados manualmente — cálculo pode diferir dos dados do sistema
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">Equipamento</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Locações</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">Receita</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">% Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {luizaEquipEff.map(d => (
                    <tr key={d.eq} className={d.qtd === 0 ? 'opacity-35' : ''}>
                      <td className="px-5 py-3 font-medium text-gray-800 dark:text-white">{d.eq}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{d.qtd}</td>
                      <td className="px-5 py-2 text-right">
                        {luizaEditMode ? (
                          <input
                            type="number"
                            value={luizaDraft[d.eq] ?? d.receita}
                            onChange={e => setLuizaDraft(prev => ({ ...prev, [d.eq]: Number(e.target.value) }))}
                            className="w-32 text-right border rounded px-2 py-1 text-sm font-semibold focus:outline-none"
                            style={{ borderColor: bordeaux }}
                          />
                        ) : (
                          <span className="font-semibold" style={{ color: d.qtd > 0 ? bordeaux : undefined }}>
                            {fmtR(d.receita)}
                            {luizaManualApplied && luizaManualSaved[d.eq] !== undefined && luizaManualSaved[d.eq] !== d.receitaAuto && (
                              <span className="text-[10px] text-amber-600 block">auto: {fmtR(d.receitaAuto)}</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500 text-xs">
                        {luizaTotal > 0 ? ((d.receita / luizaTotal) * 100).toFixed(1) + '%' : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2" style={{ borderColor: bordeaux }}>
                    <td colSpan={2} className="px-5 py-3 font-bold text-gray-800 dark:text-white">TOTAL</td>
                    <td className="px-5 py-3 text-right text-lg font-bold" style={{ color: bordeaux }}>
                      {luizaEditMode
                        ? fmtR(Object.values(luizaDraft).reduce((s, v) => s + v, 0))
                        : fmtR(luizaTotal)
                      }
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500 text-xs">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloco 3 — Ranking por Cidade */}
          {cityRanking.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: bordeaux }} />
                  Ranking por Cidade
                </h2>
              </div>
              <div className="p-5 space-y-2">
                {cityRanking.map((c, i) => (
                  <div key={c.city} className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: i === 0 ? gold : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : bordeaux }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.city}</span>
                      <span className="text-sm font-bold" style={{ color: bordeaux }}>{fmtR(c.val)}</span>
                    </div>
                    <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(c.val / cityRanking[0].val) * 100}%`, backgroundColor: bordeaux }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bloco 4 — Lista Completa + exports */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <List className="w-4 h-4" style={{ color: bordeaux }} />
                Locações Concluídas ({periodLocs.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={exportLuizaCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: gold }}
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  onClick={exportLuizaPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: bordeaux }}
                >
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>
            {periodLocs.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                Nenhuma locação concluída em {periodLabel}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Data</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Cliente</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Equipamento</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Cidade</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Valor Final</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">NF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {periodLocs.map(l => {
                      const nf = getNfStatus(l);
                      return (
                        <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 text-xs">{fmtDate(l.data)}</td>
                          <td className="px-4 py-2.5 text-gray-800 dark:text-white font-medium">{l.cliente}</td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{l.equipamento}</td>
                          <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{l.cidade || '—'}</td>
                          <td className="px-4 py-2.5 text-right font-semibold" style={{ color: bordeaux }}>{fmtR(l.valor_final)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              nf === 'emitida' ? 'bg-green-100 text-green-700' :
                              nf === 'nao_requer' ? 'bg-gray-100 text-gray-500' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {nf === 'emitida' ? 'Emitida' : nf === 'nao_requer' ? 'N/A' : 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
