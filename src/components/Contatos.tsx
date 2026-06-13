import React, { useState, useEffect } from 'react';
import { Contato } from '../types';
import { geminiService } from '../geminiService';
import { Search, Plus, Trash2, Mail, Phone, MapPin, Tag, MessageSquare, Edit2, Check, X, ShieldAlert, Upload, Download, Sparkles, Loader2 } from 'lucide-react';

interface ContatosProps {
  contatos: Contato[];
  onSave: (contato: Partial<Contato>) => Promise<Contato>;
  onDelete: (id: string) => Promise<boolean>;
  onBulkImport: (items: Partial<Contato>[]) => Promise<Contato[]>;
}

export default function Contatos({ contatos, onSave, onDelete, onBulkImport }: ContatosProps) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedOrigem, setSelectedOrigem] = useState('Todos');
  const [selectedCidade, setSelectedCidade] = useState('Todos');

  // Contact modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingContato, setEditingContato] = useState<Partial<Contato> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contato | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aiFollowUp, setAiFollowUp] = useState<{ id: string; text: string } | null>(null);
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Form fields
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [statusVal, setStatusVal] = useState<Contato['status']>('warm');
  const [origem, setOrigem] = useState('Instagram');
  const [observacoes, setObservacoes] = useState('');

  // Rich extensions
  const [estado, setEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [equipamentos, setEquipamentos] = useState('');
  const [etiquetas, setEtiquetas] = useState('');
  const [endereco, setEndereco] = useState('');
  const [proxFollowUp, setProxFollowUp] = useState('');

  // Open modal for either create or edit
  const openModal = (contato?: Contato) => {
    if (contato) {
      setEditingContato(contato);
      setNome(contato.nome);
      setEmail(contato.email || '');
      setTelefone(contato.telefone || '');
      setCidade(contato.cidade || '');
      setStatusVal(contato.status);
      setOrigem(contato.origem || 'Instagram');
      setObservacoes(contato.observacoes || '');
      setEstado(contato.estado || '');
      setTipo(contato.tipo || '');
      setEspecialidade(contato.especialidade || '');
      setEquipamentos(contato.equipamentos || '');
      setEtiquetas(contato.etiquetas || '');
      setEndereco(contato.endereco || '');
      setProxFollowUp(contato.prox_follow_up || '');
    } else {
      setEditingContato(null);
      setNome('');
      setEmail('');
      setTelefone('');
      setCidade('');
      setStatusVal('warm');
      setOrigem('Instagram');
      setObservacoes('');
      setEstado('');
      setTipo('');
      setEspecialidade('');
      setEquipamentos('');
      setEtiquetas('');
      setEndereco('');
      setProxFollowUp('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    await onSave({
      id: editingContato?.id,
      nome,
      email,
      telefone: telefone, // bind to phone state
      cidade,
      status: statusVal,
      origem,
      observacoes,
      estado,
      tipo,
      especialidade,
      equipamentos,
      etiquetas,
      endereco,
      prox_follow_up: proxFollowUp
    });

    setIsModalOpen(false);
    showToast(`Contato "${nome}" salvo com sucesso!`);
  };

  const handleDeleteClick = (contato: Contato) => {
    setDeleteTarget(contato);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const ok = await onDelete(deleteTarget.id);
    if (ok) {
      showToast(`Contato "${deleteTarget.nome}" removido do CRM.`);
    } else {
      showToast('Ocorreu um erro ao excluir o contato.');
    }
    setDeleteTarget(null);
  };

  const handleAiFollowUp = async (item: Contato) => {
    if (!geminiService.isAvailable()) {
      showToast('Configure VITE_GEMINI_API_KEY no .env para usar a IA.');
      return;
    }
    if (aiFollowUp?.id === item.id) { setAiFollowUp(null); return; }
    setAiLoadingId(item.id);
    try {
      const text = await geminiService.suggestFollowUp(item);
      setAiFollowUp({ id: item.id, text });
    } catch {
      showToast('Erro ao gerar sugestão de IA.');
    }
    setAiLoadingId(null);
  };

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // CSV real parser engine with fuzzy matching to support any header format and spelling
  const parseCSV = (csvText: string): Partial<Contato>[] => {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const rawHeader = lines[0];
    
    // Auto-detect separators: can be tab (\t), semicolon (;), comma (,)
    let separator = ',';
    if (rawHeader.includes(';')) {
      separator = ';';
    } else if (rawHeader.includes('\t')) {
      separator = '\t';
    }

    // A helper function to normalize strings for comparison (removes accents, spaces, lowers, etc.)
    const normalizeHeader = (str: string): string => {
      return str
        .toLowerCase()
        .normalize('NFD')                     // separates letters from accents
        .replace(/[\u0300-\u036f]/g, '')       // removes accents
        .replace(/[^a-z0-9]/g, '')             // removes spaces and special symbols like (.-_/)
        .trim();
    };

    const rawHeaders = rawHeader.split(separator).map(h => h.trim().replace(/^\uFEFF/, ''));
    const normalizedHeaders = rawHeaders.map(h => normalizeHeader(h));

    // We will build an index mapping list
    const findHeaderIndex = (aliases: string[]): number => {
      const normalizedAliases = aliases.map(normalizeHeader);
      // Perfect match first down normalized
      for (const alias of normalizedAliases) {
        const idx = normalizedHeaders.indexOf(alias);
        if (idx !== -1) return idx;
      }
      // Partial contains match next
      for (const alias of normalizedAliases) {
        const foundIdx = normalizedHeaders.findIndex(h => h.includes(alias) || alias.includes(h));
        if (foundIdx !== -1) return foundIdx;
      }
      return -1;
    };

    // Find the column index for each property
    const idxNome = findHeaderIndex(['nome', 'cliente', 'razaosocial', 'fullname', 'name', 'contato', 'doutor', 'dra']);
    const idxTelefone = findHeaderIndex(['telefone', 'celular', 'phone', 'whatsapp', 'cel', 'tel', 'fone']);
    const idxEmail = findHeaderIndex(['email', 'mail', 'correio']);
    const idxCidade = findHeaderIndex(['cidade', 'city', 'municipio']);
    const idxEstado = findHeaderIndex(['estado', 'uf', 'state', 'regiao']);
    const idxTipo = findHeaderIndex(['tipo', 'perfil', 'type']);
    const idxStatus = findHeaderIndex(['status', 'situacao', 'fase', 'pipeline']);
    const idxEspecialidade = findHeaderIndex(['especialidade', 'ramo', 'specialty', 'area']);
    const idxEquipamentos = findHeaderIndex(['equipamentos', 'equipamento', 'maquinas', 'interesse', 'interesses', 'machines']);
    const idxEtiquetas = findHeaderIndex(['etiquetas', 'tags', 'labels', 'etiqueta', 'grupo', 'grupos']);
    const idxEndereco = findHeaderIndex(['endereco', 'rua', 'address', 'localizacao', 'localidade']);
    const idxObservacoes = findHeaderIndex(['notas', 'observacoes', 'obs', 'comentarios', 'historico', 'notes', 'observacao']);
    const idxProxFollowUp = findHeaderIndex(['proxfollowup', 'followup', 'proximofollowup', 'retorno', 'proximaretorno', 'proximocontato']);

    const result: Partial<Contato>[] = [];

    // Simple custom CSV line splitter that handles quotes and delimiters correctly!
    const splitCSVLine = (line: string, sep: string): string[] => {
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === sep && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      // Strip outer quotes from parts
      return parts.map(p => {
        if (p.startsWith('"') && p.endsWith('"')) {
          return p.slice(1, -1).trim();
        }
        return p;
      });
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = splitCSVLine(line, separator);

      // Extract value helper
      const getVal = (idx: number): string => (idx !== -1 && idx < values.length) ? values[idx] : '';

      // Get fields using indices
      const nomeVal = getVal(idxNome);
      if (!nomeVal) continue; // Skip lines that lack a name

      const emailVal = getVal(idxEmail);
      const telefoneVal = getVal(idxTelefone);
      const cidadeVal = getVal(idxCidade);
      const estadoVal = getVal(idxEstado);
      const tipoVal = getVal(idxTipo);
      const especialidadeVal = getVal(idxEspecialidade);
      const equipamentosVal = getVal(idxEquipamentos);
      const etiquetasVal = getVal(idxEtiquetas);
      const enderecoVal = getVal(idxEndereco);
      const obsVal = getVal(idxObservacoes);
      const rawFollowUp = getVal(idxProxFollowUp);

      // Parse and format Status
      let statusValMapped = String(getVal(idxStatus) || 'warm').toLowerCase().trim();
      if (statusValMapped.includes('quente') || statusValMapped === 'hot') {
        statusValMapped = 'hot';
      } else if (statusValMapped.includes('frio') || statusValMapped === 'cold') {
        statusValMapped = 'cold';
      } else if (statusValMapped.includes('ativo') || statusValMapped === 'active') {
        statusValMapped = 'active';
      } else if (statusValMapped.includes('perdido') || statusValMapped === 'lost') {
        statusValMapped = 'lost';
      } else {
        statusValMapped = 'warm'; // default to warm
      }

      // Quick Date normalization for follow_up if provided (e.g. DD/MM/YYYY into YYYY-MM-DD for <input type="date">)
      let formattedFollowUp = '';
      if (rawFollowUp) {
        // match DD/MM/YYYY or DD-MM-YYYY
        const dmyMatch = rawFollowUp.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (dmyMatch) {
          const day = dmyMatch[1].padStart(2, '0');
          const month = dmyMatch[2].padStart(2, '0');
          const year = dmyMatch[3];
          formattedFollowUp = `${year}-${month}-${day}`;
        } else {
          // Check standard YYYY-MM-DD
          const ymdMatch = rawFollowUp.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
          if (ymdMatch) {
            formattedFollowUp = rawFollowUp;
          }
        }
      }

      // Add contact structured object
      result.push({
        nome: nomeVal,
        email: emailVal,
        telefone: telefoneVal,
        cidade: cidadeVal,
        estado: estadoVal,
        tipo: tipoVal,
        status: statusValMapped as Contato['status'],
        especialidade: especialidadeVal,
        equipamentos: equipamentosVal,
        etiquetas: etiquetasVal,
        endereco: enderecoVal,
        observacoes: obsVal,
        prox_follow_up: formattedFollowUp,
        origem: 'Importado CSV'
      });
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
          showToast('Nenhum contato válido encontrado no arquivo CSV.');
          return;
        }
        await onBulkImport(parsed);
        setIsImportOpen(false);
        showToast(`${parsed.length} contatos importados com sucesso via planilha!`);
      } catch (err) {
        console.error(err);
        showToast('Falha ao processar planilha CSV.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleCsvSimulation = async () => {
    const sampleRows: Partial<Contato>[] = [
      { nome: 'Dr. Arthur Mendes (Amostra)', email: 'arthur.mendes@clinica.com', telefone: '(43) 98888-2211', cidade: 'Londrina', status: 'hot', origem: 'Indicação', observacoes: 'Amostra de teste importada via CSV' },
      { nome: 'Clínica Rejuvenesce (Amostra)', email: 'contato@rejuvenesce.com.br', telefone: '(41) 3222-4455', cidade: 'Curitiba', status: 'active', origem: 'Instagram', observacoes: 'Amostra de teste importada via CSV' },
    ];

    await onBulkImport(sampleRows);
    setIsImportOpen(false);
    showToast('2 contatos de demonstração importados para fins de teste!');
  };

  const handleDownloadTemplate = () => {
    const csvContent = "\uFEFF" + [
      "Nome;Email;Telefone;Cidade;Status;Origem;Observacoes",
      "Dr. Guilherme Borges;guilherme@clinica.com;(44) 99911-2233;Maringá;hot;Google;Gostaria de locar Ultraformer em Julho",
      "Estética Corporal Plena;contato@plenaestetica.com;(41) 98877-6655;Curitiba;warm;Instagram;Fez cotação de Vectus"
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Modelo_Importacao_Contatos_Sinnergie.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Template para importação de contatos baixado com sucesso!');
  };

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  // Get unique lists for filtering
  const cidades = Array.from(new Set(contatos.map(c => c.cidade).filter(Boolean)));
  const origens = Array.from(new Set(contatos.map(c => c.origem).filter(Boolean)));

  // Filter Logic
  const filtered = contatos.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
                          c.email?.toLowerCase().includes(search.toLowerCase()) ||
                          c.cidade?.toLowerCase().includes(search.toLowerCase()) ||
                          c.telefone?.includes(search);
    const matchesStatus = selectedStatus === 'Todos' || c.status === selectedStatus;
    const matchesOrigem = selectedOrigem === 'Todos' || c.origem === selectedOrigem;
    const matchesCidade = selectedCidade === 'Todos' || c.cidade === selectedCidade;
    return matchesSearch && matchesStatus && matchesOrigem && matchesCidade;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, selectedStatus, selectedOrigem, selectedCidade]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="text-emerald-600 text-xl">👥</span> Contatos & CRM
          </h2>
          <p className="text-xs text-gray-500 mt-1">Gestão de contatos de clínicas, esteticistas e médicos de estética</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            title="Importar contatos de uma planilha CSV"
          >
            <Upload className="w-4 h-4 text-gray-400" /> Importar CSV
          </button>
          <button
            type="button"
            onClick={() => openModal()}
            className="bg-[#3ecf8e] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black" /> Novo Contato
          </button>
        </div>
      </div>

      {/* Filters UI */}
      <div className="bg-white border border-gray-200 shadow-xs rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nome, email, telefone ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 pl-10 pr-4 text-gray-900 outline-none placeholder-gray-400 focus:bg-white focus:border-emerald-500 transition-colors font-sans"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 lg:w-3/5">
            {/* Status select */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-l-lg py-2 pl-3 pr-2 text-xs text-gray-800 outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="Todos">Status (Todos)</option>
                <option value="hot">🔥 Quente (Hot)</option>
                <option value="warm">⚡ Leve (Warm)</option>
                <option value="cold">❄ Frio (Cold)</option>
                <option value="active">✔ Ativo</option>
                <option value="lost">✖ Perdido</option>
              </select>
            </div>

            {/* Origem filter */}
            <div>
              <select
                value={selectedOrigem}
                onChange={(e) => setSelectedOrigem(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 py-2 pl-3 pr-2 text-xs text-gray-800 outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="Todos">Origem (Indiferente)</option>
                {origens.map((orig, idx) => (
                  <option key={idx} value={orig}>{orig}</option>
                ))}
              </select>
            </div>

            {/* Cidade filter */}
            <div>
              <select
                value={selectedCidade}
                onChange={(e) => setSelectedCidade(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-r-lg py-2 pl-3 pr-2 text-xs text-gray-800 outline-none cursor-pointer focus:border-emerald-500"
              >
                <option value="Todos">Cidades (Todas)</option>
                {cidades.map((cid, idx) => (
                  <option key={idx} value={cid}>{cid}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Contacts */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl text-center p-12 space-y-2">
          <p className="text-sm font-semibold text-gray-900">Nenhum contato coincide com a busca.</p>
          <p className="text-xs text-gray-400">Tente redigitar ou utilize filtros diferentes.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((item) => (
            <div 
              key={item.id} 
              className="bg-white border border-gray-200 hover:border-emerald-200 hover:shadow-md rounded-xl p-4.5 flex flex-col justify-between gap-4 transition-all shadow-xs"
            >
              <div className="space-y-3.5">
                {/* Name & status */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-gray-900 text-sm tracking-tight line-clamp-1">{item.nome}</h4>
                    {item.status === 'hot' && <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-100 px-2 py-0.5 rounded-full font-extrabold uppercase shrink-0">🔥 Quente</span>}
                    {item.status === 'warm' && <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-extrabold uppercase shrink-0">⚡ Warm</span>}
                    {item.status === 'cold' && <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-extrabold uppercase shrink-0">❄ Frio</span>}
                    {item.status === 'active' && <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-extrabold uppercase shrink-0">✔ Ativo</span>}
                    {item.status === 'lost' && <span className="text-[9px] bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full font-extrabold uppercase shrink-0">✖ Perdido</span>}
                  </div>
                  
                  {/* Tipo & Especialidade */}
                  {(item.tipo || item.especialidade) && (
                    <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">
                      {item.tipo || 'Cliente'} {item.especialidade ? `• ${item.especialidade}` : ''}
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-1.5 border-t border-gray-100">
                  {/* Email */}
                  {item.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{item.email}</span>
                    </div>
                  )}

                  {/* Telefone */}
                  {item.telefone && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-mono">{item.telefone}</span>
                    </div>
                  )}

                  {/* Cidade / Estado / Endereço */}
                  {(item.cidade || item.endereco) && (
                    <div className="space-y-1">
                      <div className="flex items-start gap-2 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <div className="leading-tight">
                          <span className="font-bold text-gray-800">{item.cidade || 'Sem Cidade'}</span>
                          {item.estado ? <span className="text-gray-500 ml-1">({item.estado.toUpperCase()})</span> : ''}
                          {item.endereco && <p className="text-[10px] text-gray-400 mt-0.5">{item.endereco}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Equipamentos de interesse */}
                {item.equipamentos && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg px-2.5 py-1.5 text-[10.5px] text-emerald-800 flex items-center gap-1.5">
                    <span className="font-extrabold shrink-0">💻 Máquina:</span>
                    <span className="truncate">{item.equipamentos}</span>
                  </div>
                )}

                {/* Próximo retorno alert */}
                {item.prox_follow_up && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-lg px-2.5 py-1.5 text-[10.5px] text-amber-800 flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">🗓️ Próx. Follow-up:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-amber-200">{item.prox_follow_up.split('-').reverse().join('/')}</span>
                  </div>
                )}

                {/* Tags / Etiquetas list */}
                {item.etiquetas && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.etiquetas.split(',').map((tag, idx) => {
                      const trimmed = tag.trim();
                      if (!trimmed) return null;
                      return (
                        <span key={idx} className="text-[10px] font-bold text-gray-600 bg-gray-100/80 border border-gray-200 px-1.5 py-0.5 rounded-md">
                          #{trimmed}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Histórico / Notas */}
                {item.observacoes && (
                  <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs text-gray-500 font-medium italic mt-1.5 flex items-start gap-1.5 leading-relaxed">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="line-clamp-2">{item.observacoes}</p>
                  </div>
                )}
              </div>

              {/* AI Follow-up Suggestion */}
              {aiFollowUp?.id === item.id && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5 text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {aiFollowUp.text}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-between items-center border-t border-gray-100 pt-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => handleAiFollowUp(item)}
                  disabled={aiLoadingId === item.id}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                  title="Sugerir follow-up com IA"
                >
                  {aiLoadingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {aiFollowUp?.id === item.id ? 'Ocultar IA' : 'IA Follow-up'}
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openModal(item)}
                    className="p-1.5 rounded bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 transition-colors cursor-pointer"
                    title="Editar Contato"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(item)}
                    className="p-1.5 rounded bg-rose-50 hover:bg-rose-100/80 text-rose-600 hover:text-rose-700 border border-rose-100 transition-colors cursor-pointer"
                    title="Excluir Contato"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-[11px] text-gray-500">
              Exibindo {((safePage - 1) * PAGE_SIZE) + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length} contatos
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 cursor-pointer transition-colors"
              >
                ← Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const page = totalPages <= 7 ? i + 1 : safePage <= 4 ? i + 1 : safePage >= totalPages - 3 ? totalPages - 6 + i : safePage - 3 + i;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors cursor-pointer ${safePage === page ? 'bg-emerald-600 text-white' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 cursor-pointer transition-colors"
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
        </>
      )}

      {/* MODAL / DRAWER FOR CREATE & EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {editingContato ? 'Editar Contato' : 'Cadastrar Novo Contato'}
                </h3>
                <p className="text-[10px] text-gray-500">Insira as informações do cliente para o CRM e Pipeline</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nome / Clínica *</label>
                  <input
                    type="text"
                    required
                    placeholder="Clínica Bella Forma ou Dra. Carolina Matos"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                {/* Email / Telefone */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">E-mail</label>
                  <input
                    type="email"
                    placeholder="lucas@clinica.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Celular / Telefone</label>
                  <input
                    type="text"
                    placeholder="(41) 99888-1122"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                {/* Cidade / Estado */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Cidade</label>
                  <input
                    type="text"
                    placeholder="Curitiba, Londrina..."
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Estado (UF)</label>
                  <input
                    type="text"
                    placeholder="PR, SP, SC..."
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                {/* Origem Comercial / Pipeline Status */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Origem Comercial</label>
                  <select
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Site">Site Direct</option>
                    <option value="Whatsapp">Whatsapp Comercial</option>
                    <option value="Eventos">Eventos estéticos</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status Geral</label>
                  <select
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value as Contato['status'])}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  >
                    <option value="hot">🔥 Quente (Forte de fechar locações)</option>
                    <option value="warm">⚡ Leve/Morno (Negociando e interessado)</option>
                    <option value="cold">❄ Frio (Apenas prospecto distante)</option>
                    <option value="active">✔ Cliente Ativo (Já alugou recentemente)</option>
                    <option value="lost">✖ Perdido / Desistência</option>
                  </select>
                </div>

                {/* Tipo / Especialidade */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Tipo de Cliente</label>
                  <input
                    type="text"
                    placeholder="Clínica, Biomédico, Médico..."
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Especialidade</label>
                  <input
                    type="text"
                    placeholder="Dermatologia, Estética, Cirurgia..."
                    value={especialidade}
                    onChange={(e) => setEspecialidade(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                {/* Equipamentos / Etiquetas */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Equipamentos de Interesse</label>
                  <input
                    type="text"
                    placeholder="Ultraformer MPT, Endolaser, Vectus..."
                    value={equipamentos}
                    onChange={(e) => setEquipamentos(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Etiquetas / Tags</label>
                  <input
                    type="text"
                    placeholder="VIP, Esperando data, Alugou 3x..."
                    value={etiquetas}
                    onChange={(e) => setEtiquetas(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                {/* Endereço Completo */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Endereço Físico</label>
                  <input
                    type="text"
                    placeholder="Rua, Número, Bairro, CEP..."
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                {/* Próximo Follow-up Retorno */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 font-sans">Próx. Follow-up / Retorno</label>
                  <input
                    type="date"
                    value={proxFollowUp}
                    onChange={(e) => setProxFollowUp(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2.5 px-3.5 text-gray-900 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>

                {/* Observacoes */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Histórico / Observações Gerais</label>
                  <textarea
                    rows={3}
                    placeholder="Adicione notas sobre as necessidades da doutora, qual máquina ela tem preferência, datas úteis..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg text-xs py-2 px-3 text-gray-900 outline-none focus:bg-white focus:border-emerald-500 leading-relaxed resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all cursor-pointer"
                >
                  {editingContato ? 'Salvar Edições' : 'Criar Registro'}
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
              <h3 className="text-md font-bold text-gray-900">Excluir Contato</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              Tem certeza de que deseja excluir permanentemente o contato de <strong className="text-gray-900">"{deleteTarget.nome}"</strong>? Esta clínica ou médico será desvinculado.
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

      {/* CSV IMPORT REAL MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Importar Contatos via Planilha</h3>
                  <p className="text-[10px] text-gray-500 font-sans">Carregue ou simule a planilha para alimentar o CRM</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 flex-1">
              <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                <span className="text-[11px] text-gray-600">Planilha no formato Sinnergie CRM aplicável</span>
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
                  <div>Nome;Email;Telefone;Cidade;Status;Origem;Observacoes</div>
                  <div className="text-gray-400">Dra. Luana;luana@clinica.com;(44) 99911-2233;Maringá;hot;Instagram;Interesse em Ultraformer MPT</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 border-t border-gray-100 px-5 py-3.5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="w-1/3 py-2.5 px-3 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 cursor-pointer hover:bg-gray-50"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={handleCsvSimulation}
                className="w-2/3 py-2.5 px-3 bg-emerald-600 text-white font-extrabold rounded-lg text-xs hover:bg-emerald-500 transition-colors cursor-pointer text-center"
              >
                Carregamento Rápido de Teste (Amostra)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-gray-950 text-white text-[11px] px-4 py-3 rounded-lg shadow-2xl border border-gray-800 flex items-center gap-2 font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
