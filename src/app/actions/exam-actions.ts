// src/app/actions/exam-actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { checkTranslation } from '@/lib/normalize';
import { revalidatePath } from 'next/cache';

export type ExamWord = {
  id: number;
  palabra: string;
};

export type ExamSubmissionResult = {
  success: boolean;
  totalQuestions: number;
  correctCount: number;
  detailedResults: {
    wordId: number;
    palabra: string;
    userAnswer: string;
    correctTranslations: string;
    isCorrect: boolean;
  }[];
  error?: string;
};

/**
 * Returns how many words the user has marked as learned (exam pool size).
 */
export async function getLearnedWordsCount(
  usuarioId: number
): Promise<number> {
  try {
    return await prisma.usuario_avance_palabra.count({
      where: { usuario_id: usuarioId, aprendida: true },
    });
  } catch {
    return 0;
  }
}

/**
 * Fetches N random words from the user's learned words pool for the exam.
 * Returns only IDs and English words to keep translations server-side.
 */
export async function getRandomWordsForExam(
  usuarioId: number,
  count: number
): Promise<{ success: boolean; words: ExamWord[]; error?: string }> {
  try {
    const learnedRecords = await prisma.usuario_avance_palabra.findMany({
      where: { usuario_id: usuarioId, aprendida: true },
      include: { word_list: true },
    });

    if (learnedRecords.length === 0) {
      return {
        success: false,
        words: [],
        error: 'No tienes palabras marcadas como aprendidas. ¡Aprende algunas palabras primero en la sección Aprender!',
      };
    }

    // Fisher-Yates shuffle
    const shuffled = [...learnedRecords];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    return {
      success: true,
      words: selected.map((r) => ({ id: r.word_list.id, palabra: r.word_list.palabra })),
    };
  } catch (err) {
    console.error('Error in getRandomWordsForExam:', err);
    return { success: false, words: [], error: 'Error al obtener palabras para el examen.' };
  }
}

/**
 * Evaluates the submitted answers for the exam, records the results,
 * and marks correct answers as learned for the user.
 */
export async function submitExamResult(
  usuarioId: number,
  submissions: { wordId: number; answer: string }[]
): Promise<ExamSubmissionResult> {
  try {
    if (!submissions || submissions.length === 0) {
      return { success: false, totalQuestions: 0, correctCount: 0, detailedResults: [], error: 'No se enviaron respuestas.' };
    }

    // Fetch the correct translations for the submitted word IDs
    const wordIds = submissions.map((s) => s.wordId);
    const dbWords = await prisma.word_list.findMany({
      where: { id: { in: wordIds } },
    });

    const wordsMap = new Map(dbWords.map((w) => [w.id, w]));
    let correctCount = 0;
    const detailedResults = [];

    // Grade each submission
    for (const sub of submissions) {
      const dbWord = wordsMap.get(sub.wordId);
      if (!dbWord) continue;

      const isCorrect = checkTranslation(sub.answer, dbWord.traduccion_espanol);
      if (isCorrect) {
        correctCount++;
      }

      detailedResults.push({
        wordId: sub.wordId,
        palabra: dbWord.palabra,
        userAnswer: sub.answer,
        correctTranslations: dbWord.traduccion_espanol,
        isCorrect,
      });
    }

    // Save in word_learned table
    await prisma.word_learned.create({
      data: {
        usuario_id: usuarioId,
        cantidad_palabras_examinadas: submissions.length,
        cantidad_palabras_aprendidas: correctCount,
        fecha_examen: new Date(),
      },
    });

    // Update usuario_avance_palabra for CORRECT answers only
    const correctSubmissions = detailedResults.filter((r) => r.isCorrect);
    for (const correct of correctSubmissions) {
      await prisma.usuario_avance_palabra.upsert({
        where: {
          usuario_id_palabra_id: {
            usuario_id: usuarioId,
            palabra_id: correct.wordId,
          },
        },
        create: {
          usuario_id: usuarioId,
          palabra_id: correct.wordId,
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
    }

    // Revalidate learning path stats
    revalidatePath('/dashboard/aprender');

    return {
      success: true,
      totalQuestions: submissions.length,
      correctCount,
      detailedResults,
    };
  } catch (err) {
    console.error('Error in submitExamResult:', err);
    return {
      success: false,
      totalQuestions: 0,
      correctCount: 0,
      detailedResults: [],
      error: 'Error interno al procesar el examen.',
    };
  }
}
