'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getWordsForTypingGame,
  submitTypingTutorResult,
  type TypingTutorRankingEntry,
  type TypingTutorRankingSummary,
} from '@/app/actions/game-actions';
import TypingTutorStartPanel from './TypingTutorStartPanel';
import {
  DEFAULT_TYPING_TUTOR_SOURCE,
  getTypingTutorDifficultyProfile,
  getTypingTutorVocabularyLevel,
  type TypingTutorGameWord,
  type TypingTutorWordSource,
} from '@/lib/game/typing-tutor-options';

type Phase = 'idle' | 'loading' | 'playing' | 'gameover';

interface ActiveWord {
  id: number;
  word: string;
  translation: string;
  isSentence: boolean;
  x: number; // 5 to 80 (percentage)
  y: number; // 0 to 100 (percentage)
  speed: number; // speed per frame
  progress: number; // correctly typed characters count
  isExploding: boolean;
  explodeTimer: number;
}

type Props = { onExit: () => void };

export default function WritingWordGame({ onExit }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [wordSource, setWordSource] = useState<TypingTutorWordSource>(DEFAULT_TYPING_TUTOR_SOURCE);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [wordsPool, setWordsPool] = useState<TypingTutorGameWord[]>([]);
  const [activeWords, setActiveWords] = useState<ActiveWord[]>([]);
  const [rankingSummary, setRankingSummary] = useState<TypingTutorRankingSummary | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [isSavingRanking, setIsSavingRanking] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [flashGreen, setFlashGreen] = useState(false);

  const activeWordsRef = useRef<ActiveWord[]>([]);
  const wordsPoolRef = useRef<typeof wordsPool>([]);
  const scoreRef = useRef<number>(0);
  const wordsCompletedRef = useRef<number>(0);
  const levelRef = useRef<number>(1);
  const livesRef = useRef<number>(3);
  const spawnTimerRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const runStartedRef = useRef(false);
  const resultSavedRef = useRef(false);

  // Sync refs to avoid stale closures in frame loops
  useEffect(() => {
    activeWordsRef.current = activeWords;
  }, [activeWords]);

  useEffect(() => {
    wordsPoolRef.current = wordsPool;
  }, [wordsPool]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    wordsCompletedRef.current = wordsCompleted;
  }, [wordsCompleted]);

  useEffect(() => {
    livesRef.current = lives;
    if (lives <= 0 && phase === 'playing') {
      endGame();
    }
  }, [lives, phase]);

  function spawnWordInList(pool: typeof wordsPool, currentList: ActiveWord[]): ActiveWord[] {
    const currentVocabularyLevel = getTypingTutorVocabularyLevel(wordsCompletedRef.current);
    const candidatePool =
      wordSource === 'random'
        ? pool.filter((item) => item.level === currentVocabularyLevel)
        : pool;

    if (candidatePool.length === 0) return currentList;

    const selected = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    const baseSpeed = 4.5 + levelRef.current * 0.75;
    const speedVariation = Math.random() * 1.5;
    const finalSpeed = (selected.isSentence ? baseSpeed * 0.78 : baseSpeed) + speedVariation;

    const spawnX = findValidSpawnXForList(selected.word, currentList);

    const newWord: ActiveWord = {
      id: Date.now() + Math.random(),
      word: selected.word,
      translation: selected.translation,
      isSentence: selected.isSentence,
      x: spawnX,
      y: -8, // Start slightly above the top boundary
      speed: finalSpeed,
      progress: 0,
      isExploding: false,
      explodeTimer: 0,
    };

    return [...currentList, newWord];
  }

  function initializeGame(pool: TypingTutorGameWord[]) {
    const initialProfile = getTypingTutorDifficultyProfile(0);

    setWordsPool(pool);
    wordsPoolRef.current = pool;
    setScore(0);
    setLives(3);
    setLevel(initialProfile.level);
    setWordsCompleted(0);
    setRankingSummary(null);
    setRankingError(null);
    setIsSavingRanking(false);
    levelRef.current = initialProfile.level;
    scoreRef.current = 0;
    wordsCompletedRef.current = 0;
    livesRef.current = 3;
    runStartedRef.current = true;
    resultSavedRef.current = false;
    
    let initialList: ActiveWord[] = [];
    const initialCount = Math.min(initialProfile.maxSimultaneous, pool.length);
    if (pool.length > 0) {
      for (let i = 0; i < initialCount; i++) {
        initialList = spawnWordInList(pool, initialList);
      }
    }
    
    setActiveWords(initialList);
    activeWordsRef.current = initialList;
    
    spawnTimerRef.current = 0; // reset spawn timer
    lastFrameTimeRef.current = performance.now();
    setPhase('playing');
  }

  function getEmptyPoolMessage() {
    if (wordSource === 'learned') {
      return 'No tienes palabras aprendidas disponibles para este modo. Marca algunas en Reading e inténtalo de nuevo.';
    }

    return 'No se encontró vocabulario aleatorio disponible para la progresión automática.';
  }

  async function startGame() {
    if (phase === 'loading') return;

    setMenuError(null);
    setPhase('loading');

    try {
      const fetched = await getWordsForTypingGame({
        source: wordSource,
      });

      if (!fetched.length) {
        setWordsPool([]);
        wordsPoolRef.current = [];
        setPhase('idle');
        setMenuError(getEmptyPoolMessage());
        return;
      }

      initializeGame(fetched);
    } catch (err) {
      console.error('Error loading words for typing tutor:', err);
      setWordsPool([]);
      wordsPoolRef.current = [];
      setPhase('idle');
      setMenuError('No se pudo cargar el banco de palabras. Inténtalo de nuevo.');
    }
  }

  function resetToMenu() {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    setScore(0);
    setLives(3);
    setLevel(1);
    setWordsCompleted(0);
    setWordsPool([]);
    setActiveWords([]);
    setMenuError(null);
    setRankingSummary(null);
    setRankingError(null);
    setIsSavingRanking(false);
    scoreRef.current = 0;
    wordsCompletedRef.current = 0;
    livesRef.current = 3;
    levelRef.current = 1;
    wordsPoolRef.current = [];
    activeWordsRef.current = [];
    runStartedRef.current = false;
    resultSavedRef.current = false;
    spawnTimerRef.current = 0;
    lastFrameTimeRef.current = 0;
    setPhase('idle');
  }

  function endGame() {
    setPhase('gameover');
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }

  // Prevent superpositions of falling words
  function findValidSpawnXForList(wordText: string, currentList: ActiveWord[]): number {
    let attempts = 0;
    let bestX = 20 + Math.random() * 60; // default random (centered positioning)

    while (attempts < 10) {
      const candidateX = 15 + Math.random() * 70; // 15% to 85% (words are centered via translateX(-50%))
      // Check if candidateX is too close to any word currently near the top (y < 22)
      const isOverlap = currentList.some((w) => {
        if (w.y > 22) return false;
        const textLenDiff = Math.max(w.word.length, wordText.length) * 0.7;
        return Math.abs(w.x - candidateX) < 14 + textLenDiff;
      });

      if (!isOverlap) {
        return candidateX;
      }
      attempts++;
    }
    return bestX;
  }

  // Animation and physics loop
  useEffect(() => {
    if (phase !== 'playing') return;

    function gameLoop(timestamp: number) {
      const elapsed = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      // Normalize delta time (seconds)
      const dt = elapsed / 1000;

      // 1. Fall physics and explosion updates
      let lifeLostOccurred = false;
      let nextActiveWords = activeWordsRef.current
        .map((w) => {
          if (w.isExploding) {
            return {
              ...w,
              explodeTimer: w.explodeTimer + dt,
            };
          }
          const nextY = w.y + w.speed * dt;
          return {
            ...w,
            y: nextY,
          };
        })
        .filter((w) => {
          if (w.isExploding) {
            return w.explodeTimer < 0.28;
          }
          if (w.y >= 92) {
            lifeLostOccurred = true;
            return false;
          }
          return true;
        });

      // 2. Check spawn timer using automatic difficulty progression
      spawnTimerRef.current += dt;
      const spawnInterval = Math.max(1.6, 3.6 - levelRef.current * 0.32);
      const difficultyProfile = getTypingTutorDifficultyProfile(wordsCompletedRef.current);
      const nonExplodingCount = nextActiveWords.filter(w => !w.isExploding).length;
      if (spawnTimerRef.current >= spawnInterval && nonExplodingCount < difficultyProfile.maxSimultaneous) {
        nextActiveWords = spawnWordInList(wordsPoolRef.current, nextActiveWords);
        spawnTimerRef.current = 0;
      }

      if (lifeLostOccurred) {
        setLives((l) => Math.max(0, l - 1));
        setFlashRed(true);
        setTimeout(() => setFlashRed(false), 200);
      }

      // 3. Apply the single batched state update!
      setActiveWords(nextActiveWords);
      activeWordsRef.current = nextActiveWords; // keep ref in sync immediately!

      animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    }

    lastFrameTimeRef.current = performance.now();
    animationFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'gameover' || !runStartedRef.current || resultSavedRef.current) {
      return;
    }

    let cancelled = false;
    resultSavedRef.current = true;
    runStartedRef.current = false;
    setIsSavingRanking(true);
    setRankingError(null);

    (async () => {
      try {
        const summary = await submitTypingTutorResult(scoreRef.current);

        if (!cancelled) {
          setRankingSummary(summary);
        }
      } catch (error) {
        console.error('Error saving typing tutor ranking:', error);

        if (!cancelled) {
          setRankingError('No se pudo registrar el resultado en el ranking.');
        }
      } finally {
        if (!cancelled) {
          setIsSavingRanking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [phase]);

  // Global keyboard input listener — MULTI-TARGET system
  // No exclusive lock: each keystroke advances whichever word matches.
  // Priority: words with existing progress first (sorted by most progress then closest to bottom),
  // then new words (sorted by closest to bottom).
  useEffect(() => {
    if (phase !== 'playing') return;

    function handleKeyDown(e: KeyboardEvent) {
      const active = activeWordsRef.current;

      // Ignore utility keys
      if (e.key === 'Alt' || e.key === 'Control' || e.key === 'Shift' || e.key === 'Meta' || e.key === 'CapsLock') {
        return;
      }

      // ESC: reset ALL progress on all words
      if (e.key === 'Escape') {
        const hasProgress = active.some((w) => w.progress > 0 && !w.isExploding);
        if (hasProgress) {
          const nextActive = active.map((w) => (w.isExploding ? w : { ...w, progress: 0 }));
          setActiveWords(nextActive);
          activeWordsRef.current = nextActive;
        }
        return;
      }

      // Backspace: reduce progress on the word closest to the bottom that has progress
      if (e.key === 'Backspace') {
        const wordsWithProgress = active
          .filter((w) => w.progress > 0 && !w.isExploding)
          .sort((a, b) => b.y - a.y); // closest to bottom first

        if (wordsWithProgress.length > 0) {
          const target = wordsWithProgress[0];
          const nextActive = active.map((w) => {
            if (w.id === target.id) {
              return { ...w, progress: Math.max(0, w.progress - 1) };
            }
            return w;
          });
          setActiveWords(nextActive);
          activeWordsRef.current = nextActive;
        }
        return;
      }

      // We only care about characters of length 1 (alphanumeric/spaces/punctuation)
      if (e.key.length !== 1) return;
      const typedChar = e.key.toLowerCase();

      // STEP 1: Try to advance a word that ALREADY has progress
      // Among words with progress, prioritize: most progress first, then closest to bottom
      const wordsInProgress = active
        .filter((w) => !w.isExploding && w.progress > 0 && w.progress < w.word.length)
        .filter((w) => w.word[w.progress].toLowerCase() === typedChar)
        .sort((a, b) => {
          if (b.progress !== a.progress) return b.progress - a.progress; // most progress first
          return b.y - a.y; // then closest to bottom
        });

      if (wordsInProgress.length > 0) {
        const target = wordsInProgress[0];
        const nextProgress = target.progress + 1;
        const nextActive = active.map((w) => (w.id === target.id ? { ...w, progress: nextProgress } : w));
        setActiveWords(nextActive);
        activeWordsRef.current = nextActive;

        playAudioFeedback(true);
        checkWordCompletionInList(target.id, nextProgress, target.word, nextActive);
        return;
      }

      // STEP 2: Try to START a new word (progress === 0) whose first char matches
      // Priority: closest to bottom (most urgent)
      const newCandidates = active
        .filter((w) => !w.isExploding && w.progress === 0 && w.word[0].toLowerCase() === typedChar)
        .sort((a, b) => b.y - a.y);

      if (newCandidates.length > 0) {
        const target = newCandidates[0];
        const nextActive = active.map((w) => (w.id === target.id ? { ...w, progress: 1 } : w));
        setActiveWords(nextActive);
        activeWordsRef.current = nextActive;

        playAudioFeedback(true);
        checkWordCompletionInList(target.id, 1, target.word, nextActive);
        return;
      }

      // Nothing matched
      playAudioFeedback(false);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  function checkWordCompletionInList(wordId: number, currentProgress: number, fullText: string, currentList: ActiveWord[]) {
    if (currentProgress >= fullText.length) {
      setFlashGreen(true);
      setTimeout(() => setFlashGreen(false), 150);

      const pointsEarned = fullText.length * 2;
      setScore((s) => s + pointsEarned);
      setWordsCompleted((currentCount) => {
        const nextCount = currentCount + 1;
        const nextProfile = getTypingTutorDifficultyProfile(nextCount);
        wordsCompletedRef.current = nextCount;

        if (nextProfile.level !== levelRef.current) {
          levelRef.current = nextProfile.level;
          setLevel(nextProfile.level);
        }

        return nextCount;
      });

      const nextActive = currentList.map((w) => (w.id === wordId ? { ...w, isExploding: true, explodeTimer: 0 } : w));
      setActiveWords(nextActive);
      activeWordsRef.current = nextActive;
    }
  }

  // Premium synth audio effects
  function playAudioFeedback(correct: boolean) {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (correct) {
        osc.frequency.setValueAtTime(680, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch {
      // Fallback silently
    }
  }

  function formatRankingDate(value: string | null) {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('es-DO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  function renderTopFiveRow(entry: TypingTutorRankingEntry, index: number) {
    const isLeader = index === 0;

    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '72px minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: '14px',
          padding: '14px 16px',
          borderRadius: '16px',
          border: isLeader ? '1px solid rgba(21, 101, 192, 0.24)' : '1px solid #dbe7f5',
          background: isLeader ? 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)' : '#f8fbff',
        }}
      >
        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: isLeader ? '#1565c0' : '#0f172a', lineHeight: 1 }}>
          #{entry.ranking}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 800, marginBottom: '3px' }}>
            {entry.playerName}
          </div>
          {formatRankingDate(entry.rankingDate) && (
            <div style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.45 }}>
              {formatRankingDate(entry.rankingDate)}
            </div>
          )}
        </div>
        <div style={{ fontSize: '0.95rem', color: isLeader ? '#1565c0' : '#0f172a', fontWeight: 800, whiteSpace: 'nowrap' }}>
          {entry.score ?? 0} pts
        </div>
      </div>
    );
  }

  const showHeaderActions = phase === 'idle' || phase === 'loading' || phase === 'gameover';
  const usesDarkBoard = phase === 'playing';
  const difficultyProfile = getTypingTutorDifficultyProfile(wordsCompleted);
  const vocabularyLevel = getTypingTutorVocabularyLevel(wordsCompleted);
  const boardBackground = usesDarkBoard
    ? 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)'
    : 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)';
  const boardBorder = flashRed
    ? '2.5px solid #ef5350'
    : flashGreen
    ? '2.5px solid #66bb6a'
    : usesDarkBoard
    ? '1.5px solid rgba(255,255,255,0.08)'
    : '1.5px solid #d7e9fb';
  const boardShadow = flashRed
    ? '0 0 45px rgba(239, 83, 80, 0.45), inset 0 0 24px rgba(239, 83, 80, 0.3)'
    : flashGreen
    ? '0 0 45px rgba(76, 175, 80, 0.35), inset 0 0 20px rgba(76, 175, 80, 0.2)'
    : usesDarkBoard
    ? '0 16px 48px rgba(0,0,0,0.4)'
    : '0 16px 40px rgba(13,71,161,0.08)';

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">
          <h2>Writing Word – Typing Tutor</h2>
          <p>Escribe las palabras antes de que toquen el fondo</p>
        </div>
        {showHeaderActions && (
          <div className="topbar-right">
            {(phase === 'idle' || phase === 'loading') && (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    padding: '10px 20px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    borderRadius: '10px',
                    opacity: phase === 'loading' ? 0.75 : 1,
                    cursor: phase === 'loading' ? 'wait' : 'pointer',
                  }}
                  onClick={startGame}
                  disabled={phase === 'loading'}
                >
                  {phase === 'loading' ? 'Cargando...' : 'Comenzar'}
                </button>
                <button
                  type="button"
                  style={{
                    padding: '10px 18px',
                    fontSize: '0.9rem',
                    borderRadius: '10px',
                    border: '1px solid #d0e8fc',
                    background: '#fff',
                    color: '#0d47a1',
                    fontWeight: 600,
                    cursor: phase === 'loading' ? 'not-allowed' : 'pointer',
                    opacity: phase === 'loading' ? 0.65 : 1,
                  }}
                  onClick={onExit}
                  disabled={phase === 'loading'}
                >
                  Volver
                </button>
              </>
            )}

            {phase === 'gameover' && (
              <button
                type="button"
                style={{
                  padding: '10px 18px',
                  fontSize: '0.9rem',
                  borderRadius: '10px',
                  border: '1px solid #d0e8fc',
                  background: '#fff',
                  color: '#0d47a1',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={onExit}
              >
                Cerrar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* GAMEBOARD PANEL */}
        <div style={{
          position: 'relative',
          width: '100%',
          maxWidth: '1512px',
          height: '620px',
          margin: '0 auto',
          background: boardBackground,
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: boardShadow,
          border: boardBorder,
          transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
        }}>
          
          {/* Neon Grid Overlay for Retro Arcade Look */}
          {usesDarkBoard && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
              pointerEvents: 'none',
            }} />
          )}

          {/* PLAYING GUI */}
          {phase === 'playing' && (
            <>
              {/* Header Hud */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '64px',
                background: 'rgba(15, 23, 42, 0.85)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                zIndex: 10,
                fontFamily: "'Inter', sans-serif",
              }}>
                {/* Left: Score & Level */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
                    🏆 <span style={{ color: '#60a5fa' }}>{score}</span> <span style={{ fontSize: '0.8rem', color: '#64748b' }}>pts</span>
                  </div>
                  <div style={{
                    background: 'rgba(96, 165, 250, 0.12)',
                    color: '#60a5fa',
                    borderRadius: '8px',
                    padding: '3px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}>
                    Level {level}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.45px',
                  }}>
                    {difficultyProfile.maxSimultaneous} simultáneas
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: '#cbd5e1',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}>
                    {wordsCompleted} completadas
                  </div>
                  {wordSource === 'random' && (
                    <div style={{
                      background: 'rgba(56, 189, 248, 0.14)',
                      color: '#7dd3fc',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}>
                      {vocabularyLevel}
                    </div>
                  )}
                </div>

                {/* Right: Lives & Exit */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', fontSize: '1.2rem' }}>
                    {[...Array(3)].map((_, i) => (
                      <span 
                        key={i} 
                        style={{ 
                          opacity: i < lives ? 1 : 0.22,
                          filter: i < lives ? 'none' : 'grayscale(100%)',
                          transition: 'opacity 0.3s ease',
                        }}
                      >
                        ❤️
                      </span>
                    ))}
                  </div>

                  <button 
                    onClick={endGame}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef5350'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                  >
                    ✕ Salir
                  </button>
                </div>
              </div>

              {/* Falling words container */}
              <div style={{ position: 'absolute', inset: '64px 0 0 0', width: '100%', height: 'calc(100% - 64px)' }}>
                {activeWords.map((w) => {
                  const hasProgress = w.progress > 0 && !w.isExploding;
                  const isInDanger = w.y >= 72 && !w.isExploding;
                  const dangerIntensity = isInDanger ? Math.min(1, (w.y - 72) / 20) : 0;
                  
                  return (
                    <div
                      key={w.id}
                      style={{
                        position: 'absolute',
                        left: `${w.x}%`,
                        top: `${w.y}%`,
                        transform: w.isExploding
                          ? 'translateX(-50%) scale(1.4) rotate(4deg)'
                          : isInDanger
                          ? `translateX(-50%) scale(${1 + dangerIntensity * 0.08}) translateX(${Math.sin(Date.now() / 80) * dangerIntensity * 3}px)`
                          : 'translateX(-50%) scale(1)',
                        opacity: w.isExploding ? 0 : 1,
                        background: w.isExploding
                          ? 'rgba(74, 222, 128, 0.25)'
                          : isInDanger
                          ? `rgba(${Math.round(127 + dangerIntensity * 128)}, ${Math.round(30 - dangerIntensity * 20)}, ${Math.round(30 - dangerIntensity * 20)}, ${0.7 + dangerIntensity * 0.25})`
                          : hasProgress
                          ? 'rgba(30, 41, 59, 0.9)'
                          : 'rgba(15, 23, 42, 0.72)',
                        border: w.isExploding
                          ? '2px solid #4ade80'
                          : isInDanger
                          ? `2px solid rgba(239, 68, 68, ${0.5 + dangerIntensity * 0.5})`
                          : hasProgress
                          ? '2px solid #38bdf8'
                          : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: w.isSentence ? '14px' : '10px',
                        padding: w.isSentence ? '10px 18px' : '7px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        boxShadow: isInDanger
                          ? `0 0 ${12 + dangerIntensity * 24}px rgba(239, 68, 68, ${0.3 + dangerIntensity * 0.5}), inset 0 0 ${dangerIntensity * 12}px rgba(239, 68, 68, ${dangerIntensity * 0.2})`
                          : hasProgress
                          ? '0 0 20px rgba(56, 189, 248, 0.35)'
                          : '0 4px 12px rgba(0,0,0,0.18)',
                        transition: 'opacity 0.25s, border-color 0.15s',
                        zIndex: hasProgress ? 5 : isInDanger ? 4 : 2,
                        animation: isInDanger && dangerIntensity > 0.6 ? 'wordDangerPulse 0.4s ease-in-out infinite alternate' : undefined,
                      }}
                    >
                      {/* Danger warning icon for near-bottom words */}
                      {isInDanger && dangerIntensity > 0.3 && (
                        <div style={{
                          position: 'absolute',
                          top: '-18px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '0.9rem',
                          opacity: 0.5 + dangerIntensity * 0.5,
                        }}>
                          ⚠️
                        </div>
                      )}

                      {/* English text with highlighting */}
                      <div style={{
                        fontFamily: "'Courier New', Courier, monospace",
                        fontSize: w.isSentence ? '1rem' : '1.15rem',
                        fontWeight: 800,
                        color: isInDanger ? '#fecaca' : '#fff',
                        letterSpacing: '1px',
                      }}>
                        {/* Highlighted correct typing progress */}
                        <span style={{ 
                          color: isInDanger ? '#fbbf24' : '#38bdf8', 
                          textShadow: isInDanger
                            ? '0 0 10px rgba(251, 191, 36, 0.8)'
                            : '0 0 10px rgba(56, 189, 248, 0.8)',
                        }}>
                          {w.word.substring(0, w.progress)}
                        </span>
                        {/* Remaining letters */}
                        <span style={{ opacity: isInDanger ? 1 : 0.88 }}>
                          {w.word.substring(w.progress)}
                        </span>
                      </div>

                      {/* Spanish Translation clue under */}
                      <div style={{
                        fontSize: '0.68rem',
                        color: isInDanger ? '#fca5a5' : hasProgress ? '#93c5fd' : '#64748b',
                        fontWeight: 600,
                        marginTop: '3px',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                      }}>
                        {w.translation}
                      </div>

                      {/* Locked marker dot */}
                      {hasProgress && !isInDanger && (
                        <div style={{
                          position: 'absolute',
                          top: '-5px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#38bdf8',
                          boxShadow: '0 0 8px #38bdf8',
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Laser Line danger indicator at bottom */}
              <div style={{
                position: 'absolute',
                bottom: '8%',
                left: 0,
                right: 0,
                height: '2.5px',
                background: 'linear-gradient(90deg, transparent 0%, #ef4444 30%, #ff6b6b 50%, #ef4444 70%, transparent 100%)',
                boxShadow: '0 0 18px #ef4444, 0 0 40px rgba(239,68,68,0.3)',
                opacity: 0.7,
                pointerEvents: 'none',
                animation: 'laserPulse 1.5s ease-in-out infinite alternate',
              }} />

              {/* Danger zone gradient above laser line */}
              <div style={{
                position: 'absolute',
                bottom: '8%',
                left: 0,
                right: 0,
                height: '28%',
                background: 'linear-gradient(to bottom, transparent 0%, rgba(239, 68, 68, 0.04) 60%, rgba(239, 68, 68, 0.08) 100%)',
                pointerEvents: 'none',
              }} />
            </>
          )}

          {/* IDLE SCREEN (Start Menu) */}
          {phase === 'idle' && (
            <TypingTutorStartPanel
              errorMessage={menuError}
              onSourceChange={(value) => {
                setWordSource(value);
                setMenuError(null);
              }}
              wordSource={wordSource}
            />
          )}

          {/* LOADING SCREEN */}
          {phase === 'loading' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#94a3b8',
            }}>
              <div className="spinner" style={{ marginBottom: '14px' }} />
              <p style={{ fontWeight: 600 }}>
                {wordSource === 'learned'
                  ? 'Cargando palabras aprendidas...'
                  : 'Cargando banco de palabras para dificultad automática...'}
              </p>
            </div>
          )}

          {/* GAMEOVER SCREEN */}
          {phase === 'gameover' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              height: '100%',
              width: '100%',
              textAlign: 'center',
              padding: '28px 28px 40px',
              zIndex: 5,
              position: 'relative',
              boxSizing: 'border-box',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarGutter: 'stable',
            }}>
              <div style={{ fontSize: '4.5rem', marginBottom: '12px' }}>💥</div>
              <h2 style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                color: '#ef4444',
                marginBottom: '8px',
                textShadow: '0 4px 16px rgba(239,68,68,0.25)',
              }}>
                Game Over
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '28px' }}>
                ¡Buen intento! Tu vocabulario va mejorando.
              </p>

              {/* Final Score Board */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '24px 48px',
                marginBottom: 36,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', marginBottom: '6px' }}>
                  Puntuación final
                </div>
                <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                  {score} <span style={{ fontSize: '1.2rem', color: '#64748b' }}>pts</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 700, marginTop: '10px' }}>
                  Llegaste al Nivel {level}
                </div>
              </div>

              <div style={{ width: '100%', maxWidth: '920px', marginBottom: 30 }}>
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #d7e9fb',
                  borderRadius: '20px',
                  padding: '18px 20px',
                  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
                  marginBottom: '16px',
                  textAlign: 'left',
                }}>
                  <div style={{ fontSize: '0.74rem', color: '#1565c0', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.8px', marginBottom: '8px' }}>
                    Mi ranking actual
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '1.95rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                      {rankingSummary?.latestResult ? `#${rankingSummary.latestResult.ranking}` : 'Guardando...'}
                    </span>
                    <span style={{ fontSize: '0.98rem', color: '#0f172a', fontWeight: 700 }}>
                      {score} pts
                    </span>
                    {rankingSummary?.totalResults ? (
                      <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                        {rankingSummary.totalResults} partidas registradas
                      </span>
                    ) : null}
                  </div>
                  {rankingSummary?.latestResult && (
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.86rem', color: '#0f172a', fontWeight: 700 }}>
                        {rankingSummary.latestResult.playerName}
                      </span>
                      {formatRankingDate(rankingSummary.latestResult.rankingDate) && (
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                          {formatRankingDate(rankingSummary.latestResult.rankingDate)}
                        </span>
                      )}
                    </div>
                  )}
                  {isSavingRanking && (
                    <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#64748b' }}>
                      Guardando resultado en `player_game_ranking_history`...
                    </div>
                  )}
                  {rankingError && (
                    <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>
                      {rankingError}
                    </div>
                  )}
                </div>

                <div style={{
                  background: '#ffffff',
                  border: '1px solid #d7e9fb',
                  borderRadius: '20px',
                  padding: '18px 20px',
                  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.08)',
                  textAlign: 'left',
                }}>
                  <div style={{ fontSize: '0.74rem', color: '#1565c0', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.8px', marginBottom: '14px' }}>
                    Top 5 mejores rankings
                  </div>
                  {rankingSummary?.topFive.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {rankingSummary.topFive.map((entry, index) => (
                        <div key={entry.entryId}>
                          {renderTopFiveRow(entry, index)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.86rem', color: '#64748b', lineHeight: 1.5 }}>
                      Aún no hay resultados registrados.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px' }}>
                <button
                  className="btn btn-primary"
                  style={{
                    padding: '14px 36px',
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                  }}
                  onClick={startGame}
                >
                  🎮 Jugar de nuevo
                </button>
                <button
                  style={{
                    padding: '14px 24px',
                    fontSize: '0.95rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                  onClick={resetToMenu}
                >
                  Volver al menú
                </button>
                <button
                  style={{
                    padding: '14px 24px',
                    fontSize: '0.95rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent',
                    color: '#94a3b8',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    e.currentTarget.style.color = '#ef5350';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                  onClick={onExit}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* CSS animations for danger effects */}
      <style>{`
        @keyframes wordDangerPulse {
          from {
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.4), inset 0 0 6px rgba(239, 68, 68, 0.1);
          }
          to {
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.7), inset 0 0 14px rgba(239, 68, 68, 0.25);
          }
        }
        @keyframes laserPulse {
          from { opacity: 0.5; }
          to { opacity: 0.85; }
        }
      `}</style>
    </>
  );
}
