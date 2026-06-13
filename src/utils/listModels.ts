import { GoogleGenAI } from '@google/genai';

const _key = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

export async function listAvailableModels(): Promise<void> {
  if (!_key || _key.includes('AQUI') || _key === 'undefined') {
    console.warn('[listModels] Chave ausente — abortando');
    return;
  }

  const ai = new GoogleGenAI({ apiKey: _key });

  // 1. Lista oficial via API
  try {
    const page = await ai.models.list();
    const names: string[] = [];
    for await (const m of page) {
      names.push((m as any).name ?? JSON.stringify(m));
    }
    console.log('[listModels] Modelos disponíveis para esta chave:\n' + names.join('\n'));
  } catch (e) {
    console.warn('[listModels] ai.models.list() falhou:', e);
  }

  // 2. Teste individual dos candidatos mais comuns
  const candidates = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-1.0-pro',
    'gemini-pro',
  ];

  for (const model of candidates) {
    try {
      const res = await ai.models.generateContent({ model, contents: 'olá' });
      console.log(`[listModels] ✅ FUNCIONA: ${model} → "${(res.text ?? '').slice(0, 40)}"`);
    } catch (e: any) {
      console.log(`[listModels] ❌ falhou: ${model} → ${e?.message ?? e}`);
    }
  }
}
