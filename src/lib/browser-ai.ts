// lib/browser-ai.ts

export const AI_UNAVAILABLE = '__AI_NO_DISPONIBLE__';

type WindowWithAI = Window & {
  ai?: {
    languageModel?: {
      create: (opts?: object) => Promise<{ prompt: (text: string) => Promise<string> }>;
    };
    createTextSession?: () => Promise<{ prompt: (text: string) => Promise<string> }>;
  };
};

/**
 * Generates a sentence using Chrome's built-in window.ai.
 * Returns AI_UNAVAILABLE if the API is not present or fails.
 */
export async function generateExampleSentence(word: string): Promise<string> {
  try {
    const w = window as WindowWithAI;
    const ai = w.ai;
    if (!ai) return AI_UNAVAILABLE;

    // Chrome 127+ uses ai.languageModel.create()
    if (ai.languageModel?.create) {
      const session = await ai.languageModel.create();
      const result = await session.prompt(
        `Write one short, natural English sentence that uses the word "${word}" meaningfully. Return the sentence only, no explanation.`
      );
      if (result?.trim()) return result.trim();
    }

    // Older Chrome flag used ai.createTextSession()
    if (ai.createTextSession) {
      const session = await ai.createTextSession();
      const result = await session.prompt(
        `Write one short, natural English sentence that uses the word "${word}" meaningfully. Return the sentence only, no explanation.`
      );
      if (result?.trim()) return result.trim();
    }

    return AI_UNAVAILABLE;
  } catch {
    return AI_UNAVAILABLE;
  }
}
