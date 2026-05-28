'use server';

import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/authenticated-user';

export async function getWordForDictation(): Promise<{ id: number; palabra: string } | null> {
  try {
    await requireAuthenticatedUser();
    const count = await prisma.word_list.count();
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const word = await prisma.word_list.findFirst({
      skip,
      select: { id: true, palabra: true },
    });
    return word ?? null;
  } catch {
    return null;
  }
}

export async function getSentenceForDictation(): Promise<{ id: number; oracion: string } | null> {
  try {
    await requireAuthenticatedUser();
    const count = await prisma.word_list.count({
      where: {
        AND: [
          { oracion_ejemplo: { not: null } },
          { oracion_ejemplo: { not: '' } },
        ],
      },
    });
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const item = await prisma.word_list.findFirst({
      where: {
        AND: [
          { oracion_ejemplo: { not: null } },
          { oracion_ejemplo: { not: '' } },
        ],
      },
      skip,
      select: { id: true, oracion_ejemplo: true },
    });
    if (!item || !item.oracion_ejemplo) return null;
    return { id: item.id, oracion: item.oracion_ejemplo };
  } catch {
    return null;
  }
}

export async function getWordsForTypingGame(): Promise<{ id: number; word: string; translation: string; isSentence: boolean }[]> {
  try {
    const words = await prisma.word_list.findMany({
      select: { id: true, palabra: true, traduccion_espanol: true, oracion_ejemplo: true },
    });
    if (words.length === 0) return [];
    
    const items = words.flatMap((w) => {
      const list = [{ id: w.id, word: w.palabra, translation: w.traduccion_espanol, isSentence: false }];
      if (w.oracion_ejemplo && w.oracion_ejemplo.trim() !== '') {
        const cleanSentence = w.oracion_ejemplo.trim().replace(/\.$/, ''); // remove trailing dot
        list.push({
          id: w.id + 1000000,
          word: cleanSentence,
          translation: `Ejemplo de: ${w.palabra}`,
          isSentence: true
        });
      }
      return list;
    });

    return items.sort(() => 0.5 - Math.random()).slice(0, 150);
  } catch (err) {
    console.error("Error in getWordsForTypingGame Server Action:", err);
    return [];
  }
}


