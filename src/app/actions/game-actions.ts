'use server';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/authenticated-user';
import {
  DEFAULT_TYPING_TUTOR_LEVEL,
  TYPING_TUTOR_WORD_LIMIT,
  type GetTypingTutorWordsInput,
  type TypingTutorGameWord,
} from '@/lib/game/typing-tutor-options';

const TYPING_TUTOR_GAME_NAME = 'typing_tutor';

type RankingDbClient = Prisma.TransactionClient | typeof prisma;

type RankingHistoryRecord = {
  id: number;
  player_id: number;
  ranking: number;
  score: number | null;
  ranking_date: Date | null;
  usuario: {
    id: number;
    nombre: string;
  };
};

export type TypingTutorRankingEntry = {
  entryId: number;
  playerId: number;
  playerName: string;
  ranking: number;
  score: number | null;
  rankingDate: string | null;
};

export type TypingTutorRankingSummary = {
  latestResult: TypingTutorRankingEntry | null;
  playerBest: TypingTutorRankingEntry | null;
  globalBest: TypingTutorRankingEntry | null;
  totalResults: number;
};

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

function shuffleWords<T>(items: T[]): T[] {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function mapRankingRow(row: RankingHistoryRecord | null | undefined): TypingTutorRankingEntry | null {
  if (!row) return null;

  return {
    entryId: row.id,
    playerId: row.player_id,
    playerName: row.usuario.nombre,
    ranking: row.ranking,
    score: row.score,
    rankingDate: row.ranking_date ? row.ranking_date.toISOString() : null,
  };
}

async function getTypingTutorGameId(db: RankingDbClient): Promise<number> {
  const game = await db.game_catalog.findFirst({
    where: {
      name: TYPING_TUTOR_GAME_NAME,
      OR: [{ is_active: true }, { is_active: null }],
    },
    select: {
      id: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  if (!game) {
    throw new Error('Juego Typing Tutor no encontrado en game_catalog.');
  }

  return game.id;
}

async function buildTypingTutorRankingSummary(
  db: RankingDbClient,
  gameId: number,
  playerId: number,
  latestEntryId: number,
): Promise<TypingTutorRankingSummary> {
  const includePlayer = {
    usuario: {
      select: {
        id: true,
        nombre: true,
      },
    },
  } as const;

  const rankingOrderBy = [
    { ranking: 'asc' as const },
    { score: 'desc' as const },
    { ranking_date: 'asc' as const },
    { id: 'asc' as const },
  ];

  const [latestRow, playerBestRow, globalBestRow, totalResults] = await Promise.all([
    db.player_game_ranking_history.findUnique({
      where: {
        id: latestEntryId,
      },
      include: includePlayer,
    }),
    db.player_game_ranking_history.findFirst({
      where: {
        game_id: gameId,
        player_id: playerId,
      },
      orderBy: rankingOrderBy,
      include: includePlayer,
    }),
    db.player_game_ranking_history.findFirst({
      where: {
        game_id: gameId,
      },
      orderBy: rankingOrderBy,
      include: includePlayer,
    }),
    db.player_game_ranking_history.count({
      where: {
        game_id: gameId,
      },
    }),
  ]);

  return {
    latestResult: mapRankingRow(latestRow),
    playerBest: mapRankingRow(playerBestRow),
    globalBest: mapRankingRow(globalBestRow),
    totalResults,
  };
}

export async function submitTypingTutorResult(score: number): Promise<TypingTutorRankingSummary> {
  const authenticatedUser = await requireAuthenticatedUser();
  const normalizedScore = Number.isFinite(score) ? Math.max(0, Math.round(score)) : 0;

  return prisma.$transaction(async (tx) => {
    const gameId = await getTypingTutorGameId(tx);

    const insertedEntry = await tx.player_game_ranking_history.create({
      data: {
        game_id: gameId,
        player_id: authenticatedUser.id,
        ranking: 0,
        score: normalizedScore,
      },
      select: {
        id: true,
      },
    });

    await tx.$executeRaw`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            ORDER BY score DESC NULLS LAST, ranking_date ASC NULLS LAST, id ASC
          ) AS next_ranking
        FROM public.player_game_ranking_history
        WHERE game_id = ${gameId}
      )
      UPDATE public.player_game_ranking_history AS history
      SET ranking = ranked.next_ranking
      FROM ranked
      WHERE history.id = ranked.id
    `;

    return buildTypingTutorRankingSummary(tx, gameId, authenticatedUser.id, insertedEntry.id);
  });
}

export async function getWordsForTypingGame(input: GetTypingTutorWordsInput): Promise<TypingTutorGameWord[]> {
  try {
    const authenticatedUser = await requireAuthenticatedUser();

    if (input.source === 'learned') {
      const learnedRecords = await prisma.usuario_avance_palabra.findMany({
        where: {
          usuario_id: authenticatedUser.id,
          aprendida: true,
        },
        include: {
          word_list: {
            select: {
              id: true,
              palabra: true,
              traduccion_espanol: true,
            },
          },
        },
        orderBy: {
          fecha_aprendida: 'desc',
        },
      });

      const learnedWords: TypingTutorGameWord[] = learnedRecords.map((record) => ({
        id: record.word_list.id,
        word: record.word_list.palabra,
        translation: record.word_list.traduccion_espanol,
        isSentence: false,
      }));

      return shuffleWords(learnedWords).slice(0, TYPING_TUTOR_WORD_LIMIT);
    }

    const selectedLevel = input.level ?? DEFAULT_TYPING_TUTOR_LEVEL;
    const randomWords = await prisma.word_list.findMany({
      where: {
        nivel: {
          equals: selectedLevel,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        palabra: true,
        traduccion_espanol: true,
      },
    });

    return shuffleWords(randomWords).slice(0, TYPING_TUTOR_WORD_LIMIT).map((word) => ({
      id: word.id,
      word: word.palabra,
      translation: word.traduccion_espanol,
      isSentence: false,
    }));
  } catch (err) {
    console.error("Error in getWordsForTypingGame Server Action:", err);
    return [];
  }
}
