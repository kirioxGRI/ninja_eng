'use client';

import { useState, useEffect, useRef } from 'react';
import { getWordForDictation, getSentenceForDictation } from '@/app/actions/game-actions';

type Phase = 'idle' | 'loading' | 'speaking' | 'answering' | 'result';

const TIMER_SECONDS_WORD = 10;
const TIMER_SECONDS_SENTENCES = 30;
const POINTS_CORRECT = 10;
const POINTS_INCORRECT = 5;

const VOICE_PRIORITY = [
  'Google US English',
  'Google UK English Female',
  'Google UK English Male',
  'Microsoft Aria',
  'Microsoft Guy',
  'Microsoft Jenny',
  'Samantha',
  'Alex',
];

function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  for (const name of VOICE_PRIORITY) {
    const found = voices.find((v) => v.name.includes(name));
    if (found) return found;
  }
  return (
    voices.find((v) => v.lang === 'en-US') ||
    voices.find((v) => v.lang.startsWith('en')) ||
    null
  );
}

function speakOnce(word: string): Promise<void> {
  return new Promise((resolve) => {
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'en-US';
    utt.rate = 0.78;
    utt.pitch = 1.05;
    utt.volume = 1;
    const voice = getBestVoice();
    if (voice) utt.voice = voice;
    utt.onend = () => resolve();
    utt.onerror = () => resolve();
    window.speechSynthesis.speak(utt);
  });
}

async function speakWordTwice(word: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const doSpeak = async () => {
    await speakOnce(word);
    await new Promise((r) => setTimeout(r, 650));
    await speakOnce(word);
  };

  if (window.speechSynthesis.getVoices().length === 0) {
    await new Promise<void>((resolve) => {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        resolve();
      };
      setTimeout(resolve, 1500);
    });
  }

  await doSpeak();
}

type Props = { onExit: () => void };

