export const TYPING_TUTOR_WORD_SOURCE_OPTIONS = [
  {
    value: 'learned',
    label: 'Solo palabras aprendidas',
    description: 'Practica exclusivamente el vocabulario que ya marcaste como aprendido.',
  },
  {
    value: 'random',
    label: 'Palabras aleatorias',
    description: 'Carga palabras nuevas desde el banco general y filtra por nivel.',
  },
] as const;

export type TypingTutorWordSource = (typeof TYPING_TUTOR_WORD_SOURCE_OPTIONS)[number]['value'];

export const TYPING_TUTOR_LEVEL_OPTIONS = [
  {
    value: 'Básico',
    label: 'Básico',
    description: 'Vocabulario esencial y frecuente.',
  },
  {
    value: 'Intermedio',
    label: 'Intermedio',
    description: 'Palabras de uso más amplio y contextual.',
  },
  {
    value: 'Avanzado',
    label: 'Avanzado',
    description: 'Vocabulario de mayor complejidad.',
  },
] as const;

export type TypingTutorWordLevel = (typeof TYPING_TUTOR_LEVEL_OPTIONS)[number]['value'];

export type TypingTutorDifficultyLevel = {
  level: number;
  minProcessed: number;
  maxProcessed: number | null;
  displayedWords: number;
  rangeLabel: string;
};

export const TYPING_TUTOR_DIFFICULTY_LEVELS: TypingTutorDifficultyLevel[] = [
  { level: 1, minProcessed: 0, maxProcessed: 7, displayedWords: 1, rangeLabel: '1 a 7 palabras' },
  { level: 2, minProcessed: 8, maxProcessed: 12, displayedWords: 2, rangeLabel: '8 a 12 palabras' },
  { level: 3, minProcessed: 13, maxProcessed: 17, displayedWords: 3, rangeLabel: '13 a 17 palabras' },
  { level: 4, minProcessed: 18, maxProcessed: 20, displayedWords: 4, rangeLabel: '18 a 20 palabras' },
  { level: 5, minProcessed: 21, maxProcessed: 25, displayedWords: 5, rangeLabel: '21 a 25 palabras' },
  { level: 6, minProcessed: 26, maxProcessed: 30, displayedWords: 6, rangeLabel: '26 a 30 palabras' },
  { level: 7, minProcessed: 31, maxProcessed: 35, displayedWords: 7, rangeLabel: '31 a 35 palabras' },
  { level: 8, minProcessed: 36, maxProcessed: 40, displayedWords: 8, rangeLabel: '36 a 40 palabras' },
  { level: 9, minProcessed: 41, maxProcessed: 50, displayedWords: 9, rangeLabel: '41 a 50 palabras' },
  { level: 10, minProcessed: 51, maxProcessed: null, displayedWords: 10, rangeLabel: 'Más de 50 palabras' },
];

export const TYPING_TUTOR_VOCABULARY_THRESHOLDS = {
  intermediate: 15,
  advanced: 35,
} as const;

export type TypingTutorGameWord = {
  id: number;
  word: string;
  translation: string;
  isSentence: boolean;
  level?: TypingTutorWordLevel | null;
};

export type GetTypingTutorWordsInput = {
  source: TypingTutorWordSource;
};

export const DEFAULT_TYPING_TUTOR_SOURCE: TypingTutorWordSource = 'random';

export function getTypingTutorDifficultyProfile(wordsCompleted: number): {
  level: number;
  maxSimultaneous: number;
} {
  const processedWords = Math.max(0, Math.floor(wordsCompleted));
  const matchedLevel =
    TYPING_TUTOR_DIFFICULTY_LEVELS.find(
      (difficulty) =>
        processedWords >= difficulty.minProcessed &&
        (difficulty.maxProcessed === null || processedWords <= difficulty.maxProcessed),
    ) ?? TYPING_TUTOR_DIFFICULTY_LEVELS[TYPING_TUTOR_DIFFICULTY_LEVELS.length - 1];

  return {
    level: matchedLevel.level,
    maxSimultaneous: matchedLevel.displayedWords,
  };
}

export function getTypingTutorVocabularyLevel(wordsCompleted: number): TypingTutorWordLevel {
  const processedWords = Math.max(0, Math.floor(wordsCompleted));

  if (processedWords >= TYPING_TUTOR_VOCABULARY_THRESHOLDS.advanced) {
    return 'Avanzado';
  }

  if (processedWords >= TYPING_TUTOR_VOCABULARY_THRESHOLDS.intermediate) {
    return 'Intermedio';
  }

  return 'Básico';
}
