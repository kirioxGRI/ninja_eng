'use client';

import { useState, useEffect, useRef } from 'react';
import { getWordForDictation } from '@/app/actions/game-actions';

type GameState =
  | 'idle'
  | 'speaking_word'
  | 'waiting_user_speech'
  | 'listening'
  | 'answered'
  | 'time_expired'
  | 'unsupported_browser';

const TIMER_SECONDS = 10;

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
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
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
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
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
      setTimeout(resolve, 1000);
    });
  }

  await doSpeak();
}

// Levenshtein Distance Calculator
function getLevenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1, // deletion
        tmp[i][j - 1] + 1, // insertion
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1) // substitution
      );
    }
  }
  return tmp[a.length][b.length];
}

// Check pronunciation accuracy
function validatePronunciation(target: string, recognized: string): boolean {
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g, '') // remove common punctuation
      .replace(/\s+/g, ' ') // normalize spaces
      .trim();
  };

  const normTarget = normalize(target);
  const normRecognized = normalize(recognized);

  if (normTarget === normRecognized) return true;

  const len = normTarget.length;
  const dist = getLevenshteinDistance(normTarget, normRecognized);

  if (len < 6) {
    return dist === 0;
  } else if (len >= 6 && len <= 8) {
    return dist <= 1;
  } else {
    return dist <= 2;
  }
}

type Props = { onExit: () => void };

