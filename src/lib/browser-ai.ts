// lib/browser-ai.ts

export const AI_UNAVAILABLE = '__AI_NO_DISPONIBLE__';

interface LMSession {
  promptStreaming: (input: string) => ReadableStream<string>;
  destroy: () => void;
}

interface LanguageModel {
  create: (opts?: {
    expectedInputs?: Array<{ type: string; languages?: string[] }>;
    expectedOutputs?: Array<{ type: string; languages?: string[] }>;
    initialPrompts?: Array<{ role: string; content: string }>;
  }) => Promise<LMSession>;
}

function getLanguageModel(): LanguageModel | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { LanguageModel?: LanguageModel }).LanguageModel ?? null;
}

export function isAiAvailable(): boolean {
  const lm = getLanguageModel();
  return lm !== null && typeof lm.create === 'function';
}

/**
 * Generates an English sentence using Chrome's built-in LanguageModel (Gemini Nano).
 * Returns AI_UNAVAILABLE if the API is not present or fails.
 * onChunk is called incrementally as the response streams in.
 */
export async function generateExampleSentence(
  word: string,
  onChunk?: (partial: string) => void,
): Promise<string> {
  const lm = getLanguageModel();
  if (!lm) return AI_UNAVAILABLE;

  let session: LMSession | null = null;
  try {
    session = await lm.create({
      expectedInputs:  [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
      initialPrompts:  [{ role: 'system', content: 'You write short, natural English example sentences for vocabulary learning. Return the sentence only, no explanation, no quotes.' }],
    });

    const stream = session.promptStreaming(
      `Write one short, natural English sentence that uses the word "${word}" meaningfully.`
    );

    const reader = stream.getReader();
    let accumulated = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      accumulated += value;
      onChunk?.(cleanText(accumulated));
    }

    reader.releaseLock();
    return cleanText(accumulated) || AI_UNAVAILABLE;
  } catch {
    return AI_UNAVAILABLE;
  } finally {
    session?.destroy();
  }
}

function cleanText(raw: string): string {
  return raw
    .trim()
    .replace(/\*{1,3}([^*]*)\*{1,3}/g, '$1')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
