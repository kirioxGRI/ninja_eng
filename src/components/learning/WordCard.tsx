'use client';

import { useState, useTransition } from 'react';
import type { WordWithProgress } from '@/app/actions/word-actions';
import {
  getRandomWord,
  markWordAsLearned,
  unmarkWordAsLearned,
} from '@/app/actions/word-actions';
import { speakWord, speakSentence } from '@/lib/speech';
import { generateExampleSentence, AI_UNAVAILABLE } from '@/lib/browser-ai';
import SentenceTokens from './SentenceTokens';
import LearnedWordsModal from './LearnedWordsModal';
import SeenWordsModal from './SeenWordsModal';

type Props = {
  initialWord: WordWithProgress;
  usuarioId: number;
  stats: { totalPalabras: number; aprendidas: number; mostradas: number };
};

export default function WordCard({ initialWord, usuarioId, stats }: Props) {
  const [word, setWord] = useState<WordWithProgress>(initialWord);
  const [currentStats, setCurrentStats] = useState(stats);
  const [genSentence, setGenSentence] = useState<string | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [showLearnedModal, setShowLearnedModal] = useState(false);
  const [showSeenModal, setShowSeenModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();

  const rawLearnedPct = currentStats.totalPalabras > 0
    ? (currentStats.aprendidas / currentStats.totalPalabras) * 100
    : 0;
  const learnedPctDisplay = rawLearnedPct === 0 ? '0' : rawLearnedPct.toFixed(2);

  const seenPct = currentStats.totalPalabras > 0
    ? Math.round((currentStats.mostradas / currentStats.totalPalabras) * 100)
    : 0;

const handleLearn = () => {
    startTransition(async () => {
      if (word.aprendida) {
        const res = await unmarkWordAsLearned(usuarioId, word.id);
        if (!res.error) {
          setWord({ ...word, aprendida: false });
          setCurrentStats((s) => ({ ...s, aprendidas: Math.max(0, s.aprendidas - 1) }));
        }
      } else {
        const res = await markWordAsLearned(usuarioId, word.id);
        if (!res.error) {
          setCurrentStats((s) => ({ ...s, aprendidas: s.aprendidas + 1 }));
          const next = await getRandomWord(usuarioId);
          if (next) {
            setWord(next);
            setGenSentence(null);
            setAiUnavailable(false);
            setCurrentStats((s) => ({ ...s, mostradas: s.mostradas + 1 }));
          } else {
            setWord({ ...word, aprendida: true });
          }
        }
      }
    });
  };

  const handleNewWord = () => {
    startTransition(async () => {
      const next = await getRandomWord(usuarioId);
      if (next) {
        setWord(next);
        setGenSentence(null);
        setAiUnavailable(false);
        setCurrentStats((s) => ({ ...s, mostradas: s.mostradas + 1 }));
      }
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setAiUnavailable(false);
    setGenSentence(null);
    const s = await generateExampleSentence(word.palabra, (partial) => {
      setGenSentence(partial);
    });
    if (s === AI_UNAVAILABLE) {
      setAiUnavailable(true);
      setGenSentence(null);
    } else {
      setGenSentence(s);
    }
    setGenerating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ─── Stats Cards ──────────────────────────────── */}
      <div className="stats-grid">
        <div className="stat-card stat-card-1">
          <div className="stat-card-top">
            <div>
              <div className="stat-value">{currentStats.totalPalabras}</div>
              <div className="stat-label">Total palabras</div>
            </div>
            <div className="stat-icon">
              <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
          </div>
          <div className="stat-footer">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
            <span>Vocabulario total</span>
            <div className="stat-bar">
              {[30, 50, 40, 70, 60, 80, 65].map((h, i) => (
                <span key={i} className={i === 6 ? 'active' : ''} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        <div
          className="stat-card stat-card-2"
          onClick={() => setShowLearnedModal(true)}
          style={{ cursor: 'pointer' }}
          title="Ver palabras aprendidas"
        >
          <div className="stat-card-top">
            <div>
              <div className="stat-value">{currentStats.aprendidas}</div>
              <div className="stat-label">Aprendidas</div>
            </div>
            <div className="stat-icon">
              <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            </div>
          </div>
          <div className="stat-footer">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
            <span>update: ahora</span>
            <div className="stat-bar">
              {[20, 45, 35, 55, 50, 70, 60].map((h, i) => (
                <span key={i} className={i === 6 ? 'active' : ''} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        <div
          className="stat-card stat-card-3"
          onClick={() => setShowSeenModal(true)}
          style={{ cursor: 'pointer' }}
          title="Ver palabras vistas"
        >
          <div className="stat-card-top">
            <div>
              <div className="stat-value">{currentStats.mostradas}</div>
              <div className="stat-label">Palabras vistas</div>
            </div>
            <div className="stat-icon">
              <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            </div>
          </div>
          <div className="stat-footer">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
            <span>{seenPct}% completado</span>
            <div className="stat-bar">
              {[40, 30, 60, 45, 75, 55, 80].map((h, i) => (
                <span key={i} className={i === 6 ? 'active' : ''} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        <div className="stat-card stat-card-4">
          <div className="stat-card-top">
            <div>
              <div className="stat-value">{learnedPctDisplay}%</div>
              <div className="stat-label">Progreso total</div>
            </div>
            <div className="stat-icon">
              <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
              </svg>
            </div>
          </div>
          <div className="stat-footer">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
            <span>{currentStats.aprendidas} / {currentStats.totalPalabras}</span>
            <div className="stat-bar">
              {[25, 40, 55, 50, 65, 70, 80].map((h, i) => (
                <span key={i} className={i === 6 ? 'active' : ''} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Word Section ──────────────────────────────── */}
      <div className="word-section">

        {/* Main Word Card */}
        <div className="word-card" style={{ opacity: isPending ? 0.7 : 1, transition: 'opacity 0.2s' }}>
          {/* Header */}
          <div className="word-card-header">
            <span className="word-number">Palabra #{word.id}</span>
            <span className={`word-status-badge ${word.aprendida ? 'learned' : 'unlearned'}`}>
              {word.aprendida ? '✓ Aprendida' : '○ Sin aprender'}
            </span>
          </div>

          {/* Main word info */}
          <div className="word-main">
            <div className="word-primary-row">
              <div className="word-english" id="word-display">{word.palabra}</div>
              <button
                id="btn-speak-word"
                className="icon-audio-button"
                onClick={() => speakWord(word.palabra)}
                aria-label="Escuchar palabra"
                title="Escuchar palabra"
                type="button"
              >
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                </svg>
              </button>
            </div>
            <div className="word-pronunciation" id="word-pronunciation">
              /{word.pronunciacion || '—'}/
            </div>
            <div className="word-translation" id="word-translation">
              {word.traduccion_espanol}
            </div>
          </div>

          <div className="word-divider" />

          {/* Sentence — shows generated (IA) when available, otherwise original */}
          {(word.oracion_ejemplo || genSentence) && (
            <>
              <div className="word-sentence-label">
                {genSentence ? '✨ Oración generada con IA' : 'Oración de ejemplo'}
              </div>
              <div className="word-sentence-row">
                {/* Plain text while streaming, interactive tokens when done */}
                {genSentence && generating ? (
                  <p className="word-sentence" style={{ opacity: 0.7 }}>{genSentence}</p>
                ) : (
                  <SentenceTokens sentence={genSentence ?? word.oracion_ejemplo!} />
                )}
                <button
                  id="btn-speak-sentence"
                  className="icon-audio-button icon-audio-button-sentence"
                  onClick={() => speakSentence(genSentence || word.oracion_ejemplo || word.palabra)}
                  aria-label="Escuchar oración"
                  title="Escuchar oración"
                  type="button"
                >
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* IA unavailable notice */}
          {aiUnavailable && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(244,67,54,0.07)', border: '1px solid rgba(244,67,54,0.2)', borderRadius: 10, fontSize: '0.82rem', color: '#c62828' }}>
              IA no disponible en este navegador.
            </div>
          )}

          {/* Action buttons */}
          <div className="word-actions">
            <button
              id="btn-generate-sentence"
              className="btn btn-ghost btn-sm"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? '…' : (
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
              )}
              {generating ? 'Generando...' : 'Nueva oración'}
            </button>

            <button
              id="btn-toggle-learned"
              className={`btn btn-sm ${word.aprendida ? 'btn-danger' : 'btn-success'}`}
              onClick={handleLearn}
              disabled={isPending}
            >
              {word.aprendida ? (
                <>
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  Quitar aprendida
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                  Marcar aprendida
                </>
              )}
            </button>

            <button
              id="btn-new-word"
              className={`btn btn-sm ${word.aprendida ? 'btn-success' : 'btn-danger'}`}
              onClick={handleNewWord}
              disabled={isPending}
            >
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              Nueva palabra
            </button>
          </div>
        </div>

      </div>

      {showLearnedModal && (
        <LearnedWordsModal
          usuarioId={usuarioId}
          onClose={() => setShowLearnedModal(false)}
          onStatsChange={(newCount) =>
            setCurrentStats((s) => ({ ...s, aprendidas: newCount }))
          }
        />
      )}

      {showSeenModal && (
        <SeenWordsModal
          usuarioId={usuarioId}
          onClose={() => setShowSeenModal(false)}
          onStatsChange={(newSeenNotLearned) =>
            setCurrentStats((s) => ({ ...s, mostradas: newSeenNotLearned + s.aprendidas }))
          }
        />
      )}
    </div>
  );
}