export default function SpeakingGame({ onExit }: Props) {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [round, setRound] = useState(0);
  const [targetWord, setTargetWord] = useState('');
  const [recognizedText, setRecognizedText] = useState('');
  const [lastResult, setLastResult] = useState<'correct' | 'incorrect' | 'time_expired' | null>(null);

  const recognitionRef = useRef<any>(null);
  const targetWordRef = useRef('');
  const gameStateRef = useRef<GameState>('idle');

  // Keep refs up-to-date to prevent stale closures in speech recognition events
  useEffect(() => {
    targetWordRef.current = targetWord;
  }, [targetWord]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Compatibility and setup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setGameState('unsupported_browser');
      return;
    }

    const rec = new SpeechRecognitionAPI();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => {
      setGameState('listening');
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setRecognizedText(transcript);

      const isMatch = validatePronunciation(targetWordRef.current, transcript);
      setGameState('answered');

      if (isMatch) {
        setLastResult('correct');
        setScore((s) => s + 10);
      } else {
        setLastResult('incorrect');
        setScore((s) => Math.max(0, s - 5));
      }
    };

    rec.onerror = (event: any) => {
      console.warn("Speech Recognition Error:", event.error);
      if (gameStateRef.current === 'listening') {
        if (event.error === 'not-allowed') {
          alert("Permiso de micrófono denegado. Habilita el acceso en tu navegador para continuar.");
        }
        setGameState('waiting_user_speech');
      }
    };

    rec.onend = () => {
      if (gameStateRef.current === 'listening') {
        setGameState('waiting_user_speech');
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  // Timer Tick
  const isTimerActive = gameState === 'waiting_user_speech' || gameState === 'listening';
  useEffect(() => {
    if (!isTimerActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive]);

  const handleTimeout = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.error(e);
      }
    }
    setGameState('time_expired');
    setLastResult('time_expired');
    setScore((s) => Math.max(0, s - 5));
  };

  const startNewWord = async () => {
    // Stop any active recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        console.error(e);
      }
    }

    setGameState('speaking_word');
    setRecognizedText('');
    setLastResult(null);

    const fetched = await getWordForDictation();
    if (!fetched) {
      alert("No se pudo obtener una palabra. Asegúrate de tener palabras cargadas en tu lista.");
      setGameState('idle');
      return;
    }

    const word = fetched.palabra;
    setTargetWord(word);
    setRound((r) => r + 1);

    await speakWordTwice(word);

    setTimeLeft(TIMER_SECONDS);
    setGameState('waiting_user_speech');
  };

  const startListening = () => {
    if (gameState === 'unsupported_browser' || !recognitionRef.current) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.warn("Recognition start call error, attempting to abort first:", e);
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          recognitionRef.current.start();
        }, 100);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const resetGame = () => {
    setScore(0);
    setRound(0);
    setTargetWord('');
    setRecognizedText('');
    setLastResult(null);
    setGameState('idle');
  };

  // Render UI
  const timerDanger = timeLeft <= 3;
  const timerWarning = timeLeft <= 5 && timeLeft > 3;

  const showWord = gameState === 'answered' || gameState === 'time_expired';

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Header Info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: '700px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            background: 'linear-gradient(135deg, #00695c, #004d40)',
            color: '#fff',
            borderRadius: '12px',
            padding: '10px 22px',
            fontWeight: 800,
            fontSize: '1.15rem',
            boxShadow: '0 4px 12px rgba(0, 105, 92, 0.25)',
          }}>
            🏆 {score} pts
          </div>
          {round > 0 && (
            <div style={{ color: '#78909c', fontSize: '0.85rem', fontWeight: 600 }}>
              Ronda #{round}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {round > 0 && (
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
              }}
              onClick={resetGame}
            >
              🔄 Reiniciar
            </button>
          )}
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
            onClick={onExit}
          >
            ✕ Salir
          </button>
        </div>
      </div>

      {/* Main card - 40% wider (700px) */}
      <div style={{ width: '100%', maxWidth: '700px', margin: '0 auto' }}>
        <div className="progress-card" style={{
          padding: '40px 36px',
          textAlign: 'center',
          minHeight: '340px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 77, 64, 0.08)',
          border: '1px solid rgba(0, 105, 92, 0.12)',
          borderRadius: '24px',
          background: '#ffffff',
        }}>

          {/* Idle state */}
          {gameState === 'idle' && (
            <div style={{ width: '100%', maxWidth: '500px' }}>
              <div style={{ fontSize: '4.5rem', marginBottom: '16px' }}>🗣️</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#004d40', marginBottom: '10px' }}>
                Speaking Game
              </h2>
              <p style={{ color: '#546e7a', fontSize: '0.95rem', lineHeight: 1.75, marginBottom: '24px' }}>
                Escucha la palabra en inglés y pronúnciala correctamente usando el micrófono de tu dispositivo. 
                El sistema validará tu pronunciación automáticamente.
              </p>
              <div style={{
                display: 'inline-flex',
                gap: '24px',
                background: '#e0f2f1',
                borderRadius: '12px',
                padding: '12px 24px',
                marginBottom: '32px',
                fontSize: '0.88rem',
              }}>
                <span style={{ color: '#00796b', fontWeight: 700 }}>✅ Correcta: +10 pts</span>
                <span style={{ color: '#c62828', fontWeight: 700 }}>❌ Incorrecta: −5 pts</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="btn btn-primary"
                  style={{
                    padding: '14px 36px',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #00897b, #004d40)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 14px rgba(0, 137, 123, 0.4)',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                  }}
                  onClick={startNewWord}
                >
                  🎮 Iniciar Juego
                </button>
              </div>
            </div>
          )}

          {/* Unsupported Browser Warning */}
          {gameState === 'unsupported_browser' && (
            <div style={{ width: '100%', maxWidth: '500px' }}>
              <div style={{ fontSize: '4.5rem', marginBottom: '16px', color: '#d32f2f' }}>⚠️</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c62828', marginBottom: '12px' }}>
                Speech recognition is not supported in this browser.
              </h2>
              <p style={{ color: '#546e7a', fontSize: '0.92rem', lineHeight: 1.75, marginBottom: '24px' }}>
                Este navegador no soporta la API de reconocimiento de voz de HTML5. Por favor intenta utilizando Google Chrome, Microsoft Edge, o Safari.
              </p>
              <button
                disabled
                style={{
                  padding: '12px 28px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#eeeeee',
                  color: '#9e9e9e',
                  fontWeight: 700,
                  cursor: 'not-allowed',
                }}
              >
                🎙️ Speak (Deshabilitado)
              </button>
            </div>
          )}

          {/* Speaking Word State (synthesis is reading the word) */}
          {gameState === 'speaking_word' && (
            <div style={{ paddingTop: '20px' }}>
              <div style={{
                fontSize: '4.5rem',
                marginBottom: '20px',
                display: 'inline-block',
                animation: 'speaking-pulse 1s ease-in-out infinite',
              }}>
                🔊
              </div>
              <p style={{ color: '#00796b', fontWeight: 800, fontSize: '1.2rem', marginBottom: '8px' }}>
                Escuchando el dictado...
              </p>
              <p style={{ color: '#78909c', fontSize: '0.9rem' }}>
                La palabra objetivo se reproducirá dos veces. ¡Presta atención!
              </p>
              <style>{`
                @keyframes speaking-pulse {
                  0%, 100% { transform: scale(1); opacity: 1; }
                  50% { transform: scale(1.15); opacity: 0.8; }
                }
              `}</style>
            </div>
          )}

          {/* Waiting for User Speech / Listening (Countdown and speech capture) */}
          {(gameState === 'waiting_user_speech' || gameState === 'listening') && (
            <div style={{ width: '100%' }}>
              {/* Timer & Progress */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '50%',
                  margin: '0 auto',
                  background: timerDanger
                    ? 'linear-gradient(135deg, #ef5350, #c62828)'
                    : timerWarning
                    ? 'linear-gradient(135deg, #ffb74d, #f57c00)'
                    : 'linear-gradient(135deg, #00897b, #004d40)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: timerDanger
                    ? '0 0 22px rgba(239,83,80,0.55)'
                    : '0 4px 16px rgba(0,77,64,0.2)',
                  transition: 'background 0.4s, box-shadow 0.4s',
                }}>
                  <span style={{ color: '#fff', fontSize: '1.9rem', fontWeight: 900 }}>
                    {timeLeft}
                  </span>
                </div>
                <div style={{ color: '#90a4ae', fontSize: '0.72rem', marginTop: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  segundos restantes
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: '6px', background: '#e0f2f1', borderRadius: '3px', marginBottom: '32px', overflow: 'hidden', width: '100%', maxWidth: '400px', margin: '0 auto 32px' }}>
                <div style={{
                  height: '100%',
                  width: `${(timeLeft / TIMER_SECONDS) * 100}%`,
                  background: timerDanger ? '#ef5350' : timerWarning ? '#ffb74d' : '#00897b',
                  transition: 'width 0.85s linear, background 0.4s',
                  borderRadius: '3px',
                }} />
              </div>

              <div style={{ margin: '32px 0' }}>
                {gameState === 'listening' ? (
                  <div>
                    <div className="mic-container" style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
                      <div className="mic-pulse" />
                      <div style={{
                        width: '90px',
                        height: '90px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #e53935, #c62828)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '2.5rem',
                        position: 'relative',
                        zIndex: 2,
                        boxShadow: '0 6px 20px rgba(198, 40, 40, 0.4)',
                      }}>
                        🎙️
                      </div>
                    </div>
                    <h3 style={{ color: '#c62828', fontWeight: 800, fontSize: '1.25rem', marginBottom: '8px', animation: 'blink 1.2s infinite' }}>
                      Escuchando...
                    </h3>
                    <p style={{ color: '#78909c', fontSize: '0.9rem' }}>
                      Pronuncia la palabra ahora
                    </p>
                  </div>
                ) : (
                  <div>
                    <button
                      className="btn"
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00897b, #004d40)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '2.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 6px 20px rgba(0, 137, 123, 0.4)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.06)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      onClick={startListening}
                    >
                      🎙️
                    </button>
                    <h3 style={{ color: '#004d40', fontWeight: 800, fontSize: '1.25rem', marginBottom: '8px' }}>
                      Presiona para Hablar
                    </h3>
                    <p style={{ color: '#78909c', fontSize: '0.9rem' }}>
                      Haz clic en el micrófono y di la palabra dictada
                    </p>
                  </div>
                )}
              </div>

              {/* Target Word is Hidden during countdown */}
              <div style={{
                background: '#f5f7fa',
                border: '1.5px dashed #cfd8dc',
                borderRadius: '16px',
                padding: '16px 24px',
                display: 'inline-block',
                marginTop: '12px',
              }}>
                <span style={{ fontSize: '0.72rem', color: '#90a4ae', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>
                  Palabra Oculta
                </span>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  color: '#78909c',
                  letterSpacing: '5px',
                }}>
                  {targetWord.split('').map(() => '•').join('')}
                </span>
              </div>

              <style>{`
                .mic-container {
                  position: relative;
                }
                .mic-pulse {
                  position: absolute;
                  top: -10px;
                  left: -10px;
                  width: 110px;
                  height: 110px;
                  border-radius: 50%;
                  background: rgba(229, 57, 53, 0.25);
                  animation: pulse-ring 1.2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
                  z-index: 1;
                }
                @keyframes pulse-ring {
                  0% { transform: scale(0.95); opacity: 1; }
                  100% { transform: scale(1.3); opacity: 0; }
                }
                @keyframes blink {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.5; }
                }
              `}</style>
            </div>
          )}

          {/* Answered State (Result revealed) or Time Expired */}
          {(gameState === 'answered' || gameState === 'time_expired') && lastResult && (
            <div style={{ width: '100%', maxWidth: '540px' }}>
              <div style={{ fontSize: '4.5rem', marginBottom: '16px' }}>
                {lastResult === 'correct' ? '🎉' : lastResult === 'time_expired' ? '⏰' : '😅'}
              </div>

              <h2 style={{
                fontSize: '2rem',
                fontWeight: 900,
                marginBottom: '16px',
                color: lastResult === 'correct' ? '#2e7d32' : '#c62828',
              }}>
                {lastResult === 'correct' && '¡Excelente Pronunciación!'}
                {lastResult === 'incorrect' && 'Pronunciación Incorrecta'}
                {lastResult === 'time_expired' && '¡Tiempo Agotado!'}
              </h2>

              {/* Revealed Target Word */}
              <div style={{
                background: lastResult === 'correct' ? 'rgba(76,175,80,0.06)' : 'rgba(244,67,54,0.06)',
                border: `1.5px solid ${lastResult === 'correct' ? 'rgba(76,175,80,0.2)' : 'rgba(244,67,54,0.2)'}`,
                borderRadius: '16px',
                padding: '18px 24px',
                marginBottom: '20px',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: '0.72rem', color: '#90a4ae', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px', letterSpacing: '0.5px' }}>
                  Palabra Correcta
                </span>
                <span style={{
                  fontSize: '1.9rem',
                  fontWeight: 900,
                  color: '#004d40',
                  letterSpacing: '1px',
                }}>
                  {targetWord}
                </span>
              </div>

              {/* What We Heard (SpeechRecognition Transcript) */}
              {gameState === 'answered' && (
                <div style={{
                  background: '#f5f7fa',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '12px 18px',
                  marginBottom: '24px',
                  textAlign: 'center',
                }}>
                  <span style={{ fontSize: '0.72rem', color: '#90a4ae', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '2px', letterSpacing: '0.5px' }}>
                    Lo que el navegador escuchó
                  </span>
                  <span style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: lastResult === 'correct' ? '#2e7d32' : '#c62828',
                    fontStyle: 'italic',
                  }}>
                    "{recognizedText || '...'}"
                  </span>
                </div>
              )}

              {/* Points status */}
              <div style={{
                fontSize: '1rem',
                fontWeight: 800,
                marginBottom: '32px',
                color: lastResult === 'correct' ? '#2e7d32' : '#c62828',
              }}>
                {lastResult === 'correct' ? '+10 puntos obtenidos' : '−5 puntos'}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="btn btn-primary"
                  style={{
                    padding: '14px 36px',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #00897b, #004d40)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 14px rgba(0, 137, 123, 0.4)',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'transform 0.15s',
                    flex: '1',
                    maxWidth: '240px',
                  }}
                  onClick={startNewWord}
                >
                  🔁 Siguiente Palabra
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
