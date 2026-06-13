import React, { useState, useEffect } from 'react';
import { Tarefa, Contato } from '../types';
import { Plus, Trash2, Calendar, CheckCircle, Circle, Search, ShieldAlert, Edit2 } from 'lucide-react';

interface TarefasProps {
  tarefas: Tarefa[];
  contatos: Contato[];
  onSave: (tarefa: Partial<Tarefa>) => Promise<Tarefa>;
  onDelete: (id: string) => Promise<boolean>;
}

const PAGE_SIZE = 25;

export default function Tarefas({ tarefas, contatos, onSave, onDelete }: TarefasProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'pendentes' | 'concluidos'>('todos');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [vencimento, setVencimento] = useState(new Date().toISOString().split('T')[0]);
  const [prioridade, setPrioridade] = useState<'alta' | 'media' | 'baixa'>('media');
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteList, setShowClienteList] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Tarefa | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => setToastMessage(msg);
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const todayStr = new Date().toISOString().split('T')[0];

  const resetForm = () => {
    setEditingTarefa(null);
    setTitulo(''); setDescricao('');
    setVencimento(new Date().toISOString().split('T')[0]);
    setPrioridade('media');
    setClienteId(''); setClienteSearch('');
  };

  const openCreate = () => { resetForm(); setIsModalOpen(true); };

  const openEdit = (t: Tarefa) => {
    setEditingTarefa(t);
    setTitulo(t.titulo);
    setDescricao(t.descricao || '');
    setVencimento(t.vencimento);
    setPrioridade(t.prioridade);
    setClienteId(t.cliente_id || '');
    const linked = contatos.find(c => c.id === t.cliente_id);
    setClienteSearch(linked?.nome || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    await onSave({
      ...(editingTarefa ? { id: editingTarefa.id, status: editingTarefa.status } : { status: 'pendente' }),
      titulo, descricao, vencimento, prioridade,
      cliente_id: clienteId || undefined,
    });
    setIsModalOpen(false);
    showToast(editingTarefa ? `Tarefa "${titulo}" atualizada!` : `Tarefa "${titulo}" criada!`);
    resetForm();
  };

  const toggleStatus = async (item: Tarefa) => {
    const next = item.status === 'pendente' ? 'concluido' : 'pendente';
    await onSave({ ...item, status: next });
    showToast(`Tarefa marcada como ${next === 'concluido' ? 'concluída' : 'pendente'}`);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const ok = await onDelete(deleteTarget.id);
    showToast(ok ? `Tarefa "${deleteTarget.titulo}" excluída!` : 'Erro ao excluir.');
    setDeleteTarget(null);
  };

  // Filter
  const filtered = tarefas.filter(t => {
    const q = search.toLowerCase();
    const matchQ = t.titulo.toLowerCase().includes(q) || t.descricao.toLowerCase().includes(q);
    if (filterType === 'pendentes') return matchQ && t.status === 'pendente';
    if (filterType === 'concluidos') return matchQ && t.status === 'concluido';
    return matchQ;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(() => setCurrentPage(1), [search, filterType]);

  // Contact lookup
  const getContactName = (id?: string) => {
    if (!id) return null;
    return contatos.find(c => c.id === id)?.nome ?? null;
  };

  const filteredContatos = contatos.filter(c =>
    c.nome.toLowerCase().includes(clienteSearch.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span>✅</span> Distribuição de Tarefas
          </h2>
          <p className="text-xs text-gray-500 mt-1">Gerencie retornos, confirmações de entregas, contratos e cobranças</p>
        </div>
        <button type="button" onClick={openCreate}
          className="bg-[#8B1A2E] text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-[#6F1424] transition-all flex items-center gap-2 shadow-xs cursor-pointer">
          <Plus className="w-4 h-4" /> Nova Tarefa
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Pesquisar em tarefas..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 pl-9 pr-4 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E] transition-colors" />
        </div>
        <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
          {(['todos', 'pendentes', 'concluidos'] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${filterType === f ? 'bg-white text-gray-950 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}>
              {f === 'todos' ? 'Todas' : f === 'pendentes' ? 'Pendentes' : 'Concluídas'}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {paginated.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl text-center p-12 text-gray-400 text-xs">
            Nenhuma tarefa encontrada.
          </div>
        ) : paginated.map(item => {
          const isOverdue = item.status === 'pendente' && item.vencimento < todayStr;
          const contactName = getContactName(item.cliente_id);
          return (
            <div key={item.id} className={`bg-white border transition-all rounded-xl p-4 flex items-start gap-4 justify-between shadow-xs ${
              item.status === 'concluido' ? 'opacity-60 border-gray-200 bg-gray-50/50'
              : isOverdue ? 'border-amber-300 bg-amber-50/15 shadow-sm'
              : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <button type="button" onClick={() => toggleStatus(item)}
                  className="mt-0.5 text-gray-400 hover:text-emerald-500 transition-colors cursor-pointer">
                  {item.status === 'concluido'
                    ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                    : <Circle className="w-5 h-5 text-gray-300 hover:text-emerald-400" />}
                </button>
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className={`text-sm font-semibold leading-relaxed ${item.status === 'concluido' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {item.titulo}
                  </h4>
                  {item.descricao && (
                    <p className={`text-xs leading-relaxed line-clamp-2 ${item.status === 'concluido' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.descricao}
                    </p>
                  )}
                  {contactName && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-[#FBF0F2] text-[#8B1A2E] border border-[#E8C4CC] px-2 py-0.5 rounded-full font-semibold">
                      👤 {contactName}
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] font-semibold">
                    <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-amber-700' : item.status === 'concluido' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Vence {item.vencimento.split('-').reverse().join('/')}
                      {isOverdue && <span className="bg-amber-100 border border-amber-200 px-1 py-0.5 rounded text-[9px] font-bold text-amber-800">ATRASADA</span>}
                    </span>
                    {item.prioridade === 'alta' && <span className="bg-rose-50 text-rose-700 border border-rose-100 px-1.5 rounded uppercase font-bold text-[9px]">Alta</span>}
                    {item.prioridade === 'media' && <span className="bg-amber-50 text-amber-700 border border-amber-100 px-1.5 rounded uppercase font-bold text-[9px]">Média</span>}
                    {item.prioridade === 'baixa' && <span className="bg-purple-50 text-purple-700 border border-purple-100 px-1.5 rounded uppercase font-bold text-[9px]">Baixa</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-center">
                <button type="button" onClick={() => openEdit(item)}
                  className="p-1.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 transition-colors cursor-pointer" title="Editar">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => setDeleteTarget(item)}
                  className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 transition-colors cursor-pointer" title="Excluir">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
          <span>{filtered.length > 0 ? `Exibindo ${(safePage-1)*PAGE_SIZE+1}–${Math.min(safePage*PAGE_SIZE, filtered.length)} de ${filtered.length} tarefas` : ''}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={safePage===1}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 cursor-pointer">← Ant.</button>
            {Array.from({length: Math.min(totalPages,7)}, (_,i) => {
              const p = totalPages<=7 ? i+1 : safePage<=4 ? i+1 : safePage>=totalPages-3 ? totalPages-6+i : safePage-3+i;
              return <button key={p} onClick={() => setCurrentPage(p)}
                className={`w-7 h-7 rounded-lg cursor-pointer ${safePage===p ? 'bg-[#8B1A2E] text-white' : 'bg-white border border-gray-200 hover:bg-gray-100'}`}>{p}</button>;
            })}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={safePage===totalPages}
              className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 cursor-pointer">Próx. →</button>
          </div>
        </div>
      )}

      {/* MODAL CRIAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-md shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">{editingTarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
              <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Título *</label>
                <input type="text" required value={titulo} onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Ligar para cobrar faturamento"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 outline-none focus:bg-white focus:border-[#8B1A2E]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Data Limite</label>
                  <input type="date" required value={vencimento} onChange={e => setVencimento(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3 outline-none focus:bg-white focus:border-[#8B1A2E]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Prioridade</label>
                  <select value={prioridade} onChange={e => setPrioridade(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3 outline-none focus:bg-white focus:border-[#8B1A2E] cursor-pointer">
                    <option value="alta">🔴 Alta</option>
                    <option value="media">🟡 Média</option>
                    <option value="baixa">🟣 Baixa</option>
                  </select>
                </div>
              </div>

              {/* Contato vinculado */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contato Vinculado (opcional)</label>
                <input type="text" value={clienteSearch}
                  onChange={e => { setClienteSearch(e.target.value); setClienteId(''); setShowClienteList(true); }}
                  onFocus={() => setShowClienteList(true)}
                  placeholder="Buscar contato..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 outline-none focus:bg-white focus:border-[#8B1A2E]" />
                {clienteId && (
                  <button type="button" onClick={() => { setClienteId(''); setClienteSearch(''); }}
                    className="absolute right-2 top-8 text-gray-400 hover:text-gray-600 text-xs cursor-pointer">✕</button>
                )}
                {showClienteList && clienteSearch && !clienteId && filteredContatos.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {filteredContatos.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setClienteId(c.id); setClienteSearch(c.nome); setShowClienteList(false); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                        <span className="font-medium text-gray-900">{c.nome}</span>
                        {c.cidade && <span className="text-gray-400">{c.cidade}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Anotações</label>
                <textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Detalhes, telefone alternativo, como abordar..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 px-3 outline-none focus:bg-white focus:border-[#8B1A2E] resize-none" />
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs cursor-pointer">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-[#8B1A2E] hover:bg-[#6F1424] text-white font-bold rounded-lg text-xs cursor-pointer">
                  {editingTarefa ? 'Salvar Alterações' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-gray-950">Excluir Tarefa</h3>
            </div>
            <p className="text-xs text-gray-600">Excluir permanentemente <strong>"{deleteTarget.titulo}"</strong>?</p>
            <div className="flex gap-2.5">
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-lg text-xs cursor-pointer">Cancelar</button>
              <button type="button" onClick={executeDelete}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white text-[11px] px-4 py-3 rounded-lg shadow-2xl border border-gray-800 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
