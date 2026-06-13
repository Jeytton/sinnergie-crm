import React, { useState, useEffect } from 'react';
import { Contato } from '../types';
import { MessageCircle, Send, Users, Plus, Trash2, CheckCheck, Clock, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface WhatsAppProps {
  contatos: Contato[];
}

interface Template {
  id: string;
  nome: string;
  corpo: string;
}

interface CampaignRecord {
  id: string;
  data: string;
  templateNome: string;
  destinatarios: number;
  enviados: number;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: '1',
    nome: 'Oferta de Locação',
    corpo: 'Olá {nome}! 👋\nAqui é da Sinnergie Aesthetic Technologies.\nTemos disponibilidade do equipamento para locação em {cidade} no próximo mês.\nGostaria de agendar uma data? Responda esse WhatsApp ou entre em contato conosco! 😊',
  },
  {
    id: '2',
    nome: 'Follow-up Pós-Visita',
    corpo: 'Oi {nome}, tudo bem? 🌟\nFicamos muito felizes com a sua visita à Sinnergie!\nComo foi a experiência com o equipamento? Alguma dúvida que possamos esclarecer?\nEstamos à disposição em {cidade}. 💙',
  },
  {
    id: '3',
    nome: 'Lembrete de Retorno',
    corpo: 'Olá {nome}! 📅\nPassando para lembrar que estamos com disponibilidade de {equipamento} para locação.\nJá trabalhamos com diversas clínicas em {cidade} e adoraríamos contar com a sua parceria!\nQue tal conversarmos?',
  },
];

const LS_TEMPLATES = 'sinnergie_wa_templates';
const LS_CAMPAIGNS = 'sinnergie_wa_campaigns';

function loadTemplates(): Template[] {
  try { return JSON.parse(localStorage.getItem(LS_TEMPLATES) || 'null') ?? DEFAULT_TEMPLATES; }
  catch { return DEFAULT_TEMPLATES; }
}
function loadCampaigns(): CampaignRecord[] {
  try { return JSON.parse(localStorage.getItem(LS_CAMPAIGNS) || '[]'); }
  catch { return []; }
}

