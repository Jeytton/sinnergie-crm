import { useState } from 'react';
import { SupabaseConfigStatus } from '../types';
import { crmService } from '../crmService';
import { Check, AlertTriangle, Database, Copy, RefreshCw } from 'lucide-react';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SupabaseConfigStatus;
  onRefresh: () => void;
}

export default function DatabaseModal({ isOpen, onClose, status, onRefresh }: DatabaseModalProps) {
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (!isOpen) return null;

  const sqlScript = crmService.getSupabaseSQLScript();

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-bold text-gray-950">Status de Conexão Supabase</h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status Display Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Integrador Supabase</span>
              <button 
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-md transition-all font-bold disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar Diagnóstico
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
              <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${status.connected ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                  {status.connected ? <Check className="w-4 h-4 text-emerald-700" /> : <AlertTriangle className="w-4 h-4 text-rose-700" />}
                </div>
                <div>
                  <div className="text-xs text-gray-800 font-bold">Link do Projeto URL</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[200px]">https://hjafwucsytjqsbszftyz.supabase.co</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 mt-1">
                    {status.connected ? 'Conectado com Sucesso' : 'Erro de Conectividade'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center ${status.usingFallback ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                  {status.usingFallback ? <AlertTriangle className="w-4 h-4 text-amber-700" /> : <Check className="w-4 h-4 text-emerald-700" />}
                </div>
                <div>
                  <div className="text-xs text-gray-800 font-bold">Armazenamento Ativo</div>
                  <div className="text-[11px] font-extrabold text-emerald-800 mt-0.5">
                    {status.usingFallback ? 'LocalStorage (Modo Cache Local)' : 'Supabase (Nuvem em Tempo Real)'}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {status.usingFallback 
                      ? 'As tabelas ainda não foram criadas no seu banco de dados.' 
                      : 'Todas as tabelas do CRM foram encontradas e estão sintonizadas.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Checklists for Tables */}
            <div className="border-t border-gray-200 pt-3 mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white border border-gray-200 p-2 rounded-lg">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Tabela Contatos</div>
                <div className="flex items-center justify-center gap-1 mt-1 text-xs">
                  {status.contatosOk ? (
                    <span className="text-emerald-600 font-bold">✓ Ativa</span>
                  ) : (
                    <span className="text-rose-500 font-semibold">⚡ Pendente</span>
                  )}
                </div>
              </div>

              <div className="bg-white border border-gray-200 p-2 rounded-lg">
                <div className="text-[10px] text-gray-550 uppercase tracking-wider font-bold">Tabela Tarefas</div>
                <div className="flex items-center justify-center gap-1 mt-1 text-xs">
                  {status.tarefasOk ? (
                    <span className="text-emerald-600 font-bold">✓ Ativa</span>
                  ) : (
                    <span className="text-rose-500 font-semibold">⚡ Pendente</span>
                  )}
                </div>
              </div>

              <div className="bg-white border border-gray-200 p-2 rounded-lg">
                <div className="text-[10px] text-gray-550 uppercase tracking-wider font-bold">Tabela Locações</div>
                <div className="flex items-center justify-center gap-1 mt-1 text-xs">
                  {status.locacoesOk ? (
                    <span className="text-emerald-600 font-bold">✓ Ativa</span>
                  ) : (
                    <span className="text-rose-500 font-semibold">⚡ Pendente</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Setup tutorial instructions */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-5 h-5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded flex items-center justify-center text-xs font-bold font-mono">1</span>
              Como Inicializar seu Supabase em 30 segundos:
            </h4>
            <ol className="text-xs text-gray-500 space-y-2 list-decimal list-inside pl-1">
              <li>Acesse o dashboard do seu Supabase (<a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline font-bold hover:text-emerald-700">https://supabase.com</a>).</li>
              <li>Entre no seu projeto <strong className="text-gray-900">hjafwucsytjqsbszftyz</strong>.</li>
              <li>No menu lateral esquerdo, clique em <strong className="text-gray-900">SQL Editor</strong> e depois em <strong className="text-gray-900">New query</strong>.</li>
              <li>Copie o script abaixo, cole no editor e clique no botão <strong className="text-emerald-600 font-bold">Run</strong> no canto inferior direito.</li>
              <li>Pronto! Clique em "Atualizar Diagnóstico" aqui para conectar as tabelas do CRM.</li>
            </ol>
          </div>

          {/* SQL Editor Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Script SQL de Instalação</label>
              <button 
                type="button" 
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-all font-bold cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-600" />
                {copied ? 'Copiado!' : 'Copiar Script SQL'}
              </button>
            </div>
            <pre className="p-4 bg-gray-900 text-gray-100 border border-gray-800 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[220px] select-all leading-relaxed whitespace-pre scrollbar-thin">
              {sqlScript}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          <button 
            type="button" 
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-[#8B1A2E] hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-all cursor-pointer text-center"
          >
            Entendido, Retornar ao CRM
          </button>
        </div>
      </div>
    </div>
  );
}
