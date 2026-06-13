import { GoogleGenAI } from '@google/genai';
import { Contato, Tarefa, Locacao } from './types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const MODEL = 'gemini-2.0-flash';

async function generate(prompt: string): Promise<string> {
  if (!ai) throw new Error('VITE_GEMINI_API_KEY não configurada no arquivo .env');
  const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
  return response.text ?? '';
}

export const geminiService = {
  isAvailable(): boolean {
    return !!apiKey;
  },

  async suggestFollowUp(contato: Contato): Promise<string> {
    const prompt = `Você é um assistente comercial especializado em estética médica e aluguel de equipamentos de alto valor (Ultraformer, Endolaser, CO2, Vectus).
Analise o perfil deste contato e sugira uma ação de follow-up e uma mensagem de WhatsApp pronta para enviar.

PERFIL DO CONTATO:
- Nome: ${contato.nome}
- Cidade: ${contato.cidade || 'Não informada'}
- Status no pipeline: ${contato.status}
- Tipo: ${contato.tipo || 'Não informado'}
- Especialidade: ${contato.especialidade || 'Não informada'}
- Equipamentos de interesse: ${contato.equipamentos || 'Não informado'}
- Próximo follow-up agendado: ${contato.prox_follow_up || 'Não agendado'}
- Observações: ${contato.observacoes || 'Nenhuma'}

Responda em português brasileiro com:
1. **Ação recomendada** (1-2 frases objetivas)
2. **Mensagem de WhatsApp** (texto pronto para copiar e enviar, tom profissional e cordial, inicie com "Olá [nome]")`;

    return generate(prompt);
  },

  async analyzeLead(contato: Contato): Promise<string> {
    const prompt = `Você é um especialista sênior em vendas de equipamentos estéticos de alto valor.
Analise este lead e forneça uma avaliação comercial objetiva.

PERFIL DO LEAD:
- Nome: ${contato.nome}
- Cidade: ${contato.cidade || 'Não informada'}
- Status: ${contato.status}
- Tipo: ${contato.tipo || 'Não informado'}
- Especialidade: ${contato.especialidade || 'Não informada'}
- Equipamentos de interesse: ${contato.equipamentos || 'Não informado'}
- Etiquetas: ${contato.etiquetas || 'Nenhuma'}
- Observações: ${contato.observacoes || 'Nenhuma'}

Responda em português com:
1. **Score de probabilidade de fechamento** (0–100% com justificativa em 1 frase)
2. **Pontos fortes** (até 3 bullets)
3. **Objeções prováveis** (até 3 bullets)
4. **Próximos 3 passos** (bullets numerados e acionáveis)`;

    return generate(prompt);
  },

  async dailySummary(tarefas: Tarefa[], locacoes: Locacao[]): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const overdue = tarefas.filter(t => t.status === 'pendente' && t.vencimento < today);
    const dueToday = tarefas.filter(t => t.status === 'pendente' && t.vencimento === today);
    const urgentTasks = tarefas.filter(t => t.status === 'pendente' && t.prioridade === 'alta');
    const todayRentals = locacoes.filter(l => l.data === today && l.status === 'agendado');

    const prompt = `Você é um assistente executivo de uma empresa de aluguel de equipamentos estéticos.
Faça um resumo executivo do dia em português brasileiro, conciso e orientado a ação.

SITUAÇÃO ATUAL (${today}):
- Tarefas atrasadas: ${overdue.length}${overdue.length > 0 ? '\n' + overdue.slice(0, 3).map(t => `  • ${t.titulo} (venceu ${t.vencimento})`).join('\n') : ''}
- Tarefas para hoje: ${dueToday.length}${dueToday.length > 0 ? '\n' + dueToday.map(t => `  • ${t.titulo}`).join('\n') : ''}
- Tarefas de alta prioridade pendentes: ${urgentTasks.length}
- Locações agendadas hoje: ${todayRentals.length}${todayRentals.length > 0 ? '\n' + todayRentals.map(l => `  • ${l.cliente} — ${l.equipamento} às ${l.horario}`).join('\n') : ''}

Crie um resumo executivo com:
1. **Situação do dia** (2-3 frases)
2. **Prioridade #1** (a coisa mais importante a fazer agora)
3. **Alertas** (somente se houver atrasos ou riscos reais)

Seja direto. Use linguagem de negócios. Máximo 150 palavras.`;

    return generate(prompt);
  }
};
