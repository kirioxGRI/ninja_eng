'use client';

import styles from './TypingTutorStartPanel.module.css';
import {
  TYPING_TUTOR_DIFFICULTY_LEVELS,
  TYPING_TUTOR_VOCABULARY_THRESHOLDS,
  TYPING_TUTOR_WORD_SOURCE_OPTIONS,
  type TypingTutorWordSource,
} from '@/lib/game/typing-tutor-options';

type Props = {
  errorMessage: string | null;
  onSourceChange: (value: TypingTutorWordSource) => void;
  wordSource: TypingTutorWordSource;
};

export default function TypingTutorStartPanel({
  errorMessage,
  onSourceChange,
  wordSource,
}: Props) {
  return (
    <div className={styles.root}>
      <p className={styles.description}>
        Configura tu práctica antes de empezar. `Typing Tutor` usa 10 niveles automáticos y ajusta la presión según
        cuántas palabras hayas procesado.
      </p>

      <div className={styles.card}>
        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <span className={styles.fieldTitle}>Dificultad automática</span>
            <span className={styles.fieldHint}>
              No hay control manual. El sistema define el nivel y la cantidad de palabras desplegadas en cada tramo.
            </span>
          </div>
          <div className={styles.automationGrid}>
            {TYPING_TUTOR_DIFFICULTY_LEVELS.map((difficulty) => (
              <div key={difficulty.level} className={styles.automationItem}>
                <span className={styles.automationRange}>
                  {`Nivel ${difficulty.level} · ${difficulty.rangeLabel}`}
                </span>
                <span className={styles.automationValue}>
                  {difficulty.displayedWords === 1
                    ? '1 palabra desplegada'
                    : `${difficulty.displayedWords} palabras desplegadas`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <span className={styles.fieldTitle}>Fuente del vocabulario</span>
            <span className={styles.fieldHint}>Escoge si practicarás tus palabras dominadas o un banco aleatorio.</span>
          </div>
          <div className={styles.optionsGrid}>
            {TYPING_TUTOR_WORD_SOURCE_OPTIONS.map((option) => {
              const isActive = option.value === wordSource;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.optionButton} ${isActive ? styles.optionButtonActive : ''}`}
                  onClick={() => onSourceChange(option.value)}
                >
                  <span className={styles.optionLabel}>{option.label}</span>
                  <span className={styles.optionDescription}>{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {wordSource === 'random' && (
          <div className={styles.field}>
            <div className={styles.fieldHeader}>
              <span className={styles.fieldTitle}>Escalado de vocabulario</span>
              <span className={styles.fieldHint}>
                `Typing Tutor` empieza con palabras Básicas, cambia a Intermedio al completar{' '}
                {TYPING_TUTOR_VOCABULARY_THRESHOLDS.intermediate} y, tras{' '}
                {TYPING_TUTOR_VOCABULARY_THRESHOLDS.advanced - TYPING_TUTOR_VOCABULARY_THRESHOLDS.intermediate}{' '}
                palabras más, usa solo Avanzado.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.helperCard}>
        💡 <strong>Cómo jugar:</strong> escribe con tu teclado. Si te equivocas de objetivo, presiona <strong>ESC</strong> para
        limpiar el progreso o <strong>Backspace</strong> para retroceder una letra.
      </div>

      {errorMessage && <div className={styles.error}>{errorMessage}</div>}
    </div>
  );
}
