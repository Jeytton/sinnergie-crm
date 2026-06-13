import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { X, Send, Sparkles, Loader2, Bot, RefreshCw } from 'lucide-react';
import { Contato, Tarefa, Locacao } from '../types';

// Leitura da chave no nível de módulo (resolvida pelo Vite em build time)
const _apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const _ai = _apiKey ? new GoogleGenAI({ apiKey: _apiKey }) : null;

interface AiAssistantProps {
  contatos: Contato[];
  tarefas: Tarefa[];
  locacoes: Locacao[];
  onCreateLocacao: (data: Partial<Locacao>) => Promise<Locacao>;
  onCreateTarefa: (data: Partial<Tarefa>) => Promise<Tarefa>;
  onCreateContato: (data: Partial<Contato>) => Promise<Contato>;
  onUpdateLocacao: (id: string, data: Partial<Locacao>) => Promise<Locacao>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isAction?: boolean;
}

// Gemini raw content for multi-turn history
type GeminiContent = { role: 'user' | 'model'; parts: any[] };

const QUICK = [
  'Qual foi a receita deste mês?',
  'Quais NFs estão pendentes?',
  'Tarefas em atraso?',
  'Clientes de Curitiba',
  'Qual equipamento rendeu mais?',
];

const TOOL_DECLS = [
  {
    name: 'create_locacao',
    description: 'Cria nova locação de equipamento no sistema CRM',
    parameters: {
      type: Type.OBJECT,
      properties: {
        cliente:      { type: Type.STRING,  description: 'Nome do cliente ou clínica' },
        equipamento:  { type: Type.STRING,  description: 'Nome do equipamento a ser locado' },
        data:         { type: Type.STRING,  description: 'Data da locação no formato YYYY-MM-DD' },
        horario:      { type: Type.STRING,  description: 'Horário no formato HH:MM' },
        cidade:       { type: Type.STRING,  description: 'Cidade onde será realizada' },
        dra:          { type: Type.STRING,  description: 'Nome da doutora/profissional responsável' },
        valor_final:  { type: Type.NUMBER,  description: 'Valor final em reais (número)' },
        observacoes:  { type: Type.STRING,  description: 'Observações adicionais' },
      },
      required: ['cliente', 'equipamento', 'data', 'horario', 'valor_final'],
    },
  },
  {
    name: 'create_tarefa',
    description: 'Cria nova tarefa ou lembrete no sistema',
    parameters: {
      type: Type.OBJECT,
      properties: {
        titulo:     { type: Type.STRING, description: 'Título da tarefa' },
        descricao:  { type: Type.STRING, description: 'Descrição detalhada' },
        vencimento: { type: Type.STRING, description: 'Data de vencimento YYYY-MM-DD' },
        prioridade: { type: Type.STRING, description: 'alta, media ou baixa' },
      },
      required: ['titulo', 'vencimento'],
    },
  },
  {
    name: 'create_contato',
    description: 'Cria novo contato ou lead no CRM',
    parameters: {
      type: Type.OBJECT,
      properties: {
        nome:         { type: Type.STRING, description: 'Nome completo do contato' },
        telefone:     { type: Type.STRING, description: 'Telefone com DDD' },
        email:        { type: Type.STRING, description: 'E-mail do contato' },
        cidade:       { type: Type.STRING, description: 'Cidade' },
        status:       { type: Type.STRING, description: 'hot, warm, cold, active ou lost' },
        equipamentos: { type: Type.STRING, description: 'Equipamentos de interesse' },
        origem:       { type: Type.STRING, description: 'Como conheceu (Instagram, Indicação etc.)' },
        observacoes:  { type: Type.STRING, description: 'Observações adicionais' },
      },
      required: ['nome'],
    },
  },
  {
    name: 'update_nf_status',
    description: 'Marca NF de uma locação como emitida ou pendente',
    parameters: {
      type: Type.OBJECT,
      properties: {
        locacao_id: { type: Type.STRING,  description: 'ID da locação (campo id)' },
        emitida:    { type: Type.BOOLEAN, description: 'true = NF emitida, false = pendente' },
      },
      required: ['locacao_id', 'emitida'],
    },
  },
  {
    name: 'update_locacao_status',
    description: 'Altera o status de uma locação',
    parameters: {
      type: Type.OBJECT,
      properties: {
        locacao_id: { type: Type.STRING, description: 'ID da locação' },
        status:     { type: Type.STRING, description: 'agendado, concluido ou cancelado' },
      },
      required: ['locacao_id', 'status'],
    },
  },
];

