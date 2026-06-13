import React, { useState, useEffect } from 'react';
import { Locacao } from '../types';
import { Search, Plus, Trash2, Calendar, FileText, Check, X, ShieldAlert, Upload, Download, ArrowRight, HelpCircle } from 'lucide-react';

interface LocacoesProps {
  locacoes: Locacao[];
  onSave: (locacao: Partial<Locacao>) => Promise<Locacao>;
  onDelete: (id: string) => Promise<boolean>;
  onBulkImport: (locacoes: Partial<Locacao>[]) => Promise<Locacao[]>;
}

export default function Locacoes({ locacoes, onSave, onDelete, onBulkImport }: LocacoesProps) {
  const [search, setSearch] = useState('');
  const [selectedEq, setSelectedEq] = useState('Todos');
  const [selectedCity, setSelectedCity] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  const [selectedYear, setSelectedYear] = useState('2026');

  // Modal control states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Locacao | null>(null);
  const [editingLocacao, setEditingLocacao] = useState<Locacao | null>(null);

  // Form Field States
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [horario, setHorario] = useState('09:00');
  const [cliente, setCliente] = useState('');
  const [dra, setDra] = useState('');
  const [equipamento, setEquipamento] = useState('Ultraformer III');
  const [cidade, setCidade] = useState('');
  const [baseTipo, setBaseTipo] = useState<'disparos' | 'horas' | 'valor_fixo'>('disparos');
  const [baseValor, setBaseValor] = useState<number>(1200);
  const [maoDeObra, setMaoDeObra] = useState<number>(0);
  const [deslocamento, setDeslocamento] = useState<number>(150);
  const [valorLocacao, setValorLocacao] = useState<number>(0);
  const [valorFinal, setValorFinal] = useState<number>(1350);
  const [nfEmitida, setNfEmitida] = useState(false);
  const [locacaoStatus, setLocacaoStatus] = useState<'agendado' | 'concluido' | 'cancelado'>('agendado');
  const [observacoes, setObservacoes] = useState('');

  // Toast dynamic notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Auto-calculation logic of Valor Final
  useEffect(() => {
    let baseComp = Number(baseValor) || 0;
    
    // Customize base calculation depending on equipment
    if (baseTipo === 'disparos') {
      // e.g. R$ 1.10 per shot for Ultraformer
      baseComp = (Number(baseValor) || 0) * 1.15;
    }

    const calculated = baseComp + (Number(maoDeObra) || 0) + (Number(deslocamento) || 0) + (Number(valorLocacao) || 0);
    setValorFinal(Math.round(calculated));
  }, [baseTipo, baseValor, maoDeObra, deslocamento, valorLocacao]);

  // Handle Equipment changes to adjust defaults matching raw mock
  const handleEqChange = (eq: string) => {
    setEquipamento(eq);
    if (eq === 'Ultraformer III' || eq === 'Ultraformer MPT') {
      setBaseTipo('disparos');
      setBaseValor(1200);
    } else if (eq === 'Endolaser' || eq === 'CO2 Fracionado') {
      setBaseTipo('horas');
      setBaseValor(600); // base price equivalent
    } else {
      setBaseTipo('valor_fixo');
      setBaseValor(800);
    }
  };

  const openEdit = (loc: Locacao) => {
    setEditingLocacao(loc);
    setData(loc.data);
    setHorario(loc.horario);
    setCliente(loc.cliente);
    setDra(loc.dra || '');
    setEquipamento(loc.equipamento);
    setCidade(loc.cidade || '');
    setBaseTipo(loc.base_calculo_tipo);
    setBaseValor(loc.base_calculo_valor);
    setMaoDeObra(loc.mao_de_obra);
    setDeslocamento(loc.deslocamento);
    setValorLocacao(loc.valor_locacao);
    setNfEmitida(loc.nf_emitida);
    setLocacaoStatus(loc.status);
    setObservacoes(loc.observacoes || '');
    setIsCreateOpen(true);
  };

  const resetForm = () => {
    setEditingLocacao(null);
    setCliente(''); setDra(''); setCidade('');
    setMaoDeObra(0); setDeslocamento(150); setValorLocacao(0);
    setNfEmitida(false); setObservacoes('');
    setData(new Date().toISOString().split('T')[0]);
    setHorario('09:00');
    setEquipamento('Ultraformer III');
    setBaseTipo('disparos'); setBaseValor(1200);
    setLocacaoStatus('agendado');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim() || !equipamento) return;

    await onSave({
      ...(editingLocacao ? { id: editingLocacao.id } : {}),
      data, horario, cliente, dra, equipamento, cidade,
      base_calculo_tipo: baseTipo,
      base_calculo_valor: Number(baseValor),
      mao_de_obra: Number(maoDeObra),
      deslocamento: Number(deslocamento),
      valor_locacao: Number(valorLocacao),
      valor_final: valorFinal,
      nf_emitida: nfEmitida,
      status: locacaoStatus,
      observacoes
    });

    setIsCreateOpen(false);
    showToast(editingLocacao ? `Locação de ${cliente} atualizada!` : `Locação de ${cliente} registrada com sucesso!`);
    resetForm();
  };

  const toggleNfEmitida = async (rental: Locacao) => {
    await onSave({
      ...rental,
      nf_emitida: !rental.nf_emitida
    });
    showToast(`Status da NF de ${rental.cliente} alterado!`);
  };

  const handleStatusChange = async (rental: Locacao, nextStatus: Locacao['status']) => {
    await onSave({
      ...rental,
      status: nextStatus
    });
    showToast(`Status da locação de ${rental.cliente} alterado para ${nextStatus}!`);
  };

  const handleDeleteClick = (rental: Locacao) => {
    setDeleteTarget(rental);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const ok = await onDelete(deleteTarget.id);
    if (ok) {
      showToast(`Locação de "${deleteTarget.cliente}" excluída com sucesso!`);
    } else {
      showToast('Ocorreu um erro ao tentar excluir a locação.');
    }
    setDeleteTarget(null);
  };

  // CSV real parser engine
  const parseCSV = (csvText: string): Partial<Locacao>[] => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const header = lines[0];
    const separator = header.includes(';') ? ';' : ',';
    const headers = header.split(separator).map(h => h.trim().replace(/^\uFEFF/, '').toLowerCase());

    const result: Partial<Locacao>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(separator).map(v => v.trim());
      const row: any = {};

      headers.forEach((h, index) => {
        let val = values[index] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        row[h] = val;
      });

      const dataVal = row.data || row.diana || row.data_da_diaria || '';
      const horarioVal = row.horario || row.hora || '09:00';
      const clienteVal = row.cliente || row.clinica || row.clinica_contratante || '';
      const draVal = row.dra || row.medico || row.doutor || '';
      const equipamentoVal = row.equipamento || row.maquinario || 'Ultraformer III';
      const cidadeVal = row.cidade || row.entrega_cidade || '';
      
      const baseTipoVal = row.base_calculo_tipo || (equipamentoVal.includes('Ultraformer') ? 'disparos' : 'horas');
      const baseValorVal = Number(row.base_calculo_valor || row.base_valor || (baseTipoVal === 'disparos' ? '1200' : '650')) || 0;
      const maoDeObraVal = Number(row.mao_de_obra || row.tecnico || 0) || 0;
      const deslocamentoVal = Number(row.deslocamento || row.frete || 0) || 0;
      const valorLocacaoVal = Number(row.valor_locacao || row.acessorios || row.outros || 0) || 0;
      
      let valorFinalVal = Number(row.valor_final || 0);
      if (!valorFinalVal) {
        const baseComp = baseTipoVal === 'disparos' ? baseValorVal * 1.15 : baseValorVal;
        valorFinalVal = baseComp + maoDeObraVal + deslocamentoVal + valorLocacaoVal;
      }
      
      const nfEmitidaVal = String(row.nf_emitida || '').toLowerCase();
      const isNfEmitida = nfEmitidaVal === 'sim' || nfEmitidaVal === 'true' || nfEmitidaVal === 's' || nfEmitidaVal === '1';
      
      let statusVal = String(row.status || 'agendado').toLowerCase();
      if (statusVal.includes('concl')) statusVal = 'concluido';
      if (statusVal.includes('canc')) statusVal = 'cancelado';
      if (!['agendado', 'concluido', 'cancelado'].includes(statusVal)) {
        statusVal = 'agendado';
      }

      const obsVal = row.observacoes || row.obs || '';

      let formattedDate = dataVal;
      if (dataVal.includes('/')) {
        const parts = dataVal.split('/');
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
          formattedDate = `${year}-${month}-${day}`;
        }
      }

      if (clienteVal) {
        result.push({
          data: formattedDate || new Date().toISOString().split('T')[0],
          horario: horarioVal,
          cliente: clienteVal,
          dra: draVal,
          equipamento: equipamentoVal,
          cidade: cidadeVal,
          base_calculo_tipo: baseTipoVal as 'disparos' | 'horas' | 'valor_fixo',
          base_calculo_valor: baseValorVal,
          mao_de_obra: maoDeObraVal,
          deslocamento: deslocamentoVal,
          valor_locacao: valorLocacaoVal,
          valor_final: Math.round(valorFinalVal),
          nf_emitida: isNfEmitida,
          status: statusVal as 'agendado' | 'concluido' | 'cancelado',
          observacoes: obsVal
        });
      }
    }

    return result;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          showToast('Nenhuma linha de clínica válida encontrada no CSV.');
          return;
        }
        await onBulkImport(parsed);
        setIsImportOpen(false);
        showToast(`${parsed.length} locações importadas com sucesso via planilha!`);
      } catch (err) {
        console.error(err);
        showToast('Falha ao processar planilha CSV.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // Seed data simulation (clean user request option)
  const handleCsvSimulation = async () => {
    const sampleRows: Partial<Locacao>[] = [
      { data: '2026-06-18', horario: '10:00', cliente: 'Clínica Dermos Exemplo', dra: 'Dra. Luana Rocha', equipamento: 'Ultraformer MPT', cidade: 'Maringá', base_calculo_tipo: 'disparos', base_calculo_valor: 1000, mao_de_obra: 0, deslocamento: 150, valor_final: 1300, nf_emitida: false, status: 'agendado', observacoes: 'Exemplo simulado de importação' },
      { data: '2026-06-19', horario: '14:00', cliente: 'Estética Slim Exemplo', dra: 'Dra. Giele', equipamento: 'CO2 Fracionado', cidade: 'Londrina', base_calculo_tipo: 'horas', base_calculo_valor: 500, mao_de_obra: 0, deslocamento: 150, valor_final: 650, nf_emitida: true, status: 'agendado', observacoes: 'Exemplo simulado de importação' },
    ];

    await onBulkImport(sampleRows);
    setIsImportOpen(false);
    showToast('2 locações de demonstração importadas para fins de teste!');
  };

  const handleDownloadTemplate = () => {
    const csvContent = "\uFEFF" + [
      "Data;Horario;Cliente;Dra;Equipamento;Cidade;Base_Calculo_Tipo;Base_Calculo_Valor;Mao_De_Obra;Deslocamento;Valor_Locacao;Nf_Emitida;Status;Observacoes",
      "18/06/2026;09:00;Clínica Bella Forma;Dra. Ana Lima;Ultraformer III;Curitiba;disparos;1200;0;150;0;não;agendado;Ligar um dia antes para confirmar",
      "22/06/2026;14:00;Clínica Dermatológica Derme;Dra. Roberta Bastos;Endolaser;Londrina;horas;600;250;150;0;sim;concluido;Pagamento realizado via PIX"
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Modelo_Importacao_Locacoes_Sinnergie.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Template para importação baixado no seu computador!');
  };

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  // Filter analytical collections
  const uniqueCities = Array.from(new Set(locacoes.map(l => l.cidade).filter(Boolean)));
  const uniqueEqs = Array.from(new Set(locacoes.map(l => l.equipamento).filter(Boolean)));

  const filtered = locacoes.filter(l => {
    const matchesSearch = l.cliente.toLowerCase().includes(search.toLowerCase()) ||
                          l.dra?.toLowerCase().includes(search.toLowerCase()) || 
                          l.cidade?.toLowerCase().includes(search.toLowerCase()) ||
                          l.equipamento.toLowerCase().includes(search.toLowerCase());
    const matchesEq = selectedEq === 'Todos' || l.equipamento === selectedEq;
    const matchesCity = selectedCity === 'Todos' || l.cidade === selectedCity;
    const matchesStatus = selectedStatus === 'Todos' || l.status === selectedStatus;

    // Filter by year
    const matchesYear = l.data.startsWith(selectedYear);
    
    // Filter by month
    let matchesMonth = true;
    if (selectedMonth !== 'Todos') {
      const monthPrefix = `-${selectedMonth.padStart(2, '0')}-`;
      matchesMonth = l.data.includes(monthPrefix);
    }

    return matchesSearch && matchesEq && matchesCity && matchesStatus && matchesYear && matchesMonth;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [search, selectedEq, selectedCity, selectedStatus, selectedMonth, selectedYear]);

  // KPI aggregates
  const totalVolume = filtered.length;
  
  const completedRevenue = filtered
    .filter(l => l.status === 'concluido')
    .reduce((acc, curr) => acc + curr.valor_final, 0);

  const agendadasCount = filtered.filter(l => l.status === 'agendado').length;

  const pendingNFsCount = filtered.filter(l => l.status === 'concluido' && !l.nf_emitida).length;
  const pendingNFsVolume = filtered
    .filter(l => l.status === 'concluido' && !l.nf_emitida)
    .reduce((acc, curr) => acc + curr.valor_final, 0);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="text-emerald-550 text-2xl">📦</span> Locações de Equipamentos
          </h2>
          <p className="text-xs text-gray-500 mt-1">Gestão de aluguel de maquinário estético, controle de horas, faturamento e furos de agenda</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="bg-white border border-gray-200 text-gray-755 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-600" /> Importar CSV
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#3ecf8e] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black" /> Nova Locação
          </button>
        </div>
      </div>

      {/* Aggregate KPI Chips matching mock up format */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4">
          <div className="text-xl font-bold text-gray-900">{totalVolume}</div>
          <div className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider text-[10px]">Locações no Período</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Filtros de pesquisa ativos</div>
        </div>

        <div className="bg-white border-l-4 border-l-emerald-500 border-gray-200 shadow-xs rounded-xl p-4">
          <div className="text-xl font-bold text-emerald-700">R$ {completedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
          <div className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider text-[10px]">Faturamento Realizado</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Apenas executadas</div>
        </div>

        <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4">
          <div className="text-xl font-bold text-blue-600">{agendadasCount}</div>
          <div className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider text-[10px]">Locações Agendadas</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Reservadas na agenda</div>
        </div>

        <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4">
          <div className="text-xl font-bold text-amber-600">{pendingNFsCount}</div>
          <div className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider text-[10px]">Faturamento pendente NF-e</div>
          <div className="text-[10px] text-amber-700 font-medium mt-0.5">R$ {pendingNFsVolume.toLocaleString('pt-BR')} em aberto</div>
        </div>
      </div>

      {/* Complex Filter Container */}
      <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4.5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-1">
          {/* Main search bar */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Pesquisar clínica, doutor, cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 pl-9 pr-3 text-gray-900 outline-none placeholder-gray-400 focus:bg-white focus:border-[#8B1A2E] transition-colors"
            />
          </div>

          {/* Machine selector */}
          <div>
            <select
              value={selectedEq}
              onChange={(e) => setSelectedEq(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900 outline-none cursor-pointer focus:bg-white focus:border-[#8B1A2E]"
            >
              <option value="Todos">Equipamento (Todos)</option>
              {uniqueEqs.map((e, idx) => (
                <option key={idx} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* City Selector */}
          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900 outline-none cursor-pointer focus:bg-white focus:border-[#8B1A2E]"
            >
              <option value="Todos">Cidades (Todas)</option>
              {uniqueCities.map((c, idx) => (
                <option key={idx} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status selector */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900 outline-none cursor-pointer focus:bg-white focus:border-[#8B1A2E]"
            >
              <option value="Todos">Etapa (Todas)</option>
              <option value="agendado">Agendado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {/* Date grouping selectors */}
          <div className="grid grid-cols-2 gap-1.5 col-span-1">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg py-2 pl-2 pr-1 text-[11px] text-[#252525] outline-none cursor-pointer focus:bg-white focus:border-[#8B1A2E]"
            >
              <option value="Todos">Mês (Todos)</option>
              <option value="1">Jan</option>
              <option value="2">Fev</option>
              <option value="3">Mar</option>
              <option value="4">Abr</option>
              <option value="5">Mai</option>
              <option value="6">Jun (Corrente)</option>
              <option value="7">Jul</option>
              <option value="8">Ago</option>
              <option value="9">Set</option>
              <option value="10">Out</option>
              <option value="11">Nov</option>
              <option value="12">Dez</option>
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg py-2 pl-2 pr-1 text-[11px] text-[#252525] outline-none cursor-pointer focus:bg-white focus:border-[#8B1A2E]"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rentals Table */}
      <div className="bg-white border border-gray-200 shadow-xs rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Cliente / Dra</th>
                <th className="py-3 px-4">Equipamento</th>
                <th className="py-3 px-4">Cidade</th>
                <th className="py-3 px-4 text-right">Variável Base</th>
                <th className="py-3 px-4 text-right">Mão de obra</th>
                <th className="py-3 px-4 text-right">Extra Desloc.</th>
                <th className="py-3 px-4 text-right text-emerald-700 font-bold">Valor Final</th>
                <th className="py-3 px-4 text-center">Fatura NF</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400 font-medium">
                    Nenhuma locação encontrada correspondente aos filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors bg-white">
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap text-gray-600">
                      <span>{item.data.split('-').reverse().join('/')}</span>
                      <span className="block text-[10px] text-gray-400">{item.horario}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{item.cliente}</div>
                      {item.dra && <div className="text-[10px] text-gray-500">{item.dra}</div>}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight">
                        {item.equipamento}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-700 whitespace-nowrap">{item.cidade || 'Não informada'}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-650">
                      {item.base_calculo_tipo === 'disparos' ? (
                        <span>{item.base_calculo_valor} disparos</span>
                      ) : item.base_calculo_tipo === 'horas' ? (
                        <span>R$ {item.base_calculo_valor.toLocaleString('pt-BR')} base</span>
                      ) : (
                        <span>Valor Fixo</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-500">
                      R$ {item.mao_de_obra.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-500">
                      R$ {item.deslocamento.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono whitespace-nowrap">
                      R$ {item.valor_final.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleNfEmitida(item)}
                        className={`text-md mx-auto transition-all cursor-pointer ${item.nf_emitida ? 'text-emerald-500 scale-110' : 'text-gray-300 hover:text-emerald-500'}`}
                        title={item.nf_emitida ? 'NF Emitida! Clique para marcar pendente' : 'Marcar como NF Emitida'}
                      >
                        {item.nf_emitida ? '✔' : '✖'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.status === 'agendado' && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-105 px-2 py-0.5 rounded-full font-bold">
                          Agendado
                        </span>
                      )}
                      {item.status === 'concluido' && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-110 px-2 py-0.5 rounded-full font-bold">
                          Concluído
                        </span>
                      )}
                      {item.status === 'cancelado' && (
                        <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-105 px-2 py-0.5 rounded-full font-bold">
                          Cancelado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {item.status === 'agendado' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(item, 'concluido')}
                            className="p-1 rounded bg-gray-50 border border-gray-200 text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer text-xs font-semibold"
                            title="Concluir locação"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1 rounded bg-gray-50 border border-gray-200 text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer text-xs"
                          title="Editar locação"
                        >
                          ✏
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(item)}
                          className="p-1 rounded bg-gray-50 border border-gray-200 text-rose-650 hover:bg-rose-50 transition-colors cursor-pointer text-xs"
                          title="Apagar locação"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 bg-gray-50 text-gray-500 text-[10px] font-bold border-t border-gray-100 flex items-center justify-between">
          <span>
            {filtered.length > 0
              ? `Exibindo ${((safePage - 1) * PAGE_SIZE) + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length} locações`
              : 'Nenhuma locação encontrada'}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1 text-[10px] font-bold bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
              >
                ← Ant.
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const page = totalPages <= 7 ? i + 1 : safePage <= 4 ? i + 1 : safePage >= totalPages - 3 ? totalPages - 6 + i : safePage - 3 + i;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 text-[10px] font-bold rounded-lg cursor-pointer ${safePage === page ? 'bg-[#8B1A2E] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2.5 py-1 text-[10px] font-bold bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
              >
                Próx. →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW RENTAL MODAL (WITH MATHEMATIC CALCULATOR) */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-gray-205 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">{editingLocacao ? 'Editar Locação' : 'Agendar Nova Locação'}</h3>
              <button
                type="button"
                onClick={() => { setIsCreateOpen(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form Scrollable Content */}
            <form onSubmit={handleCreateSubmit} className="p-5 overflow-y-auto space-y-4">
              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Data da Diária *</label>
                  <input
                    type="date"
                    required
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-205 rounded-lg text-xs py-2.5 px-3 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Horário de Entrega</label>
                  <input
                    type="time"
                    required
                    value={horario}
                    onChange={(e) => setHorario(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-205 rounded-lg text-xs py-2.5 px-3 text-gray-900"
                  />
                </div>
              </div>

              {/* Client & Physician Doc Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Clínica Contratante *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Clínica Bella Forma"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-205 rounded-lg text-xs py-2.5 px-3 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Dra / Médico Responsável</label>
                  <input
                    type="text"
                    placeholder="Dra. Roberta Santos"
                    value={dra}
                    onChange={(e) => setDra(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-205 rounded-lg text-xs py-2.5 px-3 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
                  />
                </div>
              </div>

              {/* Machinery & Location city */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Maquinário Solicitado *</label>
                  <select
                    value={equipamento}
                    onChange={(e) => handleEqChange(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-205 rounded-lg text-xs py-2.5 px-3 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
                  >
                    <option value="Ultraformer III">Ultraformer III</option>
                    <option value="Ultraformer MPT">Ultraformer MPT</option>
                    <option value="Endolaser">Endolaser</option>
                    <option value="CO2 Fracionado">CO2 Fracionado</option>
                    <option value="Vectus">Vectus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cidade de Entrega</label>
                  <input
                    type="text"
                    placeholder="E.g., Curitiba"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-205 rounded-lg text-xs py-2.5 px-3 text-gray-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* MATH WORKSHOP CARD: CALCULATOR PARAMETERS */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                  Base De Cálculos Tarifários — Sinnergie
                </span>

                {/* Variable Base Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2 border-b border-gray-150">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Modelo de Medição</label>
                    <select
                      value={baseTipo}
                      onChange={(e) => setBaseTipo(e.target.value as 'disparos' | 'horas' | 'valor_fixo')}
                      className="w-full bg-white border border-gray-200 rounded-lg text-xs py-2 px-3 text-gray-900"
                    >
                      <option value="disparos">Por Disparo/Contagem Disparo (Ultraformer)</option>
                      <option value="horas">Taxa de Horas Base (Laser/Endo)</option>
                      <option value="valor_fixo">Montante de Locação Fixo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">
                      {baseTipo === 'disparos' ? 'Quantidade Estações (Disparos)' : baseTipo === 'horas' ? 'Valor Adquirido por Hora ($)' : 'Valor de Aluguel ($)'}
                    </label>
                    <input
                      type="number"
                      value={baseValor}
                      onChange={(e) => setBaseValor(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-lg text-xs py-1.5 px-3 text-gray-900"
                    />
                  </div>
                </div>

                {/* Relocation variables, labor work, material cost */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Mão de Obra Técnica (R$)</label>
                    <input
                      type="number"
                      value={maoDeObra}
                      onChange={(e) => setMaoDeObra(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-lg text-xs py-1.5 px-3 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Deslocamento / Frete (R$)</label>
                    <input
                      type="number"
                      value={deslocamento}
                      onChange={(e) => setDeslocamento(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-lg text-xs py-1.5 px-3 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Acessórios / Outros (R$)</label>
                    <input
                      type="number"
                      value={valorLocacao}
                      onChange={(e) => setValorLocacao(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-lg text-xs py-1.5 px-3 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Live Display final math card */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4.5 flex justify-between items-center">
                <div>
                  <span className="text-xs text-emerald-800 font-bold">Valor Final Estimado</span>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-sans leading-relaxed">
                    {baseTipo === 'disparos' 
                      ? `Compõe: (${baseValor} disparos × R$ 1,15) + ${maoDeObra} M.O + ${deslocamento} Frete` 
                      : `Compõe: R$ ${baseValor} Base + ${maoDeObra} M.O + ${deslocamento} Frete`}
                  </p>
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  R$ {valorFinal.toLocaleString('pt-BR')}
                </div>
              </div>

              {/* Extra conditions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status Teórico Inicial</label>
                  <select
                    value={locacaoStatus}
                    onChange={(e) => setLocacaoStatus(e.target.value as 'agendado' | 'concluido' | 'cancelado')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3 text-gray-900"
                  >
                    <option value="agendado">📅 Confirmado / Agendado</option>
                    <option value="concluido">✔ Concluído (Faturado já)</option>
                    <option value="cancelado">✖ Cancelado / Bloqueado</option>
                  </select>
                </div>

                <div className="flex items-end pl-1 pb-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 select-none font-bold">
                    <input
                      type="checkbox"
                      checked={nfEmitida}
                      onChange={(e) => setNfEmitida(e.target.checked)}
                      className="accent-emerald-600 w-4.5 h-4.5 border-gray-200 rounded"
                    />
                    Nota Fiscal (NF-e) já Emitida
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Instruções de Transporte / Observações</label>
                <textarea
                  rows={2}
                  placeholder="Se necessário, forneça informações para entrega como sala, telefone de contato alternativo ou restrições de horários."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-202 rounded-lg text-xs py-2 px-3 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
                />
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="w-1/2 py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition-colors"
                >
                  Fechar janela
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 px-4 bg-[#8B1A2E] hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer text-center"
                >
                  Registrar Diária
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT REAL MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Importação em Massa via CSV</h3>
              <button 
                type="button" 
                onClick={() => setIsImportOpen(false)}
                className="text-gray-400 hover:text-gray-650"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Formato Sinnergie CRM aplicável</span>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-xs text-emerald-600 hover:underline flex items-center gap-1.5 font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar modelo de planilha CSV
                </button>
              </div>

              {/* Real Input file selection */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept=".csv" 
                className="hidden" 
              />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-emerald-400 bg-gray-50 hover:bg-white rounded-xl p-8 text-center cursor-pointer transition-colors group"
                title="Clique para selecionar uma planilha do seu computador"
              >
                <Upload className="w-10 h-10 text-gray-400 group-hover:text-emerald-500 mx-auto mb-3 transition-colors" />
                <h4 className="text-xs font-bold text-gray-900">Selecionar Planilha CSV do Computador</h4>
                <p className="text-[10px] text-gray-500 mt-1">Carregue um arquivo .csv real no formato Sinnergie</p>
                <p className="text-[9px] text-[#3ecf8e] mt-1.5 font-bold">✓ Compatível com separadores de ponto-e-vírgula (;) ou vírgula (,)</p>
              </div>

              {/* simulated rows preview */}
              <div className="space-y-1.5">
                <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1 font-mono">Estrutura de Cabeçalho Esperada:</h5>
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-[10px] text-gray-200 font-mono space-y-1 overflow-x-auto leading-relaxed">
                  <div>Data;Cliente;Dra;Equipamento;Cidade;Base_Calculo_Valor;Status</div>
                  <div className="text-gray-450">18/06/2026;Clínica Dermos;Dra. Luana;Ultraformer MPT;Maringá;1200;agendado</div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="w-1/3 py-2.5 px-3 bg-white border border-gray-205 rounded-lg text-xs font-semibold text-gray-500 cursor-pointer hover:bg-gray-50"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={handleCsvSimulation}
                className="w-2/3 py-2.5 px-3 bg-[#8B1A2E] text-white font-extrabold rounded-lg text-xs hover:bg-emerald-500 transition-colors cursor-pointer text-center"
              >
                Carregamento Rápido de Teste (Amostra)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-md font-bold text-gray-950">Confirmar Exclusão</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              Tem certeza de que deseja excluir permanentemente o registro de locação de <strong className="text-gray-900">"{deleteTarget.cliente}"</strong> agendada para o dia <strong className="text-gray-950">{deleteTarget.data}</strong>?
            </p>
            <div className="flex gap-2.5 pt-1.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="w-1/2 py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-lg text-xs cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="w-1/2 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-950 text-white text-[11px] px-4 py-3 rounded-lg shadow-2xl border border-gray-800 flex items-center gap-2 font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