export default function DictationGame({ onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<'word' | 'sentences'>('word');
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS_WORD);
  const [round, setRound] = useState(0);
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    word: string;
    userAnswer: string;
    timedOut: boolean;
  } | null>(null);

  const wordRef = useRef('');
  const answerRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Countdown tick
  useEffect(() => {
    if (phase !== 'answering' || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft]);

  // Handle timeout
  useEffect(() => {
    if (phase !== 'answering' || timeLeft > 0) return;
    resolveAnswer(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft]);

  // Focus input when answering starts
  useEffect(() => {
    if (phase === 'answering') {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [phase]);

  function resolveAnswer(timedOut: boolean) {
    const userAnswer = answerRef.current.trim();
    
    // Normalize string to ignore punctuation, multiple spaces, and case
    const normalize = (str: string) => {
      return str
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g, '') // remove common punctuation
        .replace(/\s+/g, ' ') // normalize spaces
        .trim();
    };

    const correct = normalize(userAnswer) === normalize(wordRef.current) && !timedOut;
    setPhase('result');
    setLastResult({ correct, word: wordRef.current, userAnswer, timedOut });
    setScore((s) => correct ? s + POINTS_CORRECT : Math.max(0, s - POINTS_INCORRECT));
  }

  async function startNextRound(selectedMode: 'word' | 'sentences') {
    setPhase('loading');
    setAnswer('');
    answerRef.current = '';
    setLastResult(null);

    let textToSpeak = '';
    if (selectedMode === 'word') {
      const fetched = await getWordForDictation();
      if (!fetched) {
        setPhase('idle');
        return;
      }
      textToSpeak = fetched.palabra;
    } else {
      const fetched = await getSentenceForDictation();
      if (!fetched) {
        alert("No se encontraron oraciones de ejemplo en tu lista de palabras. Agrega algunas oraciones primero en Configurar.");
        setPhase('idle');
        return;
      }
      textToSpeak = fetched.oracion;
    }

    wordRef.current = textToSpeak;
    setRound((r) => r + 1);
    setPhase('speaking');

    await speakWordTwice(textToSpeak);

    const timeLimit = selectedMode === 'word' ? TIMER_SECONDS_WORD : TIMER_SECONDS_SENTENCES;
    setTimeLeft(timeLimit);
    setPhase('answering');
  }

  async function startGame(selectedMode: 'word' | 'sentences') {
    setMode(selectedMode);
    setRound(0);
    setScore(0);
    await startNextRound(selectedMode);
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (phase !== 'answering') return;
    resolveAnswer(false);
  }

  function handleAnswerChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAnswer(e.target.value);
    answerRef.current = e.target.value;
  }

  // ─── Pantalla inicial ──────────────────────────────────────
  if (phase === 'idle' && round === 0) {
    return (
      <div className="page-content" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '72vh',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: '4.5rem', marginBottom: 16 }}>🎧</div>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0d47a1', marginBottom: 10 }}>
            Word Dictation
          </h2>
          <p style={{ color: '#546e7a', fontSize: '0.92rem', lineHeight: 1.75, marginBottom: 10 }}>
            Escucharás una palabra u oración en inglés <strong>dos veces</strong>.<br />
            Escríbela correctamente antes de que se acabe el tiempo (<strong>10s</strong> para palabras, <strong>30s</strong> para oraciones).
          </p>
          <div style={{
            display: 'inline-flex', gap: 24, background: '#f0f4ff',
            borderRadius: 12, padding: '12px 24px', marginBottom: 32, fontSize: '0.88rem',
          }}>
            <span style={{ color: '#2e7d32', fontWeight: 700 }}>✅ Correcta: +{POINTS_CORRECT} pts</span>
            <span style={{ color: '#c62828', fontWeight: 700 }}>❌ Incorrecta: −{POINTS_INCORRECT} pts</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              style={{
                padding: '14px 28px',
                fontSize: '1rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onClick={() => startGame('word')}
            >
              🎮 Word
            </button>
            <button
              style={{
                padding: '14px 28px',
                fontSize: '1rem',
                fontWeight: 700,
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #009688, #004d40)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0, 150, 136, 0.4)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 150, 136, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 150, 136, 0.4)';
              }}
              onClick={() => startGame('sentences')}
            >
              📝 Sentences
            </button>
            <button
              style={{
                padding: '14px 22px',
                fontSize: '0.95rem',
                borderRadius: '10px',
                border: '1px solid #cfd8dc',
                background: '#fff',
                color: '#546e7a',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f7fa';
                e.currentTarget.style.color = '#37474f';
                e.currentTarget.style.borderColor = '#b0bec5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.color = '#546e7a';
                e.currentTarget.style.borderColor = '#cfd8dc';
              }}
              onClick={onExit}
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Pantalla de juego ────────────────────────────────────
  const timerDanger = timeLeft <= 3;
  const timerWarning = timeLeft <= 5 && timeLeft > 3;
  const maxTime = mode === 'word' ? TIMER_SECONDS_WORD : TIMER_SECONDS_SENTENCES;

  return (
    <div className="page-content">

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 28, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1565c0, #0d47a1)',
            color: '#fff', borderRadius: 12, padding: '10px 22px',
            fontWeight: 800, fontSize: '1.15rem',
          }}>
            🏆 {score} pts
          </div>
          <div style={{ color: '#78909c', fontSize: '0.85rem', fontWeight: 600 }}>
            Ronda #{round} ({mode === 'word' ? 'Word' : 'Sentences'})
          </div>
        </div>
        <button
          style={{
            fontSize: '0.85rem',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #cfd8dc',
            background: '#fff',
            color: '#546e7a',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f5f7fa';
            e.currentTarget.style.color = '#37474f';
            e.currentTarget.style.borderColor = '#b0bec5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.color = '#546e7a';
            e.currentTarget.style.borderColor = '#cfd8dc';
          }}
          onClick={onExit}
        >
          ✕ Salir
        </button>
      </div>

      {/* Card */}
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div className="progress-card" style={{ padding: '40px 36px', textAlign: 'center', minHeight: 320 }}>

          {/* Loading */}
          {phase === 'loading' && (
            <div style={{ paddingTop: 40 }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 14 }}>⏳</div>
              <p style={{ color: '#90a4ae', fontWeight: 600 }}>
                {mode === 'word' ? 'Cargando palabra...' : 'Cargando oración...'}
              </p>
            </div>
          )}

          {/* Speaking */}
          {phase === 'speaking' && (
            <div style={{ paddingTop: 32 }}>
              <div style={{
                fontSize: '4rem', marginBottom: 16,
                display: 'inline-block',
                animation: 'dictation-pulse 0.9s ease-in-out infinite',
              }}>
                🔊
              </div>
              <p style={{ color: '#1565c0', fontWeight: 800, fontSize: '1.05rem', marginBottom: 6 }}>
                Escuchando...
              </p>
              <p style={{ color: '#90a4ae', fontSize: '0.82rem' }}>
                {mode === 'word' ? 'La palabra se reproducirá dos veces' : 'La oración se reproducirá dos veces'}
              </p>
              <style>{`
                @keyframes dictation-pulse {
                  0%, 100% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.18); opacity: 0.75; }
                }
              `}</style>
            </div>
          )}

          {/* Answering */}
          {phase === 'answering' && (
            <div>
              {/* Timer circle */}
              <div style={{ marginBottom: 22 }}>
                <div style={{
                  width: 76, height: 76, borderRadius: '50%', margin: '0 auto',
                  background: timerDanger
                    ? 'linear-gradient(135deg, #ef5350, #c62828)'
                    : timerWarning
                    ? 'linear-gradient(135deg, #ffb74d, #f57c00)'
                    : 'linear-gradient(135deg, #1565c0, #0d47a1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: timerDanger
                    ? '0 0 22px rgba(239,83,80,0.55)'
                    : '0 4px 16px rgba(13,71,161,0.28)',
                  transition: 'background 0.4s, box-shadow 0.4s',
                }}>
                  <span style={{ color: '#fff', fontSize: '1.9rem', fontWeight: 900, lineHeight: 1 }}>
                    {timeLeft}
                  </span>
                </div>
                <div style={{ color: '#b0bec5', fontSize: '0.72rem', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  segundos
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: 5, background: '#e8eef8', borderRadius: 3, marginBottom: 26, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(timeLeft / maxTime) * 100}%`,
                  background: timerDanger ? '#ef5350' : timerWarning ? '#ffb74d' : '#1565c0',
                  transition: 'width 0.85s linear, background 0.4s',
                  borderRadius: 3,
                }} />
              </div>

              <p style={{ color: '#546e7a', fontSize: '0.85rem', marginBottom: 14, fontWeight: 600 }}>
                {mode === 'word' ? 'Escribe la palabra que escuchaste:' : 'Escribe la oración que escuchaste:'}
              </p>

              <form onSubmit={handleSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  className="form-input"
                  style={{
                    textAlign: 'center', fontSize: mode === 'word' ? '1.35rem' : '1.05rem', fontWeight: 700,
                    letterSpacing: mode === 'word' ? 3 : 'normal', marginBottom: 16,
                  }}
                  placeholder={mode === 'word' ? '_ _ _ _ _' : 'Escribe la oración aquí...'}
                  value={answer}
                  onChange={handleAnswerChange}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.95rem' }}
                >
                  Confirmar respuesta
                </button>
              </form>
            </div>
          )}

          {/* Result */}
          {phase === 'result' && lastResult && (
            <div>
              <div style={{ fontSize: '3.8rem', marginBottom: 12 }}>
                {lastResult.correct ? '🎉' : lastResult.timedOut ? '⏰' : '😅'}
              </div>

              <div style={{
                fontSize: '1.6rem', fontWeight: 900, marginBottom: 14,
                color: lastResult.correct ? '#2e7d32' : '#c62828',
              }}>
                {lastResult.correct ? '¡Correcta!' : lastResult.timedOut ? '¡Tiempo!' : 'Incorrecta'}
              </div>

              {/* Word/Sentence reveal */}
              <div style={{
                background: lastResult.correct ? 'rgba(76,175,80,0.07)' : 'rgba(244,67,54,0.07)',
                border: `1.5px solid ${lastResult.correct ? 'rgba(76,175,80,0.25)' : 'rgba(244,67,54,0.25)'}`,
                borderRadius: 14, padding: '16px 22px', marginBottom: 10,
              }}>
                <div style={{ fontSize: '0.7rem', color: '#b0bec5', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6, letterSpacing: '0.5px' }}>
                  {mode === 'word' ? 'La palabra era' : 'La oración era'}
                </div>
                <div style={{
                  fontSize: mode === 'word' ? '1.7rem' : '1.25rem',
                  fontWeight: 900,
                  color: '#0d47a1',
                  letterSpacing: mode === 'word' ? 2 : 'normal',
                  lineHeight: 1.4,
                }}>
                  {lastResult.word}
                </div>
              </div>

              {/* User answer */}
              {!lastResult.correct && lastResult.userAnswer && (
                <div style={{ fontSize: '0.82rem', color: '#90a4ae', marginBottom: 4, overflowWrap: 'break-word' }}>
                  Tu respuesta:{' '}
                  <strong style={{ color: '#e53935' }}>{lastResult.userAnswer}</strong>
                </div>
              )}
              {!lastResult.correct && !lastResult.userAnswer && (
                <div style={{ fontSize: '0.82rem', color: '#90a4ae', marginBottom: 4 }}>
                  Sin respuesta
                </div>
              )}

              {/* Score change */}
              <div style={{
                fontSize: '0.9rem', fontWeight: 800, marginBottom: 28,
                color: lastResult.correct ? '#2e7d32' : '#c62828',
              }}>
                {lastResult.correct ? `+${POINTS_CORRECT} puntos` : `−${POINTS_INCORRECT} puntos`}
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.95rem' }}
                onClick={() => startNextRound(mode)}
              >
                🔊 {mode === 'word' ? 'Siguiente palabra' : 'Siguiente oración'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
