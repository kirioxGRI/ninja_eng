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