export default function WhatsApp({ contatos }: WhatsAppProps) {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>(loadCampaigns);

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(templates[0] ?? null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateBody, setNewTemplateBody] = useState('');

  // Contact selection
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Todos' | Contato['status']>('Todos');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Campaign sending state
  const [sending, setSending] = useState(false);
  const [sentProgress, setSentProgress] = useState<{ done: number; total: number } | null>(null);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => setToast(msg);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => { localStorage.setItem(LS_TEMPLATES, JSON.stringify(templates)); }, [templates]);
  useEffect(() => { localStorage.setItem(LS_CAMPAIGNS, JSON.stringify(campaigns)); }, [campaigns]);

  const filteredContatos = contatos.filter(c => {
    const q = search.toLowerCase();
    const matchQ = c.nome.toLowerCase().includes(q) || c.telefone?.includes(q) || c.cidade?.toLowerCase().includes(q);
    const matchS = filterStatus === 'Todos' || c.status === filterStatus;
    return matchQ && matchS;
  });

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredContatos.length) setSelected(new Set());
    else setSelected(new Set(filteredContatos.map(c => c.id)));
  };

  const fillTemplate = (body: string, c: Contato) =>
    body
      .replace(/\{nome\}/g, c.nome)
      .replace(/\{cidade\}/g, c.cidade || 'sua cidade')
      .replace(/\{equipamento\}/g, c.equipamentos || 'nosso equipamento');

  const getWaLink = (c: Contato) => {
    const phone = (c.telefone || '').replace(/\D/g, '');
    if (!phone) return null;
    const num = phone.startsWith('55') ? phone : `55${phone}`;
    const msg = selectedTemplate ? fillTemplate(selectedTemplate.corpo, c) : '';
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  const handleSendCampaign = async () => {
    if (!selectedTemplate || selected.size === 0) return;
    const targets = contatos.filter(c => selected.has(c.id) && c.telefone);
    if (targets.length === 0) { showToast('Nenhum contato selecionado tem telefone cadastrado.'); return; }

    setSending(true);
    setSentProgress({ done: 0, total: targets.length });

    let sent = 0;
    for (const c of targets) {
      const link = getWaLink(c);
      if (link) {
        window.open(link, '_blank');
        sent++;
        setSentProgress({ done: sent, total: targets.length });
        await new Promise(r => setTimeout(r, 800));
      }
    }

    const record: CampaignRecord = {
      id: Date.now().toString(),
      data: new Date().toISOString(),
      templateNome: selectedTemplate.nome,
      destinatarios: selected.size,
      enviados: sent,
    };
    setCampaigns(prev => [record, ...prev]);
    setSending(false);
    setSentProgress(null);
    setSelected(new Set());
    showToast(`Campanha enviada! ${sent} mensagens abertas no WhatsApp Web.`);
  };

  const saveTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateBody.trim()) return;
    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, nome: newTemplateName, corpo: newTemplateBody } : t));
      if (selectedTemplate?.id === editingTemplate.id) setSelectedTemplate({ ...editingTemplate, nome: newTemplateName, corpo: newTemplateBody });
    } else {
      const t: Template = { id: Date.now().toString(), nome: newTemplateName, corpo: newTemplateBody };
      setTemplates(prev => [...prev, t]);
    }
    setEditingTemplate(null); setIsCreatingTemplate(false); setNewTemplateName(''); setNewTemplateBody('');
    showToast('Template salvo!');
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedTemplate?.id === id) setSelectedTemplate(templates.find(t => t.id !== id) ?? null);
  };

  const statusColors: Record<string, string> = {
    hot: 'bg-rose-50 text-rose-700 border-rose-100',
    warm: 'bg-amber-50 text-amber-700 border-amber-100',
    cold: 'bg-blue-50 text-blue-700 border-blue-100',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    lost: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const statusLabel: Record<string, string> = { hot: '🔥 Quente', warm: '⚡ Morno', cold: '❄ Frio', active: '✔ Ativo', lost: '✖ Perdido' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-[#25D366]" /> WhatsApp Marketing
          </h2>
          <p className="text-xs text-gray-500 mt-1">Envie mensagens personalizadas para seus contatos via WhatsApp Web</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* LEFT: Templates */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Templates de Mensagem</h3>
              <button type="button" onClick={() => { setIsCreatingTemplate(true); setEditingTemplate(null); setNewTemplateName(''); setNewTemplateBody(''); }}
                className="flex items-center gap-1 text-[10px] bg-[#8B1A2E] text-white font-bold px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-[#6F1424]">
                <Plus className="w-3 h-3" /> Novo
              </button>
            </div>

            {(isCreatingTemplate || editingTemplate) && (
              <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
                <input type="text" placeholder="Nome do template" value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg text-xs py-2 px-3 outline-none focus:border-[#8B1A2E]" />
                <textarea rows={5} placeholder={'Corpo da mensagem...\n\nVariáveis: {nome} {cidade} {equipamento}'}
                  value={newTemplateBody} onChange={e => setNewTemplateBody(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg text-xs py-2 px-3 outline-none focus:border-[#8B1A2E] resize-none" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setIsCreatingTemplate(false); setEditingTemplate(null); }}
                    className="flex-1 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg cursor-pointer">Cancelar</button>
                  <button type="button" onClick={saveTemplate}
                    className="flex-1 py-1.5 bg-[#8B1A2E] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#6F1424]">Salvar</button>
                </div>
              </div>
            )}

            <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
              {templates.map(t => (
                <div key={t.id} onClick={() => setSelectedTemplate(t)}
                  className={`rounded-lg p-3 cursor-pointer transition-all border ${selectedTemplate?.id === t.id ? 'bg-[#FBF0F2] border-[#8B1A2E]' : 'bg-gray-50 border-gray-100 hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${selectedTemplate?.id === t.id ? 'text-[#8B1A2E]' : 'text-gray-800'}`}>{t.nome}</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={e => { e.stopPropagation(); setEditingTemplate(t); setIsCreatingTemplate(false); setNewTemplateName(t.nome); setNewTemplateBody(t.corpo); }}
                        className="text-gray-400 hover:text-blue-600 text-[10px] cursor-pointer p-0.5">✏</button>
                      <button type="button" onClick={e => { e.stopPropagation(); deleteTemplate(t.id); }}
                        className="text-gray-400 hover:text-rose-600 text-[10px] cursor-pointer p-0.5">✕</button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{t.corpo}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {selectedTemplate && (
            <div className="bg-[#0e1117] border border-gray-700 rounded-xl p-4 space-y-2">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Pré-visualização</p>
              <div className="bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl rounded-tl-none p-3">
                <p className="text-[11px] text-white whitespace-pre-wrap leading-relaxed">
                  {selectedTemplate.corpo.replace(/\{nome\}/g,'Nome do Cliente').replace(/\{cidade\}/g,'Curitiba').replace(/\{equipamento\}/g,'Ultraformer MPT')}
                </p>
              </div>
              <p className="text-[9px] text-gray-500 flex items-center gap-1">
                <span className="text-[#25D366]">✦</span> Variáveis: <code className="text-gray-400">{'{nome}'} {'{cidade}'} {'{equipamento}'}</code>
              </p>
            </div>
          )}
        </div>

        {/* CENTER+RIGHT: Contact selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
              <input type="text" placeholder="Filtrar contatos..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 pl-8 pr-3 outline-none focus:border-[#8B1A2E]" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 px-3 outline-none focus:border-[#8B1A2E] cursor-pointer">
              <option value="Todos">Todos os status</option>
              <option value="hot">🔥 Quente</option>
              <option value="warm">⚡ Morno</option>
              <option value="cold">❄ Frio</option>
              <option value="active">✔ Ativo</option>
            </select>
          </div>

          {/* Contact table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={filteredContatos.length > 0 && selected.size === filteredContatos.length}
                  onChange={toggleAll} className="accent-[#8B1A2E] w-3.5 h-3.5" />
                Selecionar todos ({filteredContatos.length})
              </label>
              <span className="text-[10px] font-semibold text-gray-500">{selected.size} selecionados</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {filteredContatos.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-400">Nenhum contato encontrado.</div>
              ) : filteredContatos.map(c => {
                const link = getWaLink(c);
                return (
                  <div key={c.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected.has(c.id) ? 'bg-[#FBF0F2]' : ''}`}>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                      className="accent-[#8B1A2E] w-3.5 h-3.5 cursor-pointer" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{c.nome}</p>
                      <p className="text-[10px] text-gray-500">{c.telefone || 'Sem telefone'}{c.cidade ? ` · ${c.cidade}` : ''}</p>
                    </div>
                    <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-full ${statusColors[c.status]}`}>
                      {statusLabel[c.status]}
                    </span>
                    {link && (
                      <a href={link} target="_blank" rel="noopener noreferrer"
                        className="text-[#25D366] hover:text-green-700 transition-colors" title="Abrir WhatsApp Web individual">
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    {!c.telefone && (
                      <span className="text-[9px] text-gray-300 font-medium">sem tel.</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Send button */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-700">
              <p className="font-bold">{selected.size} contato{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Template: {selectedTemplate?.nome ?? 'nenhum'}</p>
            </div>
            <button type="button" onClick={handleSendCampaign}
              disabled={sending || selected.size === 0 || !selectedTemplate}
              className="flex items-center gap-2 bg-[#25D366] hover:bg-green-600 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-colors">
              {sending ? (
                <><Clock className="w-4 h-4 animate-spin" /> Enviando {sentProgress?.done}/{sentProgress?.total}...</>
              ) : (
                <><Send className="w-4 h-4" /> Iniciar Campanha</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Campaign History */}
      {campaigns.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <CheckCheck className="w-4 h-4 text-[#25D366]" />
            <h3 className="text-sm font-bold text-gray-900">Histórico de Campanhas</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {campaigns.map(camp => (
              <div key={camp.id} className="p-4">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedCampaign(expandedCampaign === camp.id ? null : camp.id)}>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{camp.templateNome}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(camp.data).toLocaleString('pt-BR')} · {camp.enviados}/{camp.destinatarios} enviados
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-[#25D366] bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                      {camp.enviados} enviadas
                    </span>
                    {expandedCampaign === camp.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                {expandedCampaign === camp.id && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-3 text-[10px] text-gray-600">
                    <p>Campanha enviada em {new Date(camp.data).toLocaleString('pt-BR')}</p>
                    <p className="mt-1">Template: <strong>{camp.templateNome}</strong></p>
                    <p>Alcance: <strong>{camp.enviados} contatos</strong> abertos via WhatsApp Web</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-900 text-white text-[11px] px-4 py-3 rounded-lg shadow-2xl border border-gray-800 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-ping" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
