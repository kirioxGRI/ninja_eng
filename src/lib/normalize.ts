// src/lib/normalize.ts

/**
 * Normalizes text for comparison:
 * - Trims outer whitespace and collapses multiple spaces.
 * - Converts to lowercase.
 * - Removes accents / diacritics (e.g. á -> a, é -> e, etc.) but keeps core characters.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/\s+/g, ' '); // collapse spaces
}

/**
 * Checks if a user's answer matches the target translation.
 * The target translation can contain multiple options separated by slashes (e.g., "un / una").
 */
export function checkTranslation(userAnswer: string, targetTranslation: string): boolean {
  const normUser = normalizeText(userAnswer);
  if (!normUser) return false;

  // Split target by slashes and normalize each part
  const options = targetTranslation
    .split('/')
    .map((option) => normalizeText(option))
    .filter(Boolean);

  // Checks if the normalized user answer matches any of the normalized options exactly
  return options.some((opt) => opt === normUser);
}