export default function AiAssistant({ contatos, tarefas, locacoes, onCreateLocacao, onCreateTarefa, onCreateContato, onUpdateLocacao }: AiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const historyRef = useRef<GeminiContent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiKey = _apiKey;
  const ai = _ai;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: 'Olá! Sou o **Sinnergie AI**, seu assistente inteligente. Posso consultar dados em tempo real, criar locações, tarefas e contatos. Como posso ajudar?',
        timestamp: new Date(),
      }]);
    }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const buildSystemContext = () => {
    const today = new Date().toISOString().split('T')[0];
    const mesAtual = today.slice(0, 7);

    const concluidas = locacoes.filter(l => l.status === 'concluido');
    const doMes = concluidas.filter(l => l.data.startsWith(mesAtual));
    const receitaMes = doMes.reduce((s, l) => s + l.valor_final, 0);
    const receitaTotal = concluidas.reduce((s, l) => s + l.valor_final, 0);
    const nfPendentes = locacoes.filter(l => !l.nf_emitida && l.status === 'concluido');
    const pendentes = tarefas.filter(t => t.status === 'pendente');
    const atrasadas = pendentes.filter(t => t.vencimento < today);

    return `Você é o Sinnergie AI, assistente inteligente integrado ao CRM de locações de equipamentos estéticos da empresa Sinnergie Aesthetic Technologies.

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português brasileiro
- Tom profissional, direto e cordial
- Valores monetários sempre em R$ (ex: R$ 1.500,00)
- Datas sempre em DD/MM/YYYY quando apresentar ao usuário
- Use os IDs exatos do sistema para executar ações
- Ao executar uma ação, confirme o que foi feito de forma clara
- Se não souber o ID de uma locação, pergunte antes de agir

DATA ATUAL: ${today}

RESUMO EXECUTIVO:
- Receita do mês (${mesAtual}): R$ ${receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Receita total (concluídas): R$ ${receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- NFs pendentes de emissão: ${nfPendentes.length}
- Tarefas pendentes: ${pendentes.length} (${atrasadas.length} em atraso)
- Total de contatos: ${contatos.length}
- Total de locações: ${locacoes.length}

CONTATOS NO CRM (${contatos.length}):
${contatos.slice(0, 50).map(c =>
  `[${c.id}] ${c.nome} | ${c.cidade || '—'} | status:${c.status} | ${c.equipamentos || '—'} | tel:${c.telefone || '—'}`
).join('\n')}

LOCAÇÕES (${locacoes.length} total):
${locacoes.slice(0, 50).map(l =>
  `[${l.id}] ${l.data} ${l.horario} | ${l.cliente} | ${l.equipamento} | R$${l.valor_final.toLocaleString('pt-BR')} | ${l.status} | NF:${l.nf_emitida ? 'emitida' : 'pendente'} | ${l.cidade || '—'}`
).join('\n')}

TAREFAS PENDENTES (${pendentes.length}):
${pendentes.slice(0, 20).map(t =>
  `[${t.id}] ${t.titulo} | vence:${t.vencimento} | ${t.prioridade}${t.vencimento < today ? ' ⚠ ATRASADA' : ''}`
).join('\n')}`;
  };

  const executeFn = async (name: string, args: Record<string, any>): Promise<{ ok: boolean; msg: string; data: any }> => {
    try {
      if (name === 'create_locacao') {
        const loc = await onCreateLocacao({
          cliente: args.cliente,
          equipamento: args.equipamento,
          data: args.data,
          horario: args.horario || '09:00',
          cidade: args.cidade || '',
          dra: args.dra || '',
          valor_final: Number(args.valor_final),
          valor_locacao: Number(args.valor_final),
          base_calculo_tipo: 'valor_fixo',
          base_calculo_valor: Number(args.valor_final),
          mao_de_obra: 0,
          deslocamento: 0,
          nf_emitida: false,
          status: 'agendado',
          observacoes: args.observacoes || '',
        });
        return { ok: true, msg: `Locação criada: ${loc.cliente} — ${loc.equipamento}`, data: loc };
      }

      if (name === 'create_tarefa') {
        const tar = await onCreateTarefa({
          titulo: args.titulo,
          descricao: args.descricao || '',
          vencimento: args.vencimento,
          prioridade: (args.prioridade || 'media') as Tarefa['prioridade'],
          status: 'pendente',
        });
        return { ok: true, msg: `Tarefa criada: ${tar.titulo}`, data: tar };
      }

      if (name === 'create_contato') {
        const con = await onCreateContato({
          nome: args.nome,
          telefone: args.telefone || '',
          email: args.email || '',
          cidade: args.cidade || '',
          status: (args.status || 'warm') as Contato['status'],
          equipamentos: args.equipamentos || '',
          origem: args.origem || 'Sinnergie AI',
          observacoes: args.observacoes || '',
        });
        return { ok: true, msg: `Contato criado: ${con.nome}`, data: con };
      }

      if (name === 'update_nf_status') {
        await onUpdateLocacao(args.locacao_id, { nf_emitida: args.emitida });
        return { ok: true, msg: `NF ${args.emitida ? 'marcada como emitida' : 'marcada como pendente'}`, data: { id: args.locacao_id, nf_emitida: args.emitida } };
      }

      if (name === 'update_locacao_status') {
        await onUpdateLocacao(args.locacao_id, { status: args.status });
        return { ok: true, msg: `Status da locação atualizado para "${args.status}"`, data: { id: args.locacao_id, status: args.status } };
      }

      return { ok: false, msg: 'Função desconhecida', data: null };
    } catch (err: any) {
      return { ok: false, msg: `Erro ao executar ${name}: ${err.message}`, data: null };
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || isTyping) return;
    if (!ai) {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: text, timestamp: new Date() },
        { role: 'assistant', content: 'A chave VITE_GEMINI_API_KEY não está configurada corretamente no arquivo .env.', timestamp: new Date() },
      ]);
      return;
    }

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date() }]);
    setIsTyping(true);

    const systemInstruction = buildSystemContext();

    const userPart: GeminiContent = { role: 'user', parts: [{ text }] };
    const contents: GeminiContent[] = [...historyRef.current, userPart];

    try {
      let response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        tools: [{ functionDeclarations: TOOL_DECLS }],
        config: { systemInstruction },
      });

      const rawParts: any[] = response.candidates?.[0]?.content?.parts ?? [];
      const funcCallPart = rawParts.find((p: any) => p.functionCall);

      let assistantText = '';
      let isAction = false;

      if (funcCallPart?.functionCall) {
        const { name, args } = funcCallPart.functionCall;
        const result = await executeFn(name, args ?? {});
        isAction = true;

        const modelTurn: GeminiContent = { role: 'model', parts: rawParts };
        const funcResponseTurn: GeminiContent = {
          role: 'user',
          parts: [{ functionResponse: { name, response: { result: result.data ?? result.msg } } }],
        };

        const response2 = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [...contents, modelTurn, funcResponseTurn],
          config: { systemInstruction },
        });

        assistantText = response2.text ?? result.msg;

        historyRef.current = [
          ...historyRef.current,
          userPart,
          modelTurn,
          funcResponseTurn,
          { role: 'model', parts: [{ text: assistantText }] },
        ];
      } else {
        assistantText = response.text ?? 'Não consegui processar sua mensagem.';
        historyRef.current = [
          ...historyRef.current,
          userPart,
          { role: 'model', parts: rawParts.length ? rawParts : [{ text: assistantText }] },
        ];
      }

      setMessages(prev => [...prev, { role: 'assistant', content: assistantText, timestamp: new Date(), isAction }]);
    } catch (err: any) {
      console.error('Sinnergie AI error:', err);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Erro ao processar: ${err.message ?? 'verifique a chave da API.'}`, timestamp: new Date() },
      ]);
    }

    setIsTyping(false);
  };

  const reset = () => {
    historyRef.current = [];
    setMessages([{
      role: 'assistant',
      content: 'Conversa reiniciada. Como posso ajudar?',
      timestamp: new Date(),
    }]);
  };

  const formatContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  return (
    <>
      {/* ── BOTÃO FLUTUANTE ──────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#7a1c2e] hover:bg-[#6B1424] shadow-2xl shadow-[#7a1c2e]/40 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        title="Sinnergie AI"
      >
        {isOpen
          ? <X className="w-6 h-6 text-white" />
          : <Bot className="w-6 h-6 text-white" />
        }
      </button>

      {/* ── PAINEL DE CHAT ───────────────────────────────────────────── */}
      <div className={`
        fixed bottom-24 right-6 z-50 w-[380px] max-h-[600px] flex flex-col
        bg-white rounded-2xl shadow-2xl border border-gray-100
        transition-all duration-300 origin-bottom-right
        ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
      `}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#7a1c2e] rounded-t-2xl">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-white font-bold text-sm">Sinnergie AI</div>
            <div className="text-white/60 text-[10px]">Powered by Gemini 2.0 Flash</div>
          </div>
          <button
            type="button"
            onClick={reset}
            title="Reiniciar conversa"
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: '380px' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-[#7a1c2e]/10 flex items-center justify-center shrink-0 mt-1 mr-2">
                  <Bot className="w-3.5 h-3.5 text-[#7a1c2e]" />
                </div>
              )}
              <div className={`
                max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-[#7a1c2e] text-white rounded-tr-sm'
                  : msg.isAction
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-tl-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                }
              `}>
                <span dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
                <div className={`text-[10px] mt-1 opacity-50 text-right`}>
                  {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-[#7a1c2e]/10 flex items-center justify-center shrink-0 mt-1 mr-2">
                <Bot className="w-3.5 h-3.5 text-[#7a1c2e]" />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Sugestões rápidas (só aparece quando não há histórico) */}
        {messages.length <= 1 && !isTyping && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {QUICK.map(q => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="text-[11px] px-2.5 py-1 rounded-full bg-[#FBF0F2] text-[#7a1c2e] font-medium hover:bg-[#F5E0E4] transition-colors cursor-pointer border border-[#E8C4CC]"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-[#7a1c2e] transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Pergunte ou peça uma ação…"
              disabled={isTyping}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || isTyping}
              className="p-1.5 rounded-lg bg-[#7a1c2e] hover:bg-[#6B1424] disabled:bg-gray-200 text-white disabled:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {isTyping
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />
              }
            </button>
          </div>
          {!ai && (
            <p className="text-[10px] text-amber-600 mt-1.5 text-center">
              Configure VITE_GEMINI_API_KEY no .env para ativar
            </p>
          )}
        </div>
      </div>
    </>
  );
}
