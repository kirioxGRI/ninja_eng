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
// Excluye palabras ya vistas O aprendidas (cualquier registro en usuario_avance_palabra)
async function getExcludedWordIds(usuarioId: number): Promise<number[]> {
  const records = await prisma.usuario_avance_palabra.findMany({
    where: { usuario_id: usuarioId },
    select: { palabra_id: true },
  });
  return records.map((r) => r.palabra_id);
}

// ─── Obtener palabra aleatoria ─────────────────────────────
export async function getRandomWord(usuarioId: number): Promise<WordWithProgress | null> {
  try {
    const excludedIds = await getExcludedWordIds(usuarioId);
    const where = excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {};
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
    const excludedIds = await getExcludedWordIds(usuarioId);
    const where = {
      id: { gt: currentId, ...(excludedIds.length > 0 ? { notIn: excludedIds } : {}) },
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
    const excludedIds = await getExcludedWordIds(usuarioId);
    const where = {
      id: { lt: currentId, ...(excludedIds.length > 0 ? { notIn: excludedIds } : {}) },
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

export type TooltipWordLookup = {
  palabra: string;
  pronunciacion: string | null;
  traduccion_espanol: string;
  source: 'word_list' | 'ia_word';
};

const DEFAULT_TOOLTIP_AI_USER_ID = 1;

export async function findTooltipWordByText(texto: string): Promise<TooltipWordLookup | null> {
  try {
    const normalized = texto.toLowerCase().replace(/[^a-z]/g, '');
    if (!normalized) return null;

    const wordListRows = await prisma.$queryRaw<TooltipWordLookup[]>`
      select
        palabra,
        pronunciacion,
        traduccion_espanol,
        'word_list'::text as source
      from public.word_list
      where lower(palabra) = ${normalized}
      limit 1
    `;

    if (wordListRows.length > 0) return wordListRows[0];

    const iaWordRows = await prisma.$queryRaw<TooltipWordLookup[]>`
      select
        palabra,
        pronunciacion,
        traduccion_espanol,
        'ia_word'::text as source
      from public.ia_word
      where lower(palabra) = ${normalized}
      limit 1
    `;

    return iaWordRows[0] ?? null;
  } catch {
    return null;
  }
}

export async function saveTooltipAiWord(texto: string, traduccion: string) {
  try {
    const normalized = texto.toLowerCase().replace(/[^a-z]/g, '');
    const cleanTranslation = traduccion.trim();

    if (!normalized || !cleanTranslation) {
      return { error: 'Datos inválidos.' };
    }

    const existingRows = await prisma.$queryRaw<Array<{ id: number }>>`
      select id
      from public.ia_word
      where lower(palabra) = ${normalized}
      order by id asc
      limit 1
    `;

    if (existingRows.length > 0) {
      await prisma.$executeRaw`
        update public.ia_word
        set usuario_id = ${DEFAULT_TOOLTIP_AI_USER_ID}
        where id = ${existingRows[0].id}
      `;
    } else {
      await prisma.$executeRaw`
        insert into public.ia_word (palabra, traduccion_espanol, usuario_id)
        values (${normalized}, ${cleanTranslation}, ${DEFAULT_TOOLTIP_AI_USER_ID})
      `;
    }

    return { success: true };
  } catch {
    return { error: 'No se pudo guardar la traducción IA.' };
  }
}

// ─── Palabras vistas (mostrada=true, aprendida=false) ──────
export type SeenWordItem = {
  palabraId: number;
  palabra: string;
  traduccion: string;
};

export async function getSeenWords(usuarioId: number): Promise<SeenWordItem[]> {
  try {
    const records = await prisma.usuario_avance_palabra.findMany({
      where: { usuario_id: usuarioId, mostrada: true, aprendida: false },
      include: { word_list: { select: { id: true, palabra: true, traduccion_espanol: true } } },
      orderBy: { fecha_mostrada: 'desc' },
    });
    return records.map((r) => ({
      palabraId: r.word_list.id,
      palabra: r.word_list.palabra,
      traduccion: r.word_list.traduccion_espanol,
    }));
  } catch {
    return [];
  }
}

// Elimina el registro completamente → la palabra vuelve a estar disponible
export async function removeSeenWord(usuarioId: number, palabraId: number) {
  try {
    await prisma.usuario_avance_palabra.delete({
      where: { usuario_id_palabra_id: { usuario_id: usuarioId, palabra_id: palabraId } },
    });
    revalidatePath('/dashboard/aprender');
    return { success: true };
  } catch {
    return { error: 'Error al remover palabra vista.' };
  }
}

export async function resetAllSeenWords(usuarioId: number) {
  try {
    await prisma.usuario_avance_palabra.deleteMany({
      where: {
        usuario_id: usuarioId,
        mostrada: true,
        OR: [{ aprendida: false }, { aprendida: null }],
      },
    });
    revalidatePath('/dashboard/aprender');
    return { success: true };
  } catch {
    return { error: 'Error al resetear palabras vistas.' };
  }
}

// ─── Obtener palabras aprendidas del usuario ───────────────
export type LearnedWordItem = {
  palabraId: number;
  palabra: string;
  traduccion: string;
};

export async function getLearnedWords(usuarioId: number): Promise<LearnedWordItem[]> {
  try {
    const records = await prisma.usuario_avance_palabra.findMany({
      where: { usuario_id: usuarioId, aprendida: true },
      include: { word_list: { select: { id: true, palabra: true, traduccion_espanol: true } } },
      orderBy: { fecha_aprendida: 'desc' },
    });
    return records.map((r) => ({
      palabraId: r.word_list.id,
      palabra: r.word_list.palabra,
      traduccion: r.word_list.traduccion_espanol,
    }));
  } catch {
    return [];
  }
}

// ─── Reset todas las palabras aprendidas ───────────────────
export async function resetAllLearnedWords(usuarioId: number) {
  try {
    await prisma.usuario_avance_palabra.updateMany({
      where: { usuario_id: usuarioId, aprendida: true },
      data: { aprendida: false, fecha_aprendida: null },
    });
    revalidatePath('/dashboard/aprender');
    return { success: true };
  } catch {
    return { error: 'Error al resetear palabras.' };
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
