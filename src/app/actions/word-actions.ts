'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ─── Tipos ────────────────────────────────────────────────
export type WordWithProgress = {
  id: number;
  palabra: string;
  pronunciacion: string | null;
  traduccion_espanol: string;
  oracion_ejemplo: string | null;
  creado_en: Date | null;
  aprendida: boolean;
  mostrada: boolean;
};

// ─── Obtener stats del usuario ─────────────────────────────
export async function getUserStats(usuarioId: number) {
  try {
    const [totalPalabras, aprendidas, mostradas] = await Promise.all([
      prisma.word_list.count(),
      prisma.usuario_avance_palabra.count({
        where: { usuario_id: usuarioId, aprendida: true },
      }),
      prisma.usuario_avance_palabra.count({
        where: { usuario_id: usuarioId, mostrada: true },
      }),
    ]);
    return { totalPalabras, aprendidas, mostradas };
  } catch {
    return { totalPalabras: 0, aprendidas: 0, mostradas: 0 };
  }
}

// ─── IDs de palabras ya aprendidas por el usuario ─────────
async function getLearnedWordIds(usuarioId: number): Promise<number[]> {
  const records = await prisma.usuario_avance_palabra.findMany({
    where: { usuario_id: usuarioId, aprendida: true },
    select: { palabra_id: true },
  });
  return records.map((r) => r.palabra_id);
}

// ─── Obtener palabra aleatoria ─────────────────────────────
export async function getRandomWord(usuarioId: number): Promise<WordWithProgress | null> {
  try {
    const learnedIds = await getLearnedWordIds(usuarioId);
    const where = learnedIds.length > 0 ? { id: { notIn: learnedIds } } : {};
    const count = await prisma.word_list.count({ where });
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const word = await prisma.word_list.findFirst({ where, skip });
    if (!word) return null;
    await markWordAsShown(usuarioId, word.id);
    const avance = await prisma.usuario_avance_palabra.findUnique({
      where: { usuario_id_palabra_id: { usuario_id: usuarioId, palabra_id: word.id } },
    });
    return { ...word, aprendida: avance?.aprendida ?? false, mostrada: avance?.mostrada ?? false };
  } catch {
    return null;
  }
}

// ─── Obtener palabra por ID ────────────────────────────────
export async function getWordById(id: number, usuarioId: number): Promise<WordWithProgress | null> {
  try {
    const word = await prisma.word_list.findUnique({ where: { id } });
    if (!word) return null;
    await markWordAsShown(usuarioId, word.id);
    const avance = await prisma.usuario_avance_palabra.findUnique({
      where: { usuario_id_palabra_id: { usuario_id: usuarioId, palabra_id: word.id } },
    });
    return { ...word, aprendida: avance?.aprendida ?? false, mostrada: avance?.mostrada ?? false };
  } catch {
    return null;
  }
}

// ─── Siguiente palabra ─────────────────────────────────────
export async function getNextWord(currentId: number, usuarioId: number): Promise<WordWithProgress | null> {
  try {
    const learnedIds = await getLearnedWordIds(usuarioId);
    const where = {
      id: { gt: currentId, ...(learnedIds.length > 0 ? { notIn: learnedIds } : {}) },
    };
    const word = await prisma.word_list.findFirst({ where, orderBy: { id: 'asc' } });
    if (!word) return null;
    await markWordAsShown(usuarioId, word.id);
    const avance = await prisma.usuario_avance_palabra.findUnique({
      where: { usuario_id_palabra_id: { usuario_id: usuarioId, palabra_id: word.id } },
    });
    return { ...word, aprendida: avance?.aprendida ?? false, mostrada: avance?.mostrada ?? false };
  } catch {
    return null;
  }
}

