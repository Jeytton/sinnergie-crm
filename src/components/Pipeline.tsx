import { useState } from 'react';
import { Contato } from '../types';
import { geminiService } from '../geminiService';
import { ArrowLeft, ArrowRight, MapPin, Eye, Edit2, X, Mail, Phone, Calendar, Tag, User, Sparkles, Loader2 } from 'lucide-react';

interface PipelineProps {
  contatos: Contato[];
  onSave: (contato: Partial<Contato>) => Promise<Contato>;
  onNavigateToContacts: () => void;
}

const STATUS_LABELS: Record<Contato['status'], string> = {
  cold: '❄ Frio',
  warm: '⚡ Warm',
  hot: '🔥 Quente',
  active: '🟢 Ativo',
  lost: '⚫ Perdido',
};

export default function Pipeline({ contatos, onSave, onNavigateToContacts }: PipelineProps) {
  const columns: { id: Contato['status']; title: string; color: string }[] = [
    { id: 'cold',   title: '❄ Frio (Cold)',      color: 'text-blue-600 border-blue-100' },
    { id: 'warm',   title: '⚡ Leve (Warm)',       color: 'text-amber-600 border-amber-100' },
    { id: 'hot',    title: '🔥 Quente (Hot)',      color: 'text-rose-600 border-rose-100' },
    { id: 'active', title: '🟢 Ativo (Active)',    color: 'text-emerald-700 border-emerald-100' },
    { id: 'lost',   title: '⚫ Perdido (Lost)',    color: 'text-gray-500 border-gray-200' },
  ];

  const statusFlow: Contato['status'][] = ['cold', 'warm', 'hot', 'active', 'lost'];

  // View modal
  const [viewContact, setViewContact] = useState<Contato | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAnalyzeLead = async (contato: Contato) => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const result = await geminiService.analyzeLead(contato);
      setAiAnalysis(result);
    } catch {
      setAiAnalysis('Erro ao analisar lead. Verifique a chave VITE_GEMINI_API_KEY.');
    }
    setAiLoading(false);
  };

  // Edit modal state
  const [editContact, setEditContact] = useState<Contato | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [editStatus, setEditStatus] = useState<Contato['status']>('warm');
  const [editOrigem, setEditOrigem] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');
  const [editProxFollowUp, setEditProxFollowUp] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (item: Contato) => {
    setEditContact(item);
    setEditNome(item.nome);
    setEditCidade(item.cidade || '');
    setEditStatus(item.status);
    setEditOrigem(item.origem || '');
    setEditObservacoes(item.observacoes || '');
    setEditProxFollowUp(item.prox_follow_up || '');
  };

  const handleEditSave = async () => {
    if (!editContact || !editNome.trim()) return;
    setEditSaving(true);
    await onSave({
      ...editContact,
      nome: editNome,
      cidade: editCidade,
      status: editStatus,
      origem: editOrigem,
      observacoes: editObservacoes,
      prox_follow_up: editProxFollowUp,
    });
    setEditSaving(false);
    setEditContact(null);
  };

  const moveStatus = async (item: Contato, direction: 'left' | 'right') => {
    const currentIndex = statusFlow.indexOf(item.status);
    let nextIndex = currentIndex;
    if (direction === 'left' && currentIndex > 0) nextIndex = currentIndex - 1;
    else if (direction === 'right' && currentIndex < statusFlow.length - 1) nextIndex = currentIndex + 1;
    if (nextIndex !== currentIndex) {
      await onSave({ ...item, status: statusFlow[nextIndex] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="text-emerald-500">⚡</span> Pipeline Comercial Kanban
          </h2>
          <p className="text-xs text-gray-500 mt-1">Monitore e evolua os contatos nas etapas do seu relacionamento</p>
        </div>
        <button
          type="button"
          onClick={onNavigateToContacts}
          className="bg-white border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          Ver fichas completas
        </button>
      </div>

      {/* Kanban grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto pb-4 items-start">
        {columns.map((col) => {
          const colItems = contatos.filter(c => c.status === col.id);
          return (
            <div key={col.id} className="bg-white border border-gray-200 shadow-xs rounded-xl flex flex-col max-h-[75vh] w-full min-w-[210px]">
              {/* Column header */}
              <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
                <span className={`text-[12px] font-bold ${col.color} tracking-tight uppercase`}>{col.title}</span>
                <span className="text-[10px] bg-gray-100 px-2.5 py-0.5 rounded-full text-gray-500 font-semibold">{colItems.length}</span>
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2.5 overflow-y-auto no-scrollbar" style={{ minHeight: '300px' }}>
                {colItems.length === 0 ? (
                  <div className="text-center py-10 px-2 border border-dashed border-gray-200 rounded-lg">
                    <p className="text-[10px] text-gray-400">Nenhum lead nesta fase.</p>
                  </div>
                ) : (
                  colItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-50/50 border border-gray-150 rounded-lg p-3 hover:border-emerald-300 transition-all space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-1">
                          <h5 className="font-semibold text-xs text-gray-900 leading-tight line-clamp-1 flex-1">{item.nome}</h5>
                          {/* View & Edit buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setViewContact(item)}
                              className="p-1 rounded bg-white hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 border border-gray-200 shadow-2xs transition-all cursor-pointer"
                              title="Ver detalhes"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="p-1 rounded bg-white hover:bg-blue-50 text-gray-400 hover:text-blue-600 border border-gray-200 shadow-2xs transition-all cursor-pointer"
                              title="Editar contato"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1">
                          {item.cidade && (
                            <span className="text-[9px] text-gray-500 flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 text-gray-400" />{item.cidade}
                            </span>
                          )}
                          {item.origem && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold border border-emerald-100/50">
                              {item.origem}
                            </span>
                          )}
                        </div>

                        {item.observacoes && (
                          <p className="text-[10px] text-gray-500 leading-relaxed italic line-clamp-2 border-t border-gray-100 pt-1.5 mt-1.5">
                            "{item.observacoes}"
                          </p>
                        )}
                      </div>

                      {/* Stage shift buttons */}
                      <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => moveStatus(item, 'left')}
                          disabled={statusFlow.indexOf(item.status) === 0}
                          className="p-1 rounded bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 border border-gray-200 disabled:opacity-20 shadow-2xs transition-all cursor-pointer"
                          title="Recuar etapa"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Mover</span>
                        <button
                          type="button"
                          onClick={() => moveStatus(item, 'right')}
                          disabled={statusFlow.indexOf(item.status) === statusFlow.length - 1}
                          className="p-1 rounded bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 border border-gray-200 disabled:opacity-20 shadow-2xs transition-all cursor-pointer"
                          title="Avançar etapa"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── VIEW MODAL ─────────────────────────────────────────────────── */}
      {viewContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-400 to-[#3ecf8e] flex items-center justify-center font-extrabold text-sm text-black">
                  {viewContact.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{viewContact.nome}</h3>
                  <span className="text-[10px] text-gray-500">{STATUS_LABELS[viewContact.status]}</span>
                </div>
              </div>
              <button type="button" onClick={() => setViewContact(null)} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-3">
                {viewContact.email && (
                  <div className="col-span-2 flex items-center gap-2 text-xs text-gray-700">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{viewContact.email}</span>
                  </div>
                )}
                {viewContact.telefone && (
                  <div className="col-span-2 flex items-center gap-2 text-xs text-gray-700">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{viewContact.telefone}</span>
                  </div>
                )}
                {viewContact.cidade && (
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{viewContact.cidade}{viewContact.estado ? ` — ${viewContact.estado}` : ''}</span>
                  </div>
                )}
                {viewContact.origem && (
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{viewContact.origem}</span>
                  </div>
                )}
                {viewContact.prox_follow_up && (
                  <div className="col-span-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Próx. follow-up: {viewContact.prox_follow_up.split('-').reverse().join('/')}</span>
                  </div>
                )}
              </div>

              {viewContact.tipo && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo / Especialidade</p>
                  <p className="text-xs text-gray-800">{viewContact.tipo}{viewContact.especialidade ? ` · ${viewContact.especialidade}` : ''}</p>
                </div>
              )}
              {viewContact.equipamentos && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Equipamentos de Interesse</p>
                  <p className="text-xs text-gray-800">{viewContact.equipamentos}</p>
                </div>
              )}
              {viewContact.etiquetas && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Etiquetas</p>
                  <div className="flex flex-wrap gap-1">
                    {viewContact.etiquetas.split(',').map((t, i) => (
                      <span key={i} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold">{t.trim()}</span>
                    ))}
                  </div>
                </div>
              )}
              {viewContact.observacoes && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Observações</p>
                  <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">{viewContact.observacoes}</p>
                </div>
              )}
              {viewContact.endereco && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Endereço</p>
                  <p className="text-xs text-gray-700">{viewContact.endereco}</p>
                </div>
              )}
            </div>

            {/* AI Analysis Section */}
            {geminiService.isAvailable() && (
              <div className="px-5 pb-3">
                <button
                  type="button"
                  onClick={() => handleAnalyzeLead(viewContact)}
                  disabled={aiLoading}
                  className="w-full flex items-center justify-center gap-2 text-xs bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {aiLoading ? 'Analisando com IA...' : 'Analisar Lead com Gemini AI'}
                </button>
                {aiAnalysis && !aiLoading && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {aiAnalysis}
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-50 border-t border-gray-100 px-5 py-3 flex gap-3">
              <button
                type="button"
                onClick={() => { setViewContact(null); openEdit(viewContact); setAiAnalysis(null); }}
                className="flex-1 py-2.5 bg-[#8B1A2E] hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                type="button"
                onClick={() => { setViewContact(null); setAiAnalysis(null); }}
                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold text-xs rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ─────────────────────────────────────────────────── */}
      {editContact && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Editar Contato</h3>
                  <p className="text-[10px] text-gray-500">{editContact.nome}</p>
                </div>
              </div>
              <button type="button" onClick={() => setEditContact(null)} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[65vh]">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cidade</label>
                  <input
                    type="text"
                    value={editCidade}
                    onChange={e => setEditCidade(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Origem</label>
                  <input
                    type="text"
                    value={editOrigem}
                    onChange={e => setEditOrigem(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status no Pipeline</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as Contato['status'])}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E] cursor-pointer"
                >
                  <option value="cold">❄ Frio</option>
                  <option value="warm">⚡ Warm</option>
                  <option value="hot">🔥 Quente</option>
                  <option value="active">🟢 Ativo</option>
                  <option value="lost">⚫ Perdido</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Próx. Follow-up</label>
                <input
                  type="date"
                  value={editProxFollowUp}
                  onChange={e => setEditProxFollowUp(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Observações</label>
                <textarea
                  rows={3}
                  value={editObservacoes}
                  onChange={e => setEditObservacoes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 px-3 text-gray-900 outline-none focus:bg-white focus:border-[#8B1A2E] leading-relaxed resize-none"
                />
              </div>
            </div>

            <div className="bg-gray-50 border-t border-gray-100 px-5 py-3 flex gap-3">
              <button
                type="button"
                onClick={() => setEditContact(null)}
                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-600 font-semibold text-xs rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={editSaving || !editNome.trim()}
                className="flex-1 py-2.5 bg-[#8B1A2E] hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                {editSaving ? 'Salvando...' : 'Salvar Edições'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
