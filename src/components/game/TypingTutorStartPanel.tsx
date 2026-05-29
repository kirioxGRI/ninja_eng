'use client';

import styles from './TypingTutorStartPanel.module.css';
import {
  TYPING_TUTOR_LEVEL_OPTIONS,
  TYPING_TUTOR_WORD_SOURCE_OPTIONS,
  type TypingTutorWordLevel,
  type TypingTutorWordSource,
} from '@/lib/game/typing-tutor-options';

type Props = {
  errorMessage: string | null;
  maxSimultaneous: number;
  onLevelChange: (value: TypingTutorWordLevel) => void;
  onMaxSimultaneousChange: (value: number) => void;
  onSourceChange: (value: TypingTutorWordSource) => void;
  selectedLevel: TypingTutorWordLevel;
  wordSource: TypingTutorWordSource;
};

export default function TypingTutorStartPanel({
  errorMessage,
  maxSimultaneous,
  onLevelChange,
  onMaxSimultaneousChange,
  onSourceChange,
  selectedLevel,
  wordSource,
}: Props) {
  return (
    <div className={styles.root}>
      <p className={styles.description}>
        Configura tu práctica antes de empezar. Elige la fuente del vocabulario, el nivel si aplica y la cantidad de
        palabras simultáneas.
      </p>

      <div className={styles.card}>
        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <span className={styles.fieldTitle}>Densidad de palabras</span>
            <span className={styles.fieldHint}>Define cuántas palabras pueden caer al mismo tiempo.</span>
          </div>
          <div className={styles.sliderRow}>
            <span className={styles.sliderLabel}>Objetos simultáneos</span>
            <input
              className={styles.slider}
              type="range"
              min={1}
              max={5}
              value={maxSimultaneous}
              onChange={(e) => onMaxSimultaneousChange(parseInt(e.target.value, 10))}
            />
            <span className={styles.sliderValue}>{maxSimultaneous}</span>
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
              <span className={styles.fieldTitle}>Nivel de palabras aleatorias</span>
              <span className={styles.fieldHint}>El juego consultará `public.word_list.nivel` usando el nivel elegido.</span>
            </div>
            <div className={styles.levelsGrid}>
              {TYPING_TUTOR_LEVEL_OPTIONS.map((level) => {
                const isActive = level.value === selectedLevel;
                return (
                  <button
                    key={level.value}
                    type="button"
                    className={`${styles.levelButton} ${isActive ? styles.levelButtonActive : ''}`}
                    onClick={() => onLevelChange(level.value)}
                  >
                    <span className={styles.levelLabel}>{level.label}</span>
                    <span className={styles.levelDescription}>{level.description}</span>
                  </button>
                );
              })}
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