// ─── Palabra anterior ──────────────────────────────────────
export async function getPrevWord(currentId: number, usuarioId: number): Promise<WordWithProgress | null> {
  try {
    const learnedIds = await getLearnedWordIds(usuarioId);
    const where = {
      id: { lt: currentId, ...(learnedIds.length > 0 ? { notIn: learnedIds } : {}) },
    };
    const word = await prisma.word_list.findFirst({ where, orderBy: { id: 'desc' } });
    if (!word) return null;
    await markWordAsShown(usuarioId, word.id);
    const avance = await prisma.usuario_avance_palabra.findUnique({
      where: { usuario_id_palabra_id: { usuario_id: usuarioId, palabra_id: word.id } },
    });
    return { ...word, aprendida: avance?.aprendida ?? false, mostrada: avance?.mostrada ?? false };
  } catch {
    return null;
  }
}

// ─── Marcar como mostrada ──────────────────────────────────
async function markWordAsShown(usuarioId: number, palabraId: number) {
  try {
    await prisma.usuario_avance_palabra.upsert({
      where: { usuario_id_palabra_id: { usuario_id: usuarioId, palabra_id: palabraId } },
      create: {
        usuario_id: usuarioId,
        palabra_id: palabraId,
        mostrada: true,
        fecha_mostrada: new Date(),
      },
      update: {
        mostrada: true,
        fecha_mostrada: new Date(),
      },
    });
  } catch {
    // silent
  }
}

// ─── Marcar como aprendida ─────────────────────────────────
export async function markWordAsLearned(usuarioId: number, palabraId: number) {
  try {
    await prisma.usuario_avance_palabra.upsert({
      where: { usuario_id_palabra_id: { usuario_id: usuarioId, palabra_id: palabraId } },
      create: {
        usuario_id: usuarioId,
        palabra_id: palabraId,
        mostrada: true,
        aprendida: true,
        fecha_mostrada: new Date(),
        fecha_aprendida: new Date(),
      },
      update: {
        aprendida: true,
        fecha_aprendida: new Date(),
      },
    });
    revalidatePath('/dashboard/aprender');
    return { success: true };
  } catch {
    return { error: 'Error al marcar como aprendida.' };
  }
}

// ─── Desmarcar aprendida ───────────────────────────────────
export async function unmarkWordAsLearned(usuarioId: number, palabraId: number) {
  try {
    await prisma.usuario_avance_palabra.upsert({
      where: { usuario_id_palabra_id: { usuario_id: usuarioId, palabra_id: palabraId } },
      create: {
        usuario_id: usuarioId,
        palabra_id: palabraId,
        mostrada: true,
        aprendida: false,
      },
      update: {
        aprendida: false,
        fecha_aprendida: null,
      },
    });
    revalidatePath('/dashboard/aprender');
    return { success: true };
  } catch {
    return { error: 'Error al desmarcar.' };
  }
}

// ─── Buscar palabra por texto (para tooltip/modal) ─────────
export async function findWordByText(texto: string) {
  try {
    const normalized = texto.toLowerCase().replace(/[^a-z]/g, '');
    const word = await prisma.word_list.findFirst({
      where: { palabra: { equals: normalized, mode: 'insensitive' } },
    });
    return word;
  } catch {
    return null;
  }
}

// ─── Crear palabra ─────────────────────────────────────────
export async function createWord(data: {
  palabra: string;
  pronunciacion?: string;
  traduccion_espanol: string;
  oracion_ejemplo?: string;
}) {
  if (!data.palabra?.trim()) return { error: 'La palabra es obligatoria.' };
  if (!data.traduccion_espanol?.trim()) return { error: 'La traducción es obligatoria.' };
  try {
    const word = await prisma.word_list.create({
      data: {
        palabra: data.palabra.trim().toLowerCase(),
        pronunciacion: data.pronunciacion?.trim() || null,
        traduccion_espanol: data.traduccion_espanol.trim(),
        oracion_ejemplo: data.oracion_ejemplo?.trim() || null,
      },
    });
    revalidatePath('/dashboard/configurar');
    return { word };
  } catch {
    return { error: 'La palabra ya existe o hubo un error.' };
  }
}
