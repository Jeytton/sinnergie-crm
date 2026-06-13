import React, { useState, useEffect } from 'react';
import { Tarefa } from '../types';
import { Plus, Trash2, Calendar, AlertTriangle, CheckCircle, Circle, Search, ShieldAlert } from 'lucide-react';

interface TarefasProps {
  tarefas: Tarefa[];
  onSave: (tarefa: Partial<Tarefa>) => Promise<Tarefa>;
  onDelete: (id: string) => Promise<boolean>;
}

export default function Tarefas({ tarefas, onSave, onDelete }: TarefasProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'pendentes' | 'concluidos'>('todos');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [vencimento, setVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [prioridade, setPrioridade] = useState<'alta' | 'media' | 'baixa'>('media');

  const [deleteTarget, setDeleteTarget] = useState<Tarefa | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    await onSave({
      titulo,
      descricao,
      vencimento,
      prioridade,
      status: 'pendente'
    });

    setIsModalOpen(false);
    showToast(`Tarefa "${titulo}" criada com sucesso!`);
    setTitulo('');
    setDescricao('');
    setVencimento(new Date().toISOString().split('T')[0]);
    setPrioridade('media');
  };

  const toggleStatus = async (item: Tarefa) => {
    const nextStatus = item.status === 'pendente' ? 'concluido' : 'pendente';
    await onSave({
      ...item,
      status: nextStatus
    });
    showToast(`Tarefa marcada como ${nextStatus === 'concluido' ? 'concluída' : 'pendente'}`);
  };

  const handleDeleteClick = (tarefa: Tarefa) => {
    setDeleteTarget(tarefa);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const ok = await onDelete(deleteTarget.id);
    if (ok) {
      showToast(`Tarefa "${deleteTarget.titulo}" excluída com sucesso!`);
    } else {
      showToast('Ocorreu um erro ao excluir a tarefa.');
    }
    setDeleteTarget(null);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = tarefas.filter(t => {
    const matchesSearch = t.titulo.toLowerCase().includes(search.toLowerCase()) || 
                          t.descricao.toLowerCase().includes(search.toLowerCase());
    
    if (filterType === 'pendentes') {
      return matchesSearch && t.status === 'pendente';
    } else if (filterType === 'concluidos') {
      return matchesSearch && t.status === 'concluido';
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="text-emerald-500">✅</span> Distribuição de Tarefas
          </h2>
          <p className="text-xs text-gray-500 mt-1">Gerencie retornos, confirmações de entregas, contratos e cobranças</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="bg-[#3ecf8e] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 text-black" /> Nova Tarefa
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Pesquisar em tarefas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 pl-9 pr-4 text-gray-900 outline-none placeholder-gray-400 focus:bg-white focus:border-[#8B1A2E] transition-colors"
          />
        </div>

        <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => setFilterType('todos')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${filterType === 'todos' ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setFilterType('pendentes')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${filterType === 'pendentes' ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Pendentes
          </button>
          <button
            type="button"
            onClick={() => setFilterType('concluidos')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${filterType === 'concluidos' ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Concluídas
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl text-center p-12 text-gray-400 text-xs">
            Nenhuma tarefa encontrada neste filtro.
          </div>
        ) : (
          filtered.map((item) => {
            const isOverdue = item.status === 'pendente' && item.vencimento < todayStr;

            return (
              <div 
                key={item.id}
                className={`bg-white border transition-all rounded-xl p-4.5 flex items-start gap-4 justify-between shadow-xs ${
                  item.status === 'concluido' 
                    ? 'opacity-60 border-gray-250 bg-gray-50/50' 
                    : isOverdue 
                    ? 'border-amber-300 bg-amber-50/15 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button 
                    type="button"
                    onClick={() => toggleStatus(item)}
                    className="mt-0.5 text-gray-400 hover:text-emerald-500 transition-colors cursor-pointer"
                  >
                    {item.status === 'concluido' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 hover:text-emerald-400" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className={`text-sm font-semibold leading-relaxed tracking-tight ${item.status === 'concluido' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {item.titulo}
                    </h4>
                    {item.descricao && (
                      <p className={`text-xs leading-relaxed ${item.status === 'concluido' ? 'text-gray-400' : 'text-gray-600'} line-clamp-2 md:line-clamp-none`}>
                        {item.descricao}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-semibold">
                      {/* Due-date badge */}
                      <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-amber-850' : item.status === 'concluido' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        Vence {item.vencimento.split('-').reverse().join('/')}
                        {isOverdue && <span className="bg-amber-100 border border-amber-250 px-1 py-0.2 rounded text-[9px] font-bold text-amber-800">ATRASADA</span>}
                      </span>

                      {/* Priority badge */}
                      {item.prioridade === 'alta' && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.1.5 rounded uppercase font-bold text-[9px]">Alta Prioridade</span>
                      )}
                      {item.prioridade === 'media' && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.1.5 rounded uppercase font-bold text-[9px]">Média</span>
                      )}
                      {item.prioridade === 'baixa' && (
                        <span className="bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.1.5 rounded uppercase font-bold text-[9px]">Baixa</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteClick(item)}
                  className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 transition-colors self-center cursor-pointer"
                  title="Apagar Tarefa"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* CREATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Planejar Nova Tarefa</h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="space-y-3.5">
                {/* Title */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Título da Tarefa *</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Ligar para cobrar faturamento do Vectus"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Data Limite / Vencimento</label>
                  <input
                    type="date"
                    required
                    value={vencimento}
                    onChange={(e) => setVencimento(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
                  />
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Grau de Urgência</label>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as 'alta' | 'media' | 'baixa')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E] cursor-pointer"
                  >
                    <option value="alta">🔴 Alta Urgência (Cobranças/Logística imediata)</option>
                    <option value="media">🟡 Média Urgência (Retornos comerciais)</option>
                    <option value="baixa">🟣 Baixa Urgência (Envio de novidades/folders)</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Anotações Detalhadas</label>
                  <textarea
                    rows={3}
                    placeholder="Adicione anotações sobre como abordar, telefones adicionais, observações importantes..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 px-3 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E] resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 px-4 bg-[#8B1A2E] hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-md font-bold text-gray-950">Excluir Tarefa</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              Tem certeza de que deseja excluir permanentemente a tarefa <strong className="text-gray-900">"{deleteTarget.titulo}"</strong>?
            </p>
            <div className="flex gap-2.5 pt-1.5 flex-row">
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
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-955 text-white text-[11px] px-4 py-3 rounded-lg shadow-2xl border border-gray-800 flex items-center gap-2 font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
