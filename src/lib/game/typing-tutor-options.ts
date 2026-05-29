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

export type TypingTutorGameWord = {
  id: number;
  word: string;
  translation: string;
  isSentence: boolean;
};

export type GetTypingTutorWordsInput = {
  source: TypingTutorWordSource;
  level?: TypingTutorWordLevel;
};

export const DEFAULT_TYPING_TUTOR_SOURCE: TypingTutorWordSource = 'random';
export const DEFAULT_TYPING_TUTOR_LEVEL: TypingTutorWordLevel = 'Básico';
export const TYPING_TUTOR_WORD_LIMIT = 150;

